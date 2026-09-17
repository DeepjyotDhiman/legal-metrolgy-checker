# TriNetra OCR & Vision Pipeline Guide

This guide details the computer vision, optical character recognition (OCR), and package declaration extraction architecture implemented in TriNetra.

---

## 1. Core Philosophy: OCR is an Extraction Mechanism, Not a Legal Authority

> [!IMPORTANT]
> OCR transcription and field extraction are purely perceptual mechanisms. Under no circumstances should raw OCR text or OCR confidence scores be treated as an autonomous legal conclusion.
>
> A low OCR confidence score indicates perceptual ambiguity (e.g. glare, curved label, or low contrast). It must instruct the system to mark a rule check for **`REVIEW` by a human officer**, rather than automatically triggering a penal violation (`FAIL`).

### Separation of Concerns: OCR Confidence vs. Compliance Confidence
| Metric | Source | Interpretation | System Consequence |
|---|---|---|---|
| **OCR Confidence** (`float 0.0 - 1.0`) | Vision model (PaddleOCR / Mock) | Probability that transcribed characters match physical pixels | If `< 0.65`, mark rule as `REVIEW` for human visual check. |
| **Compliance Confidence** (`float 0.0 - 1.0`) | Deterministic Rule Engine | Certainty that extracted text meets or violates statutory rules | Guides officer attention on borderline vs blatant non-compliance. |

---

## 2. Vision Pipeline Overview

```text
Uploaded Image (.jpg, .png, .webp)
         │
         ▼
[Image Validation] ──> Reject if > 15MB, wrong MIME, or corrupted
         │
         ▼
[Image Quality Scoring] ──> Compute sharpness & resolution score (0.0 - 1.0)
         │
         ▼
[BaseOCRService] (MockOCRService -> Future PaddleOCR)
         │
         ├── Detect text regions
         ├── Transcribe multilingual characters (English, Hindi, regional scripts)
         └── Calculate bounding boxes ({x, y, w, h})
         │
         ▼
[Declaration Isolation]
         │
         ├── "mrp" ──> "MRP Rs. 650.00 (Incl. of all taxes)" [bbox, conf: 0.96]
         ├── "net_quantity" ──> "5 kg" [bbox, conf: 0.95]
         ├── "manufacturer_name" ──> "Agro Foods Ltd" [bbox, conf: 0.93]
         └── ...
         │
         ▼
[RuleContext Construction] ──> Passed to Rule Engine
```

---

## 3. Image Validation & Quality Assessment

Implemented in `backend/app/services/image_service.py`:

1. **Extension & MIME Validation:**
   - Whitelist: `.jpg`, `.jpeg`, `.png`, `.webp`.
   - MIME Types: `image/jpeg`, `image/png`, `image/webp`.
2. **Byte Verification via Pillow:**
   - Files are opened and verified using `PILImage.verify()` to prevent file extension spoofing (e.g. an executable renamed to `.png`).
3. **Quality Score Calculation:**
   - Evaluates pixel dimensions (minimum threshold 200x200px) and grayscale pixel variance (proxy for image contrast and blur).
   - Produces a normalized score between `0.1` and `1.0`.

---

## 4. OCR Provider Interface (`BaseOCRService`)

All OCR implementations must conform to the abstract interface in `backend/app/services/base_ocr.py`:

```python
from abc import ABC, abstractmethod
from typing import List, Optional
from pathlib import Path

class BaseOCRService(ABC):
    @abstractmethod
    def process_images(
        self,
        image_paths: List[Path],
        source_image_ids: Optional[List[str]] = None,
    ) -> OCRPipelineResult:
        """Perform OCR and declaration field extraction on uploaded packaging images."""
        raise NotImplementedError
```

### Standard Output Dataclasses
- `OCRRawOutput`: Full raw transcribed text, overall confidence, and detected language.
- `ExtractedDeclarationOutput`:
  - `field_name`: Canonical key (`mrp`, `net_quantity`, `manufacturer_name`, `manufacturer_address`, `mfg_date`, `consumer_care`, `country_of_origin`).
  - `field_value`: String value extracted.
  - `confidence`: Confidence score (0.0 to 1.0).
  - `bounding_box`: Pixel coordinates `{"x": int, "y": int, "w": int, "h": int}`.
  - `source_image_id`: Foreign key link to the source `Image` record.

---

## 5. Mock OCR Service (`MockOCRService`)

Implemented in `backend/app/services/mock_ocr.py`:
- Used for rapid local development, automated testing, and CI pipelines without requiring multi-gigabyte neural network weight downloads.
- Supports configurable test modes:
  - `mode="compliant"`: Simulates a fully compliant Basmati rice package with complete mandatory declarations and bounding boxes.
  - `mode="missing_mrp_tax"`: Simulates an MRP declaration missing the statutory "inclusive of all taxes" clause.
  - `mode="non_compliant"`: Simulates an imported snack label with non-metric imperial units (`12 oz`) and missing declarations.

---

## 6. Integrating PaddleOCR (Planned Step for OM)

To integrate real multilingual PaddleOCR without altering existing endpoints:

### Step 1: Install PaddleOCR Dependencies
Add to `requirements.txt`:
```text
paddlepaddle>=2.6.0
paddleocr>=2.7.0
```

### Step 2: Implement `PaddleOCRService`
Create `backend/app/services/paddle_ocr.py`:
```python
from pathlib import Path
from typing import List, Optional
from paddleocr import PaddleOCR
from app.services.base_ocr import (
    BaseOCRService,
    OCRPipelineResult,
    OCRRawOutput,
    ExtractedDeclarationOutput,
)

class PaddleOCRService(BaseOCRService):
    def __init__(self, lang: str = "en"):
        self.ocr = PaddleOCR(use_angle_cls=True, lang=lang)

    def process_images(
        self,
        image_paths: List[Path],
        source_image_ids: Optional[List[str]] = None,
    ) -> OCRPipelineResult:
        # 1. Run self.ocr.ocr(str(img_path), cls=True)
        # 2. Extract bounding boxes and text lines
        # 3. Apply regex / pattern matching to isolate mandatory declarations
        # 4. Return OCRPipelineResult
        ...
```

### Step 3: Inject in `InspectionService`
Update `backend/app/services/inspection_service.py` to use `PaddleOCRService()` in production or when enabled via configuration flag.

---

## 7. Supported Languages

- **Current MVP:** English (`en`).
- **Planned:** Hindi (`hi`) and multilingual regional scripts (Tamil, Telugu, Bengali, Marathi) via PaddleOCR's multilingual models.

---

## 8. Failure Handling & Recovery

- **Corrupted Image Upload:** Rejected at upload time with `400 Bad Request`. File is purged from disk.
- **Empty / Blank Label:** If OCR extracts zero characters, `confidence` is set to `0.0`. Rules will flag missing mandatory declarations as `FAIL` or `REVIEW`.
- **Low Confidence Thresholds:** Any field extracted with `< 0.65` confidence automatically generates a `REVIEW` status, alerting the inspecting officer to verify the physical product.

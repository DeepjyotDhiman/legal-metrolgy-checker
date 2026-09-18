# TriNetra OCR & Vision Pipeline Guide

This guide details the computer vision, optical character recognition (OCR), and packaging declaration extraction architecture implemented in TriNetra by the **OM Team**.

---

## 1. Core Philosophy: OCR is an Extraction Mechanism, Not a Legal Authority

> [!IMPORTANT]
> OCR transcription and field extraction are purely perceptual mechanisms. Under no circumstances should raw OCR text or OCR confidence scores be treated as an autonomous legal conclusion.
>
> **"OCR output is an extraction result, not a legal determination."**
>
> A low OCR confidence score indicates perceptual ambiguity (e.g. glare, curved label, or low contrast). It must instruct downstream review to mark a rule check for **`REVIEW` by a human Legal Metrology Officer**, rather than automatically triggering a false legal violation (`FAIL`).

### Separation of Concerns: OCR Confidence vs. Compliance Confidence
| Metric | Source | Interpretation | System Consequence |
|---|---|---|---|
| **OCR Confidence** (`float 0.0 - 1.0`) | Vision model (PaddleOCR / Mock) | Probability that transcribed characters match physical pixels | If `< 0.65`, mark rule as `REVIEW` for human visual check. |
| **Compliance Confidence** (`float 0.0 - 1.0`) | Deterministic Rule Engine | Certainty that extracted text meets or violates statutory rules | Guides officer attention on borderline vs blatant non-compliance. |

---

## 2. Vision Pipeline Architecture

```text
Uploaded Packaging Image (.jpg, .png, .webp)
         │
         ▼
[Image Validation (ImageService)] ──> Reject if > 15MB, wrong MIME, or corrupted
         │
         ▼
[Image Quality Gate (ImageService)] ──> Check resolution & grayscale pixel variance (0.1 - 1.0)
         │
         ▼
[Image Preprocessing (ImageService)]
         ├── Correct EXIF orientation transpose
         ├── Aspect-ratio scaling (max dimension 2400px)
         └── Contrast enhancement & RGB normalization
         │
         ▼
[BaseOCRService Abstraction]
         ├── PaddleOCRService (Production / Active)
         └── MockOCRService (Deterministic fallback & unit tests)
         │
         ▼
[PaddleOCR Engine Inference]
         ├── Detect text region polygons [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
         ├── Transcribe text lines with confidence scores
         └── Convert polygons to normalized bounding boxes {"x", "y", "w", "h"}
         │
         ▼
[Declaration Extraction Engine]
         ├── "mrp" ──> "MRP Rs. 650.00 (Incl. of all taxes)" [bbox, conf: 0.96]
         ├── "net_quantity" ──> "5 kg" [bbox, conf: 0.95]
         ├── "manufacturer_name" ──> "Agro Foods Ltd" [bbox, conf: 0.93]
         ├── "manufacturer_address" ──> "Industrial Area, Karnal, Haryana" [bbox, conf: 0.91]
         ├── "mfg_date" ──> "03/2026" [bbox, conf: 0.94]
         ├── "consumer_care" ──> "1800-111-2222, care@agrofoods.in" [bbox, conf: 0.92]
         └── "country_of_origin" ──> "India" [bbox, conf: 0.97]
         │
         ▼
[RuleContext Construction] ──> Passed to Deterministic Legal Metrology Rule Engine
```

---

## 3. Image Preprocessing & Quality Assessment

Implemented in `backend/app/services/image_service.py`:

1. **Upload Validation:**
   - Whitelisted Extensions: `.jpg`, `.jpeg`, `.png`, `.webp`.
   - Whitelisted MIME Types: `image/jpeg`, `image/png`, `image/webp`.
   - Maximum File Size: `15MB` (configured via `settings.MAX_UPLOAD_SIZE_MB`).
   - Pillow verification (`PILImage.verify()`) to prevent extension spoofing.
2. **Quality Assessment Gate (`ImageService.assess_quality`):**
   - Evaluates pixel dimensions and grayscale pixel variance.
   - Images with quality score `< 0.20` or dimensions `< 100x100px` fail the quality gate.
   - Low-quality images produce a clear `LOW_QUALITY_WARNING` OCR output with low confidence, without causing runtime crashes.
3. **Modular Image Preprocessing (`ImageService.preprocess_image_for_ocr`):**
   - **EXIF Transpose:** Automatically rotates phone-camera photos based on EXIF tags.
   - **Resolution Normalization:** Resizes images exceeding 2400px on either side while strictly preserving aspect ratio.
   - **Contrast Enhancement:** Applies contrast scaling (1.2x factor) to improve character readability on reflective packaging labels.

---

## 4. OCR Provider Abstraction (`BaseOCRService`)

All OCR providers implement the standard abstract interface in `backend/app/services/base_ocr.py`:

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

### Standard Normalized Output Dataclasses
- `OCRRawOutput`: Consolidated raw transcribed text, overall line confidence average, and language tag.
- `ExtractedDeclarationOutput`:
  - `field_name`: Canonical key (`mrp`, `net_quantity`, `manufacturer_name`, `manufacturer_address`, `mfg_date`, `consumer_care`, `country_of_origin`).
  - `field_value`: Complete string declaration.
  - `confidence`: Perceptual recognition confidence (0.0 to 1.0).
  - `bounding_box`: Pixel rectangle `{"x": int, "y": int, "w": int, "h": int}`.
  - `source_image_id`: Foreign key UUID linking to the source `Image` database record.
- `OCRPipelineResult`: Contains `raw_output` and `extracted_fields`.

---

## 5. Bounding Box Normalization & Specification

PaddleOCR returns 4-point polygon coordinates `[[x1, y1], [x2, y2], [x3, y3], [x4, y4]]`.

TriNetra normalizes polygon coordinates into an axis-aligned bounding box rectangle:

```python
x = int(min(x1, x2, x3, x4))
y = int(min(y1, y2, y3, y4))
w = int(max(x1, x2, x3, x4) - min(x1, x2, x3, x4))
h = int(max(y1, y2, y3, y4) - min(y1, y2, y3, y4))
```

### Bounding Box Coordinate Specification
- **Origin:** Top-left corner `(0, 0)` of the source image.
- **Units:** Integer pixels.
- **Format:** JSON dictionary `{"x": int, "y": int, "w": int, "h": int}`.
- **Schema Compatibility:** Strictly matches the `ExtractedField.bounding_box` database column and Pydantic schemas.

---

## 6. Real PaddleOCR Implementation (`PaddleOCRService`)

Implemented in `backend/app/services/paddle_ocr.py`:

### Model Initialization & Lazy-Loading Strategy
- Model loading (`PaddleOCR(...)`) downloads weights on first use and requires significant initialization overhead.
- `PaddleOCRService` uses a class-level singleton model cache (`_model_cache`).
- Model instances are initialized lazily on the first request for a language and reused across requests.

### Supported Languages
- **English (`en`):** Default model for statutory packaging declarations.
- **Hindi (`hi`):** Supported via `PaddleOCRService(lang="hi")`.
- **Gujarati (`gu`):** Supported via `PaddleOCRService(lang="gu")`.
- Language code is configurable globally via `settings.OCR_DEFAULT_LANG` or per service instance.

---

## 7. Mock OCR Provider (`MockOCRService`)

Implemented in `backend/app/services/mock_ocr.py`:
- Preserved for unit tests, rapid offline development, and CI/CD environments without downloading neural network weight files.
- Modes:
  - `mode="compliant"`: Fully compliant package declarations.
  - `mode="missing_mrp_tax"`: MRP missing "inclusive of all taxes".
  - `mode="non_compliant"`: Non-metric units (`12 oz`) and missing declarations.

---

## 8. Provider Selection Strategy

Configured in `backend/app/core/config.py` via `OCR_PROVIDER`:

- `OCR_PROVIDER="auto"` (Default): Uses `PaddleOCRService` when dependencies are available, falling back smoothly to `MockOCRService`.
- `OCR_PROVIDER="paddleocr"`: Strictly enforces `PaddleOCRService`.
- `OCR_PROVIDER="mock"`: Strictly uses `MockOCRService`.

Endpoints communicate strictly through `BaseOCRService` or `InspectionService.run_analysis`, ensuring API handlers never import PaddleOCR directly.

---

## 9. Error Handling & Resource Safety

- **Missing/Corrupted Images:** Handled by `ImageService` quality check; returns controlled failure output.
- **Engine Initialization Error:** Caught and logged safely; system emits diagnostic logs without exposing credentials or stack traces.
- **Large Image Protection:** Oversized images are scaled down during preprocessing to prevent Out-Of-Memory (OOM) errors on CPU environments.

---

## 10. Testing

Run the OCR test suite:

```bash
pytest backend/tests/test_ocr.py -v
```

Unit tests use mocked underlying engine calls so tests run fast and deterministically without requiring live model weight downloads.

---

## 11. Adding Another OCR Provider

To add another provider (e.g. Tesseract, Google Vision API, EasyOCR):

1. Create `backend/app/services/new_ocr.py`.
2. Inherit from `BaseOCRService`.
3. Implement `process_images(image_paths: List[Path], source_image_ids: Optional[List[str]]) -> OCRPipelineResult`.
4. Export the new class in `backend/app/services/__init__.py`.
5. Update `InspectionService.get_default_ocr_service()` or pass `new_ocr_service` to `run_analysis()`.

---

## 12. Known Limitations & Production Guidelines

- **CPU Performance:** PaddleOCR inference on CPU takes ~1-3 seconds per packaging image depending on CPU speed.
- **Curved Labels & Glare:** Extreme glare or heavily distorted packaging labels reduce recognition confidence; system relies on human officer review for borderline cases.
- **Multilingual Models:** Hindi (`hi`) and Gujarati (`gu`) language models require model weight initialization.

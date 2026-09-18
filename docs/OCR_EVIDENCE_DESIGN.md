# TriNetra — OCR & Product Evidence Workstation Design Specification
**Subsystem:** OM (OCR, Image Processing & Evidence Review)  
**System:** TriNetra Legal Metrology Inspection Suite  
**Document Version:** 1.0.0  
**Target Environment:** Desktop Inspection Workstation & Mobile Field Inspector  

---

## 1. Executive Summary & Design Philosophy

The **OCR and Product-Evidence Subsystem** of TriNetra serves as the operational evidentiary foundation for Legal Metrology Officers. It bridges physical packaged goods with statutory compliance verification.

### 1.1 Non-Negotiable Core Principles
1. **Government Inspection Workstation, Not a Startup Demo:**
   - Designed for daily operational duty by enforcement officers.
   - Clean, dense, utilitarian, high-contrast, and evidence-first.
   - Zero "AI chatbot" aesthetics, zero floating conversational widgets, zero glowing neon gradients, zero decorative illustrations.
2. **Strict Architectural Separation of Concerns:**
   - **OM Subsystem Scope:** `IMAGE INGESTION` → `QUALITY GATING` → `OCR ANALYSIS` → `STATUTORY DECLARATION EXTRACTION` → `EVIDENCE LOCALIZATION`.
   - **Boundary:** The OM subsystem **NEVER** issues legal PASS/FAIL verdicts, legal fines, or compliance judgements. It records strictly:
     - What raw text was read (`RawTextLine`).
     - Where it is located on the package (normalized bounding box `[x, y, w, h]`).
     - How accurately the optical character recognition model read the characters (`OCR Confidence`).
     - Mapping to statutory field candidates (MRP, Net Qty, etc.).
   - Compliance rules (e.g., verifying if MRP includes taxes or if units are metric) belong exclusively to the downstream Rule Engine (`backend/app/rules/`).
3. **Evidence Verifiability:**
   - Every detected declaration must be traceable to the source image pixel coordinates.
   - Bidirectional interactive linking: clicking any extracted field or raw text line highlights the exact bounding box on the label, and vice versa.

---

## 2. Visual Style & Design Token Architecture

The workstation inherits TriNetra's established design tokens defined in `frontend/src/styles/variables.css`:

| Token | Value | Operational Purpose |
|:---|:---|:---|
| `--color-primary` | `#1a56db` | Primary action buttons, active tab indicators |
| `--color-primary-dark`| `#1e429f` | Pressed states, high-priority borders |
| `--color-surface` | `#ffffff` | Evidence cards, data tables, modal dialogs |
| `--color-bg` | `#f4f6fb` | Neutral background minimizing optical fatigue |
| `--color-border` | `#e5e7eb` | Restrained card boundaries and table grids |
| `--color-text` | `#111827` | High-contrast charcoal text for legibility |
| `--color-text-muted`| `#6b7280` | Metadata labels, secondary coordinates |
| `--color-warning` | `#c27803` | Low quality warnings (42% quality score), review flags |
| `--color-danger` | `#e02424` | Image rejected, OCR processing error |
| `--color-accent` | `#0e9f6e` | High OCR confidence indicator (>90%), acceptable quality |

### Typography & Spacing
- **Font Stack:** `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Monospace Stack (Coordinates & Confidences):** `'JetBrains Mono', 'Fira Code', 'Courier New', monospace`
- **Density:** Compact padding (`--space-2` to `--space-4`) allowing officers to inspect multi-field tables without unnecessary scrolling.

---

## 3. Detailed Screen Specifications

```
                           WORKFLOW PIPELINE
                                   │
┌──────────────────────────────────▼──────────────────────────────────┐
│ SCREEN 1: Product Image Upload (File / Camera / Validation)         │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────────┐
│ SCREEN 2: Image Review & Quality Gate (Zoom, Rotate, Metadata)      │
│           (SCREEN 7: Low Quality Warning Intercept if < 50%)        │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────────┐
│ SCREEN 3: OCR Technical Pipeline (Deterministic 6-Stage Progress)   │
│           (SCREEN 8: OCR Error Intercept if Corrupt / Engine Fault) │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────────┐
│ SCREEN 4 & 5: Core Workstation                                      │
│  - Multi-Image Rail (SCREEN 9: Front / Back / Side Tabs)            │
│  - 3-Pane OCR Evidence Viewer (Image + Canvas Boxes + Text Lines)   │
│  - Extracted Statutory Declarations Table (7 Mandatory Fields)      │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────────┐
│ SCREEN 6: Field Evidence Detail Modal (Zoomed Crop & Traceability)  │
└─────────────────────────────────────────────────────────────────────┘
```

---

### SCREEN 1 — PRODUCT IMAGE UPLOAD
- **Header:** "New Inspection — Evidence Ingestion"
- **Primary Upload Zone:** Drag-and-drop container with subtle dashed border (`#cbd5e1`).
  - Headline: **"Upload Product Label"**
  - Subtitle: *"Upload a clear image of the packaged commodity label for inspection."*
  - Dual Action Triggers:
    1. `Browse Files` (Standard system file picker, accepts `.jpg`, `.jpeg`, `.png`, `.webp`)
    2. `Use Camera` (Mobile/tablet capture or desktop webcam feed)
- **Technical Specifications Display:** Formats: JPG, PNG, WEBP • Max File Size: 15 MB • Min Resolution: 100×100 px.
- **Uploaded Image Queue:**
  - Thumbnail preview (80×80px, aspect-ratio preserved).
  - Filename & storage size (e.g., `basmati_front_label.jpg` — 2.4 MB).
  - Pixel dimensions (e.g., `2400 × 1800 px`).
  - Pre-flight validation status badge (`Ready for Inspection` or `Format Error`).
  - Direct `Remove` button (`Trash` icon).
- **Validation Error Presentation:** Unambiguous technical warning (e.g., *"Image resolution (80×60) is too low for reliable OCR. Minimum 100×100 required."*).

---

### SCREEN 2 — IMAGE REVIEW & QUALITY GATING
- **Primary Viewport:** Full canvas viewer with high-resolution image rendering.
- **Officer Inspection Toolbar:**
  - `Zoom In (+)` / `Zoom Out (-)` (25% increments from 50% to 400%).
  - `Fit to Screen` (Resets zoom to container bounds).
  - `Reset (1:1)` (Restores 100% native pixel scale).
  - `Rotate 90° CW` (Corrects orientation before OCR execution).
- **Evidentiary Metadata Bar:**
  - `Image ID:` `IMG-20250918-0042`
  - `Native Resolution:` `2400 × 1800 px`
  - `Format:` `image/jpeg (24-bit RGB)`
  - `Quality Score Badge:`
    - **Acceptable:** `95% — Acceptable for OCR` (Green pill, checkmark).
    - **Sub-optimal:** `42% — Review Image Quality` (Amber pill, warning icon).

---

### SCREEN 3 — OCR ANALYSIS (PIPELINE STATE)
- **Headline:** "Analyzing Product Label"
- **Technical Pipeline Stage Indicator:**
  Rather than an ambiguous spinning wheel or fake "AI thinking" pulse, the screen displays the actual sequential stages of the OCR execution pipeline:
  1. `Image Validation` — Verifying header, MIME integrity, and color space (Completed)
  2. `Image Preprocessing` — EXIF auto-rotation, contrast normalization, resolution scaling (Completed)
  3. `Text Detection` — Running DBNet / PP-OCRv5 detection for text polygonal boundaries (Active)
  4. `Text Recognition` — Character recognition across English and Devanagari models (Pending)
  5. `Declaration Extraction` — Regex pattern mapping for statutory Legal Metrology rules (Pending)
  6. `Compliance Preparation` — Packaging normalized bounding boxes for audit log (Pending)
- **Completion Summary Card:**
  - Status: `OCR Analysis Complete`
  - Metrics: `12 text lines detected` • `98.0% average OCR confidence` • `Quality Score: 95%` • `Execution time: 1.42s`.

---

### SCREEN 4 — OCR EVIDENCE VIEWER (CORE THREE-AREA WORKSTATION)
The central evidence workspace is partitioned into three coordinated panes:
1. **Left / Center (Image & SVG Bounding Overlay Canvas):**
   - High-fidelity package label rendered on an HTML5 / SVG viewport.
   - Bounding boxes are drawn directly at scaled coordinates:
     - Neutral Box: 1.5px solid `#1a56db` with 10% fill.
     - Selected / Active Box: 2.5px solid `#0e9f6e` with 25% fill and coordinate pin.
   - Interactive Hover & Click on canvas boxes triggers synchronized highlighting in the text list.
2. **Right (Detected Raw Text Line Stream):**
   - Scrollable, dense inventory of every recognized text segment.
   - Card Items show:
     - Raw Text: e.g., `"MRP: Rs. 249.00 (inclusive of all taxes)"`
     - OCR Confidence Badge: `97.5%` (Color-coded: ≥90% Green, 70-89% Blue, <70% Amber)
     - Bounding Box Coordinates: `[X: 48, Y: 141, W: 526, H: 22]`
   - Clicking a text item automatically scrolls the canvas to center and highlight the corresponding bounding box.

---

### SCREEN 5 — EXTRACTED STATUTORY DECLARATIONS TABLE
- **Headline:** "Extracted Declarations"
- **Subtitle:** *"Mandatory fields detected under Legal Metrology (Packaged Commodities) Rules, 2011"*
- **Table Columns:**
  1. `Statutory Declaration` (Field name)
  2. `Extracted Value` (Exact OCR text)
  3. `OCR Confidence` (Recognition accuracy percentage)
  4. `Evidence Localization` (View Evidence trigger link)
  5. `Status` (`Detected` / `Low Confidence` / `Not Detected`)
- **The 7 Mandatory Fields:**
  | Declaration | Realistic Sample Value | OCR Conf. | Evidence | Status |
  |:---|:---|:---:|:---:|:---:|
  | **Maximum Retail Price (MRP)** | ₹249.00 (inclusive of all taxes) | 97.5% | [View Box] | Detected |
  | **Net Quantity** | 5 kg | 95.8% | [View Box] | Detected |
  | **Manufacturer Name** | Agro Foods India Pvt Ltd | 98.3% | [View Box] | Detected |
  | **Manufacturer Address** | Plot 42, Industrial Area, Phase II, New Delhi 110020 | 99.4% | [View Box] | Detected |
  | **Date of Manufacture** | 01/2025 | 98.8% | [View Box] | Detected |
  | **Consumer Care Details** | care@agrofoods.com / 1800-11-2233 | 99.0% | [View Box] | Detected |
  | **Country of Origin** | India | 99.7% | [View Box] | Detected |
- **Critical Field States:**
  - If field is missing on label: Displays italicized gray `Not detected` with an amber dash.
  - If OCR confidence is < 70%: Displays `Low confidence — Review required` flag.
  - *Strict Rule:* Never labeled as "Compliance Confidence" — strictly termed **OCR Confidence**.

---

### SCREEN 6 — FIELD EVIDENCE DETAIL (INSPECTION MODAL / DRAWER)
When an officer clicks `View Evidence` on any statutory declaration:
- **Header:** `Evidence Traceability — [Field Name]` (e.g., `Evidence Traceability — Maximum Retail Price`)
- **Content Blocks:**
  1. `Extracted Text:` Large high-contrast display with copy shortcut.
  2. `OCR Recognition Quality:` Explicit percentage (e.g., `97.5%`) with explanation: *"Evaluates optical character clarity; does not represent statutory compliance."*
  3. `Source Origin:` `Product Label — Image 1 (Front View)`
  4. `Label Geometry:` `X: 48px, Y: 141px, Width: 526px, Height: 22px`
  5. **High-Resolution Cropped Evidence Window:**
     - Displays the isolated snippet cropped from the high-res original packaging image.
     - Officer can inspect letter sharpness, ink bleeding, or tampering without distraction.
- **Operational Action Buttons:**
  - `View on Full Label` (Closes modal and scrolls primary canvas to box).
  - `Mark for Officer Review` (Adds an evidentiary flag to the inspection dossier).

---

### SCREEN 7 — LOW QUALITY IMAGE WARNING INTERCEPT
- **State Trigger:** `ImageService.assess_quality()` calculates quality score < 0.50 (e.g., 42%).
- **Visual Presentation:** Restrained amber warning box (`#fffbeb` background, `#b45309` text, `#fde68a` border).
- **Banner Message:** **"Image quality may affect OCR accuracy"**
- **Specific Detected Deficiencies:**
  - • Resolution below recommended density (Native: 320×240 px, Recommended ≥ 1200 px).
  - • Optical blur detected (Laplacian variance: 38.4, Threshold: 100.0).
  - • Glare / uneven illumination detected across statutory text region.
- **Officer Decision Actions:**
  1. `Upload Better Image` (Primary button, prompts camera recapture or new upload).
  2. `Continue Anyway` (Secondary ghost button, logs audit warning and proceeds to OCR).

---

### SCREEN 8 — OCR TECHNICAL ERROR RECOVERY
- **State Trigger:** Corrupted JPEG stream, unhandled image decoding error, or memory exhaustion.
- **Presentation:** High-contrast neutral slate alert. Zero stack traces or Python tracebacks.
- **Headline:** **"OCR Analysis Could Not Be Completed"**
- **Officer Explanation:** *"The uploaded file could not be parsed by the image processing engine. This can occur if the file is corrupted, truncated during upload, or uses an unsupported compression scheme."*
- **Action Buttons:**
  1. `Retry Analysis` (Attempts re-execution with fallback pre-processing).
  2. `Upload Another Image` (Returns to upload dropzone).

---

### SCREEN 9 — MULTIPLE PACKAGE IMAGES (MULTI-FACET LABELS)
Commodity packaging spans multiple panels (e.g., Front Brand Facet, Back Statutory Declaration Panel, Side Nutrition Panel).
- **Thumbnail Rail / Panel Tabs:**
  - `Facet 1: Front Label` (Thumbnail, Quality 95%, OCR Complete, 3 Fields).
  - `Facet 2: Back Declaration Panel` (Thumbnail, Quality 92%, OCR Complete, 4 Fields).
  - `Facet 3: Side Panel` (Thumbnail, Quality 88%, OCR Complete, 1 Field).
- **Officer Interactivity:** Clicking any facet tab swaps the active image in the 3-pane viewer, displaying the bounding boxes and text lines specific to that panel.

---

## 4. Mobile Field Inspection Workstation

For officers inspecting commodities in retail stores, distribution warehouses, or border checkpoints using handheld devices (Android / iOS / Ruggedized Tablets):
1. **Vertical Responsive Stack:**
   - 3-area layout collapses from side-by-side columns into a prioritized vertical flow:
     `Camera Capture` → `Image Review & Zoom` → `1-Tap Analyze` → `Extracted Declarations Cards`.
2. **Touch-Optimized Controls:**
   - Large 48px minimum touch targets for all zoom, crop, and inspect buttons.
   - Double-tap to zoom to 200% on package label.
3. **Card-Based Declaration Layout:**
   - Table collapses into high-readability cards on viewports < 768px.
   - Large text fields and high-contrast confidence chips.

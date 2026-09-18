# TriNetra Deterministic Rule Engine

This document details the deterministic, versioned Legal Metrology rule engine used by TriNetra.

---

## 1. Core Philosophy: Determinism Over Generative AI

> [!IMPORTANT]
> Large Language Models (LLMs) are **NOT** permitted to serve as the legal authority for compliance determinations in TriNetra.
>
> In regulatory and statutory enforcement, legal compliance decisions must be:
> 1. **Deterministic:** Identical inputs must always produce identical verdicts.
> 2. **Transparent & Explainable:** Every finding must cite the exact statutory clause and highlight the verbatim label evidence.
> 3. **Auditable:** Rules must carry explicit version numbers and effective date windows corresponding to official government gazette notifications.
> 4. **Assistive:** The final legal penalty or clearance is strictly reserved for a human Legal Metrology Officer.

---

## 2. Rule Engine Architecture

```text
               Extracted Declarations & Confidence
                               │
                               ▼
               +-------------------------------+
               |          RuleContext          |
               +-------------------------------+
                               │
                               v
               +-------------------------------+
               |         RuleRegistry          |
               +-------------------------------+
                │             │               │
                ▼             ▼               ▼
         +------------+ +------------+ +------------+
         |  MRPRule   | | NetQtyRule | |  MfgRule   | ... (Active Rules)
         +------------+ +------------+ +------------+
                │             │               │
                └─────────────┬───────────────┘
                              ▼
               List[RuleEvaluationResult]
               - rule_code
               - status (PASS / FAIL / REVIEW / NOT_APPLICABLE)
               - severity (HIGH / MEDIUM / LOW)
               - explanation
               - evidence payload
```

---

## 3. Interfaces & Data Structures

### 3.1 `BaseRule` (`backend/app/rules/base.py`)
```python
class BaseRule(ABC):
    rule_code: str
    name: str
    description: str
    legal_reference: str
    version: str = "2011.1"
    effective_from: datetime
    effective_to: Optional[datetime] = None
    active: bool = True
    default_severity: SeverityLevel = SeverityLevel.HIGH

    @abstractmethod
    def evaluate(self, context: RuleContext) -> RuleEvaluationResult:
        """Deterministically evaluate package declarations against the rule."""
        raise NotImplementedError
```

### 3.2 `RuleContext`
- `product_category`: String category (e.g. "Food & Beverages", "Cosmetics").
- `extracted_fields`: Key-value dictionary of isolated declarations (`mrp`, `net_quantity`, etc.).
- `field_confidences`: Dictionary of OCR/extraction confidence scores.
- `field_bounding_boxes`: Dictionary of image bounding box coordinates.
- `raw_text`: Complete transcribed label text.

### 3.3 `RuleEvaluationResult`
- `rule_code`: Identifier (e.g. `LMPC-R06-MRP`).
- `status`: One of `PASS`, `FAIL`, `REVIEW`, `NOT_APPLICABLE`.
- `severity`: One of `HIGH`, `MEDIUM`, `LOW`, `INFO`.
- `confidence`: Confidence of evaluation (0.0 to 1.0).
- `explanation`: Plain-language justification of verdict.
- `evidence`: JSON object containing matched substrings, found values, and boolean flags.

---

## 4. Implemented Legal Metrology Rules

The current MVP implements six statutory checks based on Rule 6(1) of the **Legal Metrology (Packaged Commodities) Rules, 2011**:

| Rule Code | Rule Title | Field Checked | Statutory Citation | Evaluation Logic & Outcomes |
|---|---|---|---|---|
| `LMPC-R06-MRP` | Maximum Retail Price | `mrp` | Rule 6(1)(e) | **PASS:** Declares "MRP", currency amount (₹/Rs./INR), and "inclusive of all taxes".<br>**FAIL:** Missing tax clause or no price declared.<br>**REVIEW:** Borderline OCR confidence (< 0.65) or ambiguous format. |
| `LMPC-R06-NETQTY` | Net Quantity Declaration | `net_quantity` | Rule 6(1)(d) | **PASS:** Quantity declared with metric units (g, kg, ml, l, m, N, units). Supports both `500 g` and `500ml` (no-space).<br>**FAIL:** Non-metric imperial units alone (e.g. `12 oz`) or no quantity.<br>**REVIEW:** OCR confidence < 0.65. |
| `LMPC-R06-MFG` | Manufacturer Name & Address | `manufacturer_name`, `manufacturer_address` | Rule 6(1)(a) | **PASS:** Name of manufacturer/packer and address with PIN code detected.<br>**REVIEW:** Name detected but address/PIN requires visual check; or low confidence.<br>**FAIL:** No manufacturer/packer declaration found. |
| `LMPC-R06-DATE` | Month & Year of Mfg/Packing | `mfg_date` | Rule 6(1)(c) | **PASS:** Month and year detected with "Mfg", "Pkd", "DOM", or "Best before" qualifier. Supports `/`, `-`, `.` separators and full month names.<br>**REVIEW:** Date numbers found without qualifier, or low confidence.<br>**FAIL:** No manufacturing or packing date found. |
| `LMPC-R06-CARE` | Consumer Care Details | `consumer_care` | Rule 6(1)(f) | **PASS:** Helpline telephone (toll-free/mobile) or email address detected with consumer care keyword.<br>**REVIEW:** Phone/email found without explicit grievance tag.<br>**FAIL:** No consumer contact coordinates found. |
| `LMPC-R06-ORIGIN` | Country of Origin | `country_of_origin` | Rule 6(1)(g) | **PASS:** Explicit statement of country (e.g. "Country of Origin: India", "Made in India", "Assembled in India").<br>**REVIEW:** Low OCR confidence on detected field.<br>**FAIL:** No country of origin statement detected. |

---

## 5. Rule Detail Reference

### 5.1 `LMPC-R06-MRP` — Maximum Retail Price

**Statutory Citation:** Rule 6(1)(e), Legal Metrology (Packaged Commodities) Rules, 2011

**Inputs:**
- `extracted_fields["mrp"]`: Isolated MRP field value from OCR
- `field_confidences["mrp"]`: OCR confidence (0.0–1.0)
- `raw_text`: Full label transcription (fallback search)

**Outputs (Evidence):**
- `has_mrp_label` (bool): MRP / Maximum Retail Price label detected
- `has_tax_inclusive` (bool): "inclusive of all taxes" clause detected
- `has_currency_amount` (bool): Currency amount (₹/Rs./INR + digits) detected
- `price_found` (str|null): The actual price string matched (e.g., "₹ 199.00")
- `field_confidence` (float): OCR confidence used for decision

**Logic:**
```
confidence > 0 AND < 0.65           → REVIEW  (low OCR, cannot confirm)
MRP label + tax clause + amount     → PASS
MRP label + amount, no tax clause   → FAIL    (missing mandatory clause)
No MRP label, no amount             → FAIL    (missing mandatory declaration)
Else (partial indicators)           → REVIEW  (ambiguous formatting)
```

**Limitations:**
- Does not validate that the declared price matches any database of registered MRPs (requires external data).
- The "inclusive of all taxes" check is text-based; stylistic abbreviations (e.g., "Incl. all taxes") are accepted as compliant.

**Examples:**
- ✅ `MRP ₹ 199.00 Inclusive of all taxes` → PASS
- ❌ `MRP Rs. 199.00` (no tax clause) → FAIL
- ⚠️ `MRP Rs. 199.00` with confidence 0.50 → REVIEW

---

### 5.2 `LMPC-R06-NETQTY` — Net Quantity Declaration

**Statutory Citation:** Rule 6(1)(d), Legal Metrology (Packaged Commodities) Rules, 2011

**Inputs:**
- `extracted_fields["net_quantity"]`: Isolated net quantity field
- `field_confidences["net_quantity"]`: OCR confidence
- `raw_text`: Full label transcription

**Outputs (Evidence):**
- `metric_match` (str|null): Matched metric quantity string (e.g., "500ml", "1.5 kg")
- `imperial_match` (str|null): Matched imperial quantity string if found
- `has_net_qty_label` (bool): "Net Wt." / "Net Qty" label detected
- `field_confidence` (float)

**Supported Metric Units:** g, kg, mg, ml, l, ltr, lt, cm, mm, m, pieces, pcs, units

**Logic:**
```
confidence > 0 AND < 0.65           → REVIEW
metric_match found                  → PASS
imperial_match AND NOT metric_match → FAIL
No match                            → FAIL
```

**Limitations:**
- Does not validate the numeric magnitude of declared quantity against the actual product.
- Dual declarations (e.g., "500g / 17.6 oz") → PASS because the metric unit is present.

**Examples:**
- ✅ `500g` or `500 g` → PASS
- ✅ `1.5 kg` → PASS
- ❌ `16 oz` (imperial only) → FAIL
- ⚠️ `250 g` with confidence 0.55 → REVIEW

---

### 5.3 `LMPC-R06-MFG` — Manufacturer/Packer Name & Address

**Statutory Citation:** Rule 6(1)(a), Legal Metrology (Packaged Commodities) Rules, 2011

**Inputs:**
- `extracted_fields["manufacturer_name"]`: Manufacturer name
- `extracted_fields["manufacturer_address"]`: Manufacturer address
- `field_confidences["manufacturer_name"]`, `["manufacturer_address"]`
- `raw_text`

**Outputs (Evidence):**
- `declared_name` (str): Extracted or "(Not isolated)"
- `declared_address` (str): Extracted or "(Not isolated)"
- `has_mfg_keyword` (bool): Keyword like "Mfg. by", "Packed by", "Imported by" detected
- `has_pincode` (bool): 6-digit Indian PIN code detected
- `field_confidence` (float)

**Logic:**
```
confidence > 0 AND < 0.65                         → REVIEW (low OCR)
(name OR keyword) AND (address OR pincode)        → PASS
name OR keyword (address/PIN absent)              → REVIEW
Neither name nor keyword                          → FAIL
```

**Limitations:**
- PIN code detection is a heuristic proxy; does not validate the PIN against India Post data.
- Cannot distinguish manufacturer from packer address when both appear on the same label without spatial analysis.

**Examples:**
- ✅ `Mfg. by XYZ Foods Pvt Ltd, Sector 5, Gurugram 122001` → PASS
- ⚠️ `XYZ Foods Pvt Ltd` (no address) → REVIEW
- ❌ (No manufacturer mention) → FAIL

---

### 5.4 `LMPC-R06-DATE` — Month & Year of Manufacture/Packing

**Statutory Citation:** Rule 6(1)(c), Legal Metrology (Packaged Commodities) Rules, 2011

**Inputs:**
- `extracted_fields["mfg_date"]`: Isolated date field
- `field_confidences["mfg_date"]`
- `raw_text`

**Outputs (Evidence):**
- `date_match` (str|null): Matched date string (e.g., "04/2026", "Jan-2026")
- `has_date_keyword` (bool): Qualifying keyword detected (Mfg., Pkd., DOM, Best Before, etc.)
- `field_confidence` (float)

**Supported Date Formats:** `MM/YYYY`, `MM-YYYY`, `MM.YYYY`, `MM/YY`, `Jan 2026`, `January-2026`, `Mar. 2025`

**Logic:**
```
confidence > 0 AND < 0.65      → REVIEW (low OCR)
date_match AND keyword          → PASS
date_match AND NOT keyword      → REVIEW (date present but qualification unclear)
No date found                   → FAIL
```

**Limitations:**
- Does not validate that the declared manufacturing date is logically before the current date.
- Does not implement the short-shelf-life (< 3 months) day-level date requirement — flagged for verification.
- Best-before date is accepted as a proxy for manufacturing date qualifier, which may not always be legally equivalent.

**Examples:**
- ✅ `Mfg Date: 04/2026` → PASS
- ✅ `Pkd: Jan-2026` → PASS
- ⚠️ `04/2026` (no keyword) → REVIEW
- ❌ (No date) → FAIL

---

### 5.5 `LMPC-R06-CARE` — Consumer Care Details

**Statutory Citation:** Rule 6(1)(f), Legal Metrology (Packaged Commodities) Rules, 2011

**Inputs:**
- `extracted_fields["consumer_care"]`: Isolated consumer care field
- `field_confidences["consumer_care"]`
- `raw_text`

**Outputs (Evidence):**
- `has_care_keyword` (bool): "Consumer Care", "Helpline", "Feedback", etc. detected
- `has_email` (bool): Valid email pattern detected
- `has_phone` (bool): Indian mobile or toll-free number detected
- `field_confidence` (float)

**Logic:**
```
(keyword OR care_field) AND (email OR phone)    → PASS
email OR phone (without keyword)               → REVIEW
Neither email nor phone                        → FAIL
```

**Limitations:**
- The exact legal requirement regarding whether both telephone AND email are needed, or either/or, requires statutory verification. Current implementation accepts either.
- Phone detection targets Indian mobile numbers (starting 6–9) and toll-free (1800-xxx-xxxx). International numbers may not be detected.

**Examples:**
- ✅ `Consumer Care: care@brand.in | 1800-112-233` → PASS
- ⚠️ `info@brand.com` (no keyword) → REVIEW
- ❌ (No contact details) → FAIL

---

### 5.6 `LMPC-R06-ORIGIN` — Country of Origin

**Statutory Citation:** Rule 6(1)(g), Legal Metrology (Packaged Commodities) Rules, 2011

**Inputs:**
- `extracted_fields["country_of_origin"]`: Isolated origin field
- `field_confidences["country_of_origin"]`
- `raw_text`

**Outputs (Evidence):**
- `origin_match` (str|null): Full matched phrase (e.g., "Country of Origin: India")
- `country_detected` (str|null): Extracted country name only (e.g., "India")
- `field_confidence` (float)

**Supported Declarations:** "Country of Origin: X", "Made in X", "Product of X", "Produced in X", "Manufactured in X", "Assembled in X", "Country of Manufacture: X"

**Logic:**
```
confidence > 0 AND < 0.65    → REVIEW (low OCR)
origin_match OR valid field  → PASS (country name extracted)
No origin detected           → FAIL
```

**Limitations:**
- Country name validation is length-based (>= 3 characters); does not validate against a list of recognised countries.
- No distinction between product origin vs. packing origin when both appear.

**Examples:**
- ✅ `Country of Origin: India` → PASS
- ✅ `Made in India` → PASS
- ⚠️ `India` (isolated field with confidence 0.45) → REVIEW
- ❌ (No origin declaration) → FAIL

---

## 6. Developer Guide: Adding a New Rule

Team members (specifically **Mohit** for rules ownership) should follow these steps:

### Step 1: Create the Rule Module
Create `backend/app/rules/definitions/my_new_rule.py`:
```python
from datetime import datetime, timezone
from app.models.enums import ComplianceStatus, SeverityLevel
from app.rules.base import BaseRule, RuleContext, RuleEvaluationResult

class MyNewRule(BaseRule):
    rule_code = "LMPC-RXX-CUSTOM"
    name = "Custom Declaration Check"
    description = "Mandatory declaration under Rule XX."
    legal_reference = "Rule XX, Legal Metrology (Packaged Commodities) Rules, 2011"
    version = "2011.1"
    effective_from = datetime(2011, 4, 1, tzinfo=timezone.utc)
    default_severity = SeverityLevel.HIGH

    def evaluate(self, context: RuleContext) -> RuleEvaluationResult:
        field_val = context.get_field("custom_field")
        # Deterministic verification logic here
        if field_val:
            return RuleEvaluationResult(
                rule_code=self.rule_code,
                status=ComplianceStatus.PASS,
                severity=self.default_severity,
                confidence=1.0,
                explanation="Valid declaration detected.",
                evidence={"found": field_val},
            )
        return RuleEvaluationResult(
            rule_code=self.rule_code,
            status=ComplianceStatus.FAIL,
            severity=self.default_severity,
            confidence=0.9,
            explanation="Mandatory declaration missing.",
            evidence={},
        )
```

### Step 2: Register the Rule
Add the rule instance to `ALL_RULES` in `backend/app/rules/definitions/__init__.py`:
```python
from app.rules.definitions.my_new_rule import MyNewRule

ALL_RULES = [
    ...,
    MyNewRule(),
]
```

### Step 3: Add Unit Tests
Add test cases in `backend/tests/test_rules.py` testing both `PASS`, `FAIL`, and `REVIEW` conditions.
Include at minimum: valid evidence, missing evidence, low-confidence evidence, and malformed evidence.

---

## 7. Statutory Disclaimer & Verification Requirement

> [!WARNING]
> The current rules in this repository represent an **MVP model** designed for hackathon demonstration.
> Prior to deployment in any official enforcement, prosecutorial, or commercial context, all rule logic must be reviewed, updated, and validated against the latest official Legal Metrology (Packaged Commodities) Amendment Rules published in the Gazette of India.

### Items Flagged for Legal Verification Before Production Deployment

| Item | Description |
|------|-------------|
| Rule 6(1)(f) — Consumer Care | Whether the rule requires **both** telephone and email, or **either** is acceptable |
| Rule 6(1)(c) — Short Shelf Life | Day-level date requirement for commodities with shelf life < 3 months not implemented |
| Rule 6(1)(d) — Count Units | Whether "pieces" / "pcs" are universally accepted for all commodity categories |
| Rule 6(1)(g) — Origin Scope | Whether the country of origin requirement applies to all categories without exception in the current gazette |

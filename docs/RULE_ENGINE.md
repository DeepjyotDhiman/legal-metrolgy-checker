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
| `LMPC-R06-NETQTY` | Net Quantity Declaration | `net_quantity` | Rule 6(1)(d) | **PASS:** Quantity declared with metric units (g, kg, ml, l, m, N, units).<br>**FAIL:** Non-metric imperial units alone (e.g. `12 oz`) or no quantity.<br>**REVIEW:** OCR confidence < 0.65. |
| `LMPC-R06-MFG` | Manufacturer Name & Address | `manufacturer_name`, `manufacturer_address` | Rule 6(1)(a) | **PASS:** Name of manufacturer/packer and address with PIN code detected.<br>**REVIEW:** Name detected but address/PIN requires visual check.<br>**FAIL:** No manufacturer/packer declaration found. |
| `LMPC-R06-DATE` | Month & Year of Mfg/Packing | `mfg_date` | Rule 6(1)(c) | **PASS:** Month and year detected with "Mfg", "Pkd", or "Best before" qualifier.<br>**REVIEW:** Date numbers found without qualifier.<br>**FAIL:** No manufacturing or packing date found. |
| `LMPC-R06-CARE` | Consumer Care Details | `consumer_care` | Rule 6(1)(f) | **PASS:** Helpline telephone (toll-free/mobile) or email address detected.<br>**REVIEW:** Phone/email found without explicit grievance tag.<br>**FAIL:** No consumer contact coordinates found. |
| `LMPC-R06-ORIGIN` | Country of Origin | `country_of_origin` | Rule 6(1)(g) | **PASS:** Explicit statement of country (e.g. "Country of Origin: India", "Made in India").<br>**FAIL:** No country of origin statement detected. |

---

## 5. Developer Guide: Adding a New Rule

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
Add test cases in `backend/tests/test_rules.py` testing both `PASS` and `FAIL` conditions.

---

## 6. Statutory Disclaimer & Verification Requirement

> [!WARNING]
> The current rules in this repository represent an **MVP model** designed for hackathon demonstration.
> Prior to deployment in any official enforcement, prosecutorial, or commercial context, all rule logic must be reviewed, updated, and validated against the latest official Legal Metrology (Packaged Commodities) Amendment Rules published in the Gazette of India.

import re
from datetime import datetime, timezone
from app.models.enums import ComplianceStatus, SeverityLevel
from app.rules.base import BaseRule, RuleContext, RuleEvaluationResult


class MRPRule(BaseRule):
    """Rule 6(1)(e): Maximum Retail Price (MRP) declaration.

    Legal Metrology (Packaged Commodities) Rules, 2011 – Rule 6(1)(e):
    Every package must bear the retail sale price in the form of:
        'Maximum Retail Price (inclusive of all taxes) Rs. / ₹ <amount>'
    or the abbreviated form 'MRP Rs. <amount> Incl. of all taxes'.
    """

    rule_code = "LMPC-R06-MRP"
    name = "Maximum Retail Price Declaration"
    description = (
        "Mandatory declaration of retail sale price in the form of 'Maximum or Max. Retail Price "
        "inclusive of all taxes' or 'MRP Rs. / ₹ ... incl. of all taxes'."
    )
    legal_reference = "Rule 6(1)(e), Legal Metrology (Packaged Commodities) Rules, 2011"
    version = "2011.1"
    effective_from = datetime(2011, 4, 1, tzinfo=timezone.utc)
    default_severity = SeverityLevel.HIGH

    # Pattern matching 'MRP', 'Maximum Retail Price', or 'Max. Retail Price'
    MRP_LABEL_PATTERN = re.compile(
        r"\b(m\.?r\.?p\.?|maximum\s+retail\s+price|max\.?\s*retail\s*price)\b",
        re.IGNORECASE,
    )
    # 'inclusive of all taxes' or 'incl. of all taxes' or 'incl. all taxes'
    TAX_INCLUSIVE_PATTERN = re.compile(
        r"\b(incl\.?\s*(?:of\s+)?all\s+taxes|inclusive\s+of\s+all\s+taxes)\b",
        re.IGNORECASE,
    )
    # Currency amount: ₹ 199.00 / Rs.199 / 199 Rs. / INR 199 etc.
    CURRENCY_AMOUNT_PATTERN = re.compile(
        r"(?:₹|rs\.?|inr)\s*[\d,]+(?:\.\d{1,2})?|[\d,]+(?:\.\d{1,2})?\s*(?:₹|rs\.?|inr)",
        re.IGNORECASE,
    )

    def evaluate(self, context: RuleContext) -> RuleEvaluationResult:
        mrp_field = context.get_field("mrp")
        confidence = context.get_confidence("mrp", 0.0)

        # Search the isolated field first; fall back to full raw text
        search_target = f"{mrp_field} {context.raw_text}" if mrp_field else context.raw_text

        has_mrp_label = bool(self.MRP_LABEL_PATTERN.search(search_target))
        has_tax_inclusive = bool(self.TAX_INCLUSIVE_PATTERN.search(search_target))
        currency_match = self.CURRENCY_AMOUNT_PATTERN.search(search_target)
        has_currency_amount = bool(currency_match)

        evidence = {
            "declared_field": mrp_field or "(Not isolated)",
            "has_mrp_label": has_mrp_label,
            "has_tax_inclusive": has_tax_inclusive,
            "has_currency_amount": has_currency_amount,
            "price_found": currency_match.group(0).strip() if currency_match else None,
            "field_confidence": confidence,
        }

        # Low OCR confidence: do not treat as a legal violation – flag for human review
        # Only applies when a field was actually extracted (confidence > 0)
        if confidence > 0 and confidence < 0.65:
            return RuleEvaluationResult(
                rule_code=self.rule_code,
                status=ComplianceStatus.REVIEW,
                severity=self.default_severity,
                confidence=confidence,
                explanation=(
                    "MRP declaration detected with low OCR confidence "
                    f"({confidence:.0%}). Officer visual verification recommended."
                ),
                evidence=evidence,
            )

        if has_mrp_label and has_tax_inclusive and has_currency_amount:
            return RuleEvaluationResult(
                rule_code=self.rule_code,
                status=ComplianceStatus.PASS,
                severity=self.default_severity,
                confidence=max(confidence, 0.9),
                explanation=(
                    f"Valid MRP declared with currency amount "
                    f"('{evidence['price_found']}') and 'inclusive of all taxes' statement."
                ),
                evidence=evidence,
            )
        elif has_mrp_label and has_currency_amount and not has_tax_inclusive:
            return RuleEvaluationResult(
                rule_code=self.rule_code,
                status=ComplianceStatus.FAIL,
                severity=SeverityLevel.MEDIUM,
                confidence=max(confidence, 0.85),
                explanation=(
                    "MRP declaration is missing the mandatory "
                    "'inclusive of all taxes' clause as required by Rule 6(1)(e)."
                ),
                evidence=evidence,
            )
        elif not has_mrp_label and not has_currency_amount:
            return RuleEvaluationResult(
                rule_code=self.rule_code,
                status=ComplianceStatus.FAIL,
                severity=SeverityLevel.HIGH,
                confidence=max(confidence, 0.8),
                explanation=(
                    "No Maximum Retail Price (MRP) declaration detected on package label."
                ),
                evidence=evidence,
            )
        else:
            # Has some MRP indicators but combination is ambiguous
            return RuleEvaluationResult(
                rule_code=self.rule_code,
                status=ComplianceStatus.REVIEW,
                severity=SeverityLevel.MEDIUM,
                confidence=max(confidence, 0.7),
                explanation=(
                    "Ambiguous MRP formatting detected. "
                    "Requires human officer confirmation of price and tax clause."
                ),
                evidence=evidence,
            )

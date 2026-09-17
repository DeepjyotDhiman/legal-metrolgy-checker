import re
from datetime import datetime, timezone
from app.models.enums import ComplianceStatus, SeverityLevel
from app.rules.base import BaseRule, RuleContext, RuleEvaluationResult


class MRPRule(BaseRule):
    """Rule 6(1)(e): Maximum Retail Price (MRP) declaration."""

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

    def evaluate(self, context: RuleContext) -> RuleEvaluationResult:
        mrp_field = context.get_field("mrp")
        confidence = context.get_confidence("mrp", 0.0)

        # Also search raw text if mrp field was not explicitly isolated
        search_target = f"{mrp_field} {context.raw_text}" if mrp_field else context.raw_text

        has_mrp_label = bool(re.search(r"\b(m\.?r\.?p\.?|maximum\s+retail\s+price|max\.?\s*retail\s*price)\b", search_target, re.IGNORECASE))
        has_tax_inclusive = bool(re.search(r"\b(incl\.?\s*(?:of)?\s*all\s*taxes|inclusive\s+of\s+all\s+taxes)\b", search_target, re.IGNORECASE))
        has_currency_amount = bool(re.search(r"(?:₹|rs\.?|inr)\s*[\d,]+(?:\.\d{1,2})?|[\d,]+(?:\.\d{1,2})?\s*(?:₹|rs\.?|inr)", search_target, re.IGNORECASE))

        evidence = {
            "declared_field": mrp_field or "(Not isolated)",
            "has_mrp_label": has_mrp_label,
            "has_tax_inclusive": has_tax_inclusive,
            "has_currency_amount": has_currency_amount,
            "field_confidence": confidence,
        }

        # If low extraction confidence, mark for Officer Review
        if confidence > 0 and confidence < 0.65:
            return RuleEvaluationResult(
                rule_code=self.rule_code,
                status=ComplianceStatus.REVIEW,
                severity=self.default_severity,
                confidence=confidence,
                explanation="MRP declaration detected with moderate/low confidence. Officer visual verification recommended.",
                evidence=evidence,
            )

        if has_mrp_label and has_tax_inclusive and has_currency_amount:
            return RuleEvaluationResult(
                rule_code=self.rule_code,
                status=ComplianceStatus.PASS,
                severity=self.default_severity,
                confidence=max(confidence, 0.9),
                explanation="Valid MRP declared with currency amount and 'inclusive of all taxes' statement.",
                evidence=evidence,
            )
        elif has_mrp_label and has_currency_amount and not has_tax_inclusive:
            return RuleEvaluationResult(
                rule_code=self.rule_code,
                status=ComplianceStatus.FAIL,
                severity=SeverityLevel.MEDIUM,
                confidence=max(confidence, 0.85),
                explanation="MRP declaration is missing mandatory 'inclusive of all taxes' clause.",
                evidence=evidence,
            )
        elif not has_mrp_label and not has_currency_amount:
            return RuleEvaluationResult(
                rule_code=self.rule_code,
                status=ComplianceStatus.FAIL,
                severity=SeverityLevel.HIGH,
                confidence=max(confidence, 0.8),
                explanation="No Maximum Retail Price (MRP) declaration detected on package label.",
                evidence=evidence,
            )
        else:
            return RuleEvaluationResult(
                rule_code=self.rule_code,
                status=ComplianceStatus.REVIEW,
                severity=SeverityLevel.MEDIUM,
                confidence=max(confidence, 0.7),
                explanation="Ambiguous MRP formatting detected. Requires human officer confirmation.",
                evidence=evidence,
            )

import re
from datetime import datetime, timezone
from app.models.enums import ComplianceStatus, SeverityLevel
from app.rules.base import BaseRule, RuleContext, RuleEvaluationResult


class NetQuantityRule(BaseRule):
    """Rule 6(1)(d): Net quantity declaration in standard units."""

    rule_code = "LMPC-R06-NETQTY"
    name = "Net Quantity Declaration"
    description = (
        "Mandatory declaration of net quantity in terms of standard unit of weight, "
        "measure or number (g, kg, ml, l, m, N, units)."
    )
    legal_reference = "Rule 6(1)(d), Legal Metrology (Packaged Commodities) Rules, 2011"
    version = "2011.1"
    effective_from = datetime(2011, 4, 1, tzinfo=timezone.utc)
    default_severity = SeverityLevel.HIGH

    # Metric units permitted by Legal Metrology rules
    METRIC_UNIT_PATTERN = r"\b(\d+(?:\.\d+)?)\s*(kg|g|gm|gms|grams?|kilograms?|mg|milligrams?|l|lt|ltr|litres?|liters?|ml|millilitres?|milliliters?|m|cm|mm|metres?|meters?|n|u|units?|pieces?|pcs)\b"
    IMPERIAL_ONLY_PATTERN = r"\b(\d+(?:\.\d+)?)\s*(lbs?|pounds?|oz|ounces?|fl\.?\s*oz)\b"

    def evaluate(self, context: RuleContext) -> RuleEvaluationResult:
        net_qty_field = context.get_field("net_quantity")
        confidence = context.get_confidence("net_quantity", 0.0)

        search_target = f"{net_qty_field} {context.raw_text}" if net_qty_field else context.raw_text

        metric_match = re.search(self.METRIC_UNIT_PATTERN, search_target, re.IGNORECASE)
        imperial_match = re.search(self.IMPERIAL_ONLY_PATTERN, search_target, re.IGNORECASE)
        has_net_qty_label = bool(re.search(r"\b(net\s*(?:wt\.?|weight|qty\.?|quantity|content|volume))\b", search_target, re.IGNORECASE))

        evidence = {
            "declared_field": net_qty_field or "(Not isolated)",
            "metric_match": metric_match.group(0) if metric_match else None,
            "imperial_match": imperial_match.group(0) if imperial_match else None,
            "has_net_qty_label": has_net_qty_label,
            "field_confidence": confidence,
        }

        if confidence > 0 and confidence < 0.65:
            return RuleEvaluationResult(
                rule_code=self.rule_code,
                status=ComplianceStatus.REVIEW,
                severity=self.default_severity,
                confidence=confidence,
                explanation="Net quantity text found with borderline OCR confidence. Officer confirmation needed.",
                evidence=evidence,
            )

        if metric_match:
            return RuleEvaluationResult(
                rule_code=self.rule_code,
                status=ComplianceStatus.PASS,
                severity=self.default_severity,
                confidence=max(confidence, 0.9),
                explanation=f"Valid net quantity declared in standardized units: {metric_match.group(0)}.",
                evidence=evidence,
            )
        elif imperial_match and not metric_match:
            return RuleEvaluationResult(
                rule_code=self.rule_code,
                status=ComplianceStatus.FAIL,
                severity=SeverityLevel.HIGH,
                confidence=0.9,
                explanation="Net quantity declared exclusively in non-metric units, violating Rule 6(1)(d).",
                evidence=evidence,
            )
        else:
            return RuleEvaluationResult(
                rule_code=self.rule_code,
                status=ComplianceStatus.FAIL,
                severity=SeverityLevel.HIGH,
                confidence=max(confidence, 0.8),
                explanation="Mandatory net quantity declaration not detected on package label.",
                evidence=evidence,
            )

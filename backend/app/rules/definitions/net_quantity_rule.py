import re
from datetime import datetime, timezone
from app.models.enums import ComplianceStatus, SeverityLevel
from app.rules.base import BaseRule, RuleContext, RuleEvaluationResult


class NetQuantityRule(BaseRule):
    """Rule 6(1)(d): Net quantity declaration in standard metric units.

    Legal Metrology (Packaged Commodities) Rules, 2011 – Rule 6(1)(d):
    Every package must bear the net quantity in terms of standard units of weight,
    measure, or number as prescribed by the Legal Metrology Act, 2009.
    Imperial/non-metric units alone (oz, lbs, fl. oz) are non-compliant.
    """

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

    # Metric units permitted by Legal Metrology rules.
    # \s* (zero or more spaces) handles both "500 g" and "500g"/"500ml".
    # Longer unit names are listed before abbreviations to match greedily.
    METRIC_UNIT_PATTERN = re.compile(
        r"(\d+(?:\.\d+)?)\s*"
        r"(kilograms?|kg|milligrams?|mg|grams?|gms?|g|"
        r"litres?|liters?|ltr?|millilitres?|milliliters?|ml|"
        r"metres?|meters?|centimetres?|centimeters?|millimetres?|millimeters?|cm|mm|m|"
        r"pieces?|pcs?|units?)\b",
        re.IGNORECASE,
    )

    # Non-metric imperial units that are NOT permitted as the sole declaration
    IMPERIAL_ONLY_PATTERN = re.compile(
        r"(\d+(?:\.\d+)?)\s*(lbs?|pounds?|fl\.?\s*oz|ounces?|oz)\b",
        re.IGNORECASE,
    )

    # Optional: detect a "Net Wt." / "Net Qty" label for stronger PASS confidence
    NET_QTY_LABEL_PATTERN = re.compile(
        r"\b(net\s*(?:wt\.?|weight|qty\.?|quantity|content|volume))\b",
        re.IGNORECASE,
    )

    def evaluate(self, context: RuleContext) -> RuleEvaluationResult:
        net_qty_field = context.get_field("net_quantity")
        confidence = context.get_confidence("net_quantity", 0.0)

        # Search isolated field first; augment with raw text for coverage
        search_target = f"{net_qty_field} {context.raw_text}" if net_qty_field else context.raw_text

        metric_match = self.METRIC_UNIT_PATTERN.search(search_target)
        imperial_match = self.IMPERIAL_ONLY_PATTERN.search(search_target)
        has_net_qty_label = bool(self.NET_QTY_LABEL_PATTERN.search(search_target))

        evidence = {
            "declared_field": net_qty_field or "(Not isolated)",
            "metric_match": metric_match.group(0).strip() if metric_match else None,
            "imperial_match": imperial_match.group(0).strip() if imperial_match else None,
            "has_net_qty_label": has_net_qty_label,
            "field_confidence": confidence,
        }

        # Low OCR confidence: do not treat as legal violation – flag for review
        if confidence > 0 and confidence < 0.65:
            return RuleEvaluationResult(
                rule_code=self.rule_code,
                status=ComplianceStatus.REVIEW,
                severity=self.default_severity,
                confidence=confidence,
                explanation=(
                    f"Net quantity text found with low OCR confidence ({confidence:.0%}). "
                    "Officer confirmation needed before drawing a compliance conclusion."
                ),
                evidence=evidence,
            )

        if metric_match:
            return RuleEvaluationResult(
                rule_code=self.rule_code,
                status=ComplianceStatus.PASS,
                severity=self.default_severity,
                confidence=max(confidence, 0.9),
                explanation=(
                    f"Valid net quantity declared in standardized metric units: "
                    f"'{metric_match.group(0).strip()}'."
                ),
                evidence=evidence,
            )
        elif imperial_match and not metric_match:
            return RuleEvaluationResult(
                rule_code=self.rule_code,
                status=ComplianceStatus.FAIL,
                severity=SeverityLevel.HIGH,
                confidence=0.9,
                explanation=(
                    f"Net quantity declared exclusively in non-metric units "
                    f"('{imperial_match.group(0).strip()}'), which violates Rule 6(1)(d). "
                    "Metric equivalent must be declared."
                ),
                evidence=evidence,
            )
        else:
            return RuleEvaluationResult(
                rule_code=self.rule_code,
                status=ComplianceStatus.FAIL,
                severity=SeverityLevel.HIGH,
                confidence=max(confidence, 0.8),
                explanation=(
                    "Mandatory net quantity declaration not detected on the package label."
                ),
                evidence=evidence,
            )

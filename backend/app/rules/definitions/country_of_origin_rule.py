import re
from datetime import datetime, timezone
from app.models.enums import ComplianceStatus, SeverityLevel
from app.rules.base import BaseRule, RuleContext, RuleEvaluationResult


class CountryOfOriginRule(BaseRule):
    """Rule 6(1)(g): Country of Origin declaration."""

    rule_code = "LMPC-R06-ORIGIN"
    name = "Country of Origin Declaration"
    description = (
        "Mandatory declaration of country of origin or country of manufacture/assembly "
        "on all packaged commodities."
    )
    legal_reference = "Rule 6(1)(g), Legal Metrology (Packaged Commodities) Rules, 2011"
    version = "2011.1"
    effective_from = datetime(2011, 4, 1, tzinfo=timezone.utc)
    default_severity = SeverityLevel.HIGH

    ORIGIN_PATTERN = r"\b(country\s+of\s+origin|made\s+in|product\s+of|produced\s+in|manufactured\s+in)\s*[:\-]?\s*([a-zA-Z\s]{3,25})\b"

    def evaluate(self, context: RuleContext) -> RuleEvaluationResult:
        origin_field = context.get_field("country_of_origin")
        confidence = context.get_confidence("country_of_origin", 0.0)

        search_target = f"{origin_field} {context.raw_text}"
        origin_match = re.search(self.ORIGIN_PATTERN, search_target, re.IGNORECASE)

        evidence = {
            "declared_field": origin_field or "(Not isolated)",
            "origin_match": origin_match.group(0) if origin_match else None,
            "field_confidence": confidence,
        }

        if origin_match or (origin_field and len(origin_field) >= 3):
            country = origin_match.group(2).strip() if origin_match else origin_field
            return RuleEvaluationResult(
                rule_code=self.rule_code,
                status=ComplianceStatus.PASS,
                severity=self.default_severity,
                confidence=max(confidence, 0.9),
                explanation=f"Country of origin clearly stated: '{country}'.",
                evidence=evidence,
            )
        else:
            return RuleEvaluationResult(
                rule_code=self.rule_code,
                status=ComplianceStatus.FAIL,
                severity=self.default_severity,
                confidence=max(confidence, 0.8),
                explanation="Country of origin declaration not detected on package label.",
                evidence=evidence,
            )

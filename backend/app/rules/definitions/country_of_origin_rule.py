import re
from datetime import datetime, timezone
from app.models.enums import ComplianceStatus, SeverityLevel
from app.rules.base import BaseRule, RuleContext, RuleEvaluationResult


class CountryOfOriginRule(BaseRule):
    """Rule 6(1)(g): Country of Origin declaration.

    Legal Metrology (Packaged Commodities) Rules, 2011 – Rule 6(1)(g):
    Every package of a commodity shall bear the country of origin
    or country of manufacture or assembly on its label.
    This requirement applies to both domestic and imported commodities.
    """

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

    # Matches declarations like:
    #   "Country of Origin: India", "Made in India", "Product of India",
    #   "Produced in India", "Manufactured in India", "Country of Manufacture: India"
    ORIGIN_PATTERN = re.compile(
        r"\b(country\s+of\s+(?:origin|manufacture)|made\s+in|product\s+of|"
        r"produced\s+in|manufactured\s+in|assembled\s+in)"
        r"\s*[:\-]?\s*([a-zA-Z\s]{3,30})\b",
        re.IGNORECASE,
    )

    def evaluate(self, context: RuleContext) -> RuleEvaluationResult:
        origin_field = context.get_field("country_of_origin")
        confidence = context.get_confidence("country_of_origin", 0.0)

        search_target = f"{origin_field} {context.raw_text}"
        origin_match = self.ORIGIN_PATTERN.search(search_target)

        # Extract the country name from regex or from isolated field
        country_name = None
        if origin_match:
            country_name = origin_match.group(2).strip()
        elif origin_field and len(origin_field) >= 3:
            country_name = origin_field

        evidence = {
            "declared_field": origin_field or "(Not isolated)",
            "origin_match": origin_match.group(0).strip() if origin_match else None,
            "country_detected": country_name,
            "field_confidence": confidence,
        }

        # Low OCR confidence: evidence present but unreliable – flag for review
        if confidence > 0 and confidence < 0.65:
            return RuleEvaluationResult(
                rule_code=self.rule_code,
                status=ComplianceStatus.REVIEW,
                severity=SeverityLevel.MEDIUM,
                confidence=confidence,
                explanation=(
                    f"Country of origin text detected with low OCR confidence "
                    f"({confidence:.0%}). Officer must verify the country name on the physical label."
                ),
                evidence=evidence,
            )

        if country_name:
            return RuleEvaluationResult(
                rule_code=self.rule_code,
                status=ComplianceStatus.PASS,
                severity=self.default_severity,
                confidence=max(confidence, 0.9),
                explanation=f"Country of origin clearly stated: '{country_name}'.",
                evidence=evidence,
            )
        else:
            return RuleEvaluationResult(
                rule_code=self.rule_code,
                status=ComplianceStatus.FAIL,
                severity=self.default_severity,
                confidence=max(confidence, 0.8),
                explanation=(
                    "Country of origin declaration not detected on the package label. "
                    "This is a mandatory requirement under Rule 6(1)(g)."
                ),
                evidence=evidence,
            )

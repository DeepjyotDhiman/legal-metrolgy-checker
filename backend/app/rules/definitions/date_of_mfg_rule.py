import re
from datetime import datetime, timezone
from app.models.enums import ComplianceStatus, SeverityLevel
from app.rules.base import BaseRule, RuleContext, RuleEvaluationResult


class DateOfMfgRule(BaseRule):
    """Rule 6(1)(c): Month and year of manufacture, packing or import."""

    rule_code = "LMPC-R06-DATE"
    name = "Month & Year of Manufacture/Packing"
    description = (
        "Mandatory declaration of the month and year in which the commodity is manufactured, "
        "packed, or pre-packed."
    )
    legal_reference = "Rule 6(1)(c), Legal Metrology (Packaged Commodities) Rules, 2011"
    version = "2011.1"
    effective_from = datetime(2011, 4, 1, tzinfo=timezone.utc)
    default_severity = SeverityLevel.MEDIUM

    DATE_KEYWORDS_PATTERN = r"\b(mfg\.?\s*(?:date)?|pkd\.?\s*(?:date)?|packed|manufactured|date\s+of\s+mfg|best\s+before|expiry|use\s+by)\b"
    # Matches MM/YY, MM/YYYY, Month YYYY, etc.
    MONTH_YEAR_PATTERN = r"\b(0[1-9]|1[0-2])[\/\-\.](20\d{2}|\d{2})\b|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\.\,\/\-]+(20\d{2}|\d{2})\b"

    def evaluate(self, context: RuleContext) -> RuleEvaluationResult:
        date_field = context.get_field("mfg_date")
        confidence = context.get_confidence("mfg_date", 0.0)

        search_target = f"{date_field} {context.raw_text}"

        has_date_keyword = bool(re.search(self.DATE_KEYWORDS_PATTERN, search_target, re.IGNORECASE))
        date_match = re.search(self.MONTH_YEAR_PATTERN, search_target, re.IGNORECASE)

        evidence = {
            "declared_field": date_field or "(Not isolated)",
            "date_match": date_match.group(0) if date_match else None,
            "has_date_keyword": has_date_keyword,
            "field_confidence": confidence,
        }

        if date_match and has_date_keyword:
            return RuleEvaluationResult(
                rule_code=self.rule_code,
                status=ComplianceStatus.PASS,
                severity=self.default_severity,
                confidence=max(confidence, 0.88),
                explanation=f"Month and year of manufacture/packing declared ({date_match.group(0)}).",
                evidence=evidence,
            )
        elif date_match:
            return RuleEvaluationResult(
                rule_code=self.rule_code,
                status=ComplianceStatus.REVIEW,
                severity=SeverityLevel.LOW,
                confidence=max(confidence, 0.7),
                explanation="Date pattern detected but explicit 'Mfg' or 'Pkd' qualifier requires verification.",
                evidence=evidence,
            )
        else:
            return RuleEvaluationResult(
                rule_code=self.rule_code,
                status=ComplianceStatus.FAIL,
                severity=self.default_severity,
                confidence=max(confidence, 0.8),
                explanation="Mandatory month and year of manufacture/packing declaration not found.",
                evidence=evidence,
            )

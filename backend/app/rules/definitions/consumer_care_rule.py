import re
from datetime import datetime, timezone
from app.models.enums import ComplianceStatus, SeverityLevel
from app.rules.base import BaseRule, RuleContext, RuleEvaluationResult


class ConsumerCareRule(BaseRule):
    """Rule 6(1)(f): Consumer care details for complaints/feedback."""

    rule_code = "LMPC-R06-CARE"
    name = "Consumer Care Details"
    description = (
        "Mandatory declaration of name, address, telephone number and email address "
        "of the person or office that may be contacted in case of consumer complaints."
    )
    legal_reference = "Rule 6(1)(f), Legal Metrology (Packaged Commodities) Rules, 2011"
    version = "2011.1"
    effective_from = datetime(2011, 4, 1, tzinfo=timezone.utc)
    default_severity = SeverityLevel.MEDIUM

    EMAIL_PATTERN = r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"
    PHONE_PATTERN = r"\b(?:\+?91[\-\s]?)?[6-9]\d{9}\b|\b1800[\-\s]?\d{3}[\-\s]?\d{3,4}\b"
    CARE_KEYWORDS_PATTERN = r"\b(consumer\s+care|customer\s+care|helpline|feedback|complaints|contact\s+us)\b"

    def evaluate(self, context: RuleContext) -> RuleEvaluationResult:
        care_field = context.get_field("consumer_care")
        confidence = context.get_confidence("consumer_care", 0.0)

        search_target = f"{care_field} {context.raw_text}"

        has_care_keyword = bool(re.search(self.CARE_KEYWORDS_PATTERN, search_target, re.IGNORECASE))
        has_email = bool(re.search(self.EMAIL_PATTERN, search_target))
        has_phone = bool(re.search(self.PHONE_PATTERN, search_target))

        evidence = {
            "declared_field": care_field or "(Not isolated)",
            "has_care_keyword": has_care_keyword,
            "has_email": has_email,
            "has_phone": has_phone,
            "field_confidence": confidence,
        }

        if (has_care_keyword or care_field) and (has_email or has_phone):
            return RuleEvaluationResult(
                rule_code=self.rule_code,
                status=ComplianceStatus.PASS,
                severity=self.default_severity,
                confidence=max(confidence, 0.88),
                explanation="Consumer care helpline or email address declared for consumer grievances.",
                evidence=evidence,
            )
        elif has_email or has_phone:
            return RuleEvaluationResult(
                rule_code=self.rule_code,
                status=ComplianceStatus.REVIEW,
                severity=SeverityLevel.LOW,
                confidence=max(confidence, 0.75),
                explanation="Contact coordinates found, but explicit consumer grievance designation needs verification.",
                evidence=evidence,
            )
        else:
            return RuleEvaluationResult(
                rule_code=self.rule_code,
                status=ComplianceStatus.FAIL,
                severity=self.default_severity,
                confidence=max(confidence, 0.8),
                explanation="Consumer care contact details (telephone/email) missing from package declaration.",
                evidence=evidence,
            )

import re
from datetime import datetime, timezone
from app.models.enums import ComplianceStatus, SeverityLevel
from app.rules.base import BaseRule, RuleContext, RuleEvaluationResult


class DateOfMfgRule(BaseRule):
    """Rule 6(1)(c): Month and year of manufacture, packing or import.

    Legal Metrology (Packaged Commodities) Rules, 2011 – Rule 6(1)(c):
    Every package shall bear the month and year in which the commodity is
    manufactured or packed or pre-packed. For packages with a shelf life of
    less than 3 months the date (day) should also be declared.
    The declaration shall appear prominently and legibly on the package.
    """

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

    # Keywords that qualify a date as manufacturing/packing date
    DATE_KEYWORDS_PATTERN = re.compile(
        r"\b(mfg\.?\s*(?:date)?|pkd\.?\s*(?:date)?|packed|manufactured|"
        r"date\s+of\s+(?:mfg|manufacture|packing)|best\s+before|expiry|use\s+by|"
        r"dom|dop|mfg\s*\.|pkg\.?\s*date)\b",
        re.IGNORECASE,
    )

    # Month-Year patterns:
    #   Numeric: MM/YYYY, MM-YYYY, MM.YYYY, MM/YY, MM-YY, MM.YY
    #   Text:    Jan 2026, January 2026, Jan-2026, Jan.2026, Jan/2026
    MONTH_YEAR_PATTERN = re.compile(
        r"\b(0[1-9]|1[0-2])[\/\-\.](20\d{2}|\d{2})\b"          # numeric MM sep YYYY
        r"|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)"   # text month abbreviation
        r"[a-z]*"                                                  # optional full month suffix
        r"[\s\.\,\/\-]+"                                          # flexible separator
        r"(20\d{2}|\d{2})\b",                                    # year
        re.IGNORECASE,
    )

    def evaluate(self, context: RuleContext) -> RuleEvaluationResult:
        date_field = context.get_field("mfg_date")
        confidence = context.get_confidence("mfg_date", 0.0)

        search_target = f"{date_field} {context.raw_text}"

        has_date_keyword = bool(self.DATE_KEYWORDS_PATTERN.search(search_target))
        date_match = self.MONTH_YEAR_PATTERN.search(search_target)

        evidence = {
            "declared_field": date_field or "(Not isolated)",
            "date_match": date_match.group(0).strip() if date_match else None,
            "has_date_keyword": has_date_keyword,
            "field_confidence": confidence,
        }

        # Low OCR confidence: do not auto-fail – flag for officer review
        if confidence > 0 and confidence < 0.65:
            return RuleEvaluationResult(
                rule_code=self.rule_code,
                status=ComplianceStatus.REVIEW,
                severity=SeverityLevel.LOW,
                confidence=confidence,
                explanation=(
                    f"Manufacturing/packing date detected with low OCR confidence "
                    f"({confidence:.0%}). Officer must verify the date and qualifier on the physical label."
                ),
                evidence=evidence,
            )

        if date_match and has_date_keyword:
            return RuleEvaluationResult(
                rule_code=self.rule_code,
                status=ComplianceStatus.PASS,
                severity=self.default_severity,
                confidence=max(confidence, 0.88),
                explanation=(
                    f"Month and year of manufacture/packing declared: "
                    f"'{date_match.group(0).strip()}' with qualifying keyword."
                ),
                evidence=evidence,
            )
        elif date_match:
            return RuleEvaluationResult(
                rule_code=self.rule_code,
                status=ComplianceStatus.REVIEW,
                severity=SeverityLevel.LOW,
                confidence=max(confidence, 0.7),
                explanation=(
                    f"Date pattern '{date_match.group(0).strip()}' detected, but no explicit "
                    "'Mfg', 'Pkd', or 'Date of manufacture' qualifier was found. "
                    "Officer must confirm this refers to manufacture/packing date."
                ),
                evidence=evidence,
            )
        else:
            return RuleEvaluationResult(
                rule_code=self.rule_code,
                status=ComplianceStatus.FAIL,
                severity=self.default_severity,
                confidence=max(confidence, 0.8),
                explanation=(
                    "Mandatory month and year of manufacture/packing declaration "
                    "not found on the package label."
                ),
                evidence=evidence,
            )

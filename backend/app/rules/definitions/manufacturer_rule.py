import re
from datetime import datetime, timezone
from app.models.enums import ComplianceStatus, SeverityLevel
from app.rules.base import BaseRule, RuleContext, RuleEvaluationResult


class ManufacturerRule(BaseRule):
    """Rule 6(1)(a): Manufacturer / Packer / Importer name and complete address.

    Legal Metrology (Packaged Commodities) Rules, 2011 – Rule 6(1)(a):
    Every package shall bear the name and complete address of the manufacturer,
    or, where the manufacturer is not the packer, the name and address of both
    the manufacturer and the packer; or importer as applicable.
    A complete address should include a PIN code for Indian entities.
    """

    rule_code = "LMPC-R06-MFG"
    name = "Manufacturer/Packer Name & Address"
    description = (
        "Mandatory declaration of the name and complete address of the manufacturer, "
        "or where the manufacturer is not the packer, the name and address of the manufacturer and packer."
    )
    legal_reference = "Rule 6(1)(a), Legal Metrology (Packaged Commodities) Rules, 2011"
    version = "2011.1"
    effective_from = datetime(2011, 4, 1, tzinfo=timezone.utc)
    default_severity = SeverityLevel.HIGH

    # Keyword indicators that a manufacturer/packer entity is declared
    MFG_KEYWORDS_PATTERN = re.compile(
        r"\b(mfg\.?\s*by|manufactured\s+by|packed\s+by|marketed\s+by|"
        r"imported\s+by|producer|marketer|packer)\b",
        re.IGNORECASE,
    )
    # 6-digit Indian PIN code as a proxy for a complete address
    PIN_CODE_PATTERN = re.compile(r"\b\d{6}\b")

    def evaluate(self, context: RuleContext) -> RuleEvaluationResult:
        mfg_name = context.get_field("manufacturer_name")
        mfg_addr = context.get_field("manufacturer_address")
        confidence = max(
            context.get_confidence("manufacturer_name", 0.0),
            context.get_confidence("manufacturer_address", 0.0),
        )

        search_target = f"{mfg_name} {mfg_addr} {context.raw_text}"

        has_mfg_keyword = bool(self.MFG_KEYWORDS_PATTERN.search(search_target))
        has_pincode = bool(self.PIN_CODE_PATTERN.search(search_target))

        evidence = {
            "declared_name": mfg_name or "(Not isolated)",
            "declared_address": mfg_addr or "(Not isolated)",
            "has_mfg_keyword": has_mfg_keyword,
            "has_pincode": has_pincode,
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
                    f"Manufacturer/packer details detected with low OCR confidence "
                    f"({confidence:.0%}). Officer visual verification of name and address recommended."
                ),
                evidence=evidence,
            )

        if (mfg_name or has_mfg_keyword) and (mfg_addr or has_pincode):
            return RuleEvaluationResult(
                rule_code=self.rule_code,
                status=ComplianceStatus.PASS,
                severity=self.default_severity,
                confidence=max(confidence, 0.85),
                explanation=(
                    "Manufacturer/packer details declared with address and postal PIN reference."
                ),
                evidence=evidence,
            )
        elif mfg_name or has_mfg_keyword:
            return RuleEvaluationResult(
                rule_code=self.rule_code,
                status=ComplianceStatus.REVIEW,
                severity=SeverityLevel.MEDIUM,
                confidence=max(confidence, 0.75),
                explanation=(
                    "Manufacturer name identified, but a complete address with PIN code "
                    "requires visual verification by the inspecting officer."
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
                    "Mandatory manufacturer/packer name and address declaration "
                    "is missing from the package label."
                ),
                evidence=evidence,
            )

from typing import List, Tuple
from sqlalchemy.orm import Session
from app.models.rule import Rule
from app.models.compliance_check import ComplianceCheck
from app.models.enums import ComplianceStatus, InspectionStatus
from app.rules.base import RuleContext, RuleEvaluationResult
from app.rules.registry import rule_registry


class ComplianceService:
    """Service to execute modular Legal Metrology rules and persist compliance findings."""

    @staticmethod
    def sync_rules_to_db(db: Session) -> None:
        """Ensure all registered rules exist in the database with current metadata."""
        for rule_def in rule_registry.list_rules(active_only=False):
            existing = db.query(Rule).filter(Rule.rule_code == rule_def.rule_code).first()
            if not existing:
                db_rule = Rule(
                    rule_code=rule_def.rule_code,
                    name=rule_def.name,
                    description=rule_def.description,
                    legal_reference=rule_def.legal_reference,
                    version=rule_def.version,
                    effective_from=rule_def.effective_from,
                    effective_to=rule_def.effective_to,
                    active=rule_def.active,
                )
                db.add(db_rule)
            else:
                existing.name = rule_def.name
                existing.description = rule_def.description
                existing.legal_reference = rule_def.legal_reference
                existing.version = rule_def.version
                existing.active = rule_def.active
        db.commit()

    @classmethod
    def evaluate_inspection(
        cls,
        db: Session,
        inspection_id: str,
        context: RuleContext,
    ) -> Tuple[InspectionStatus, List[ComplianceCheck]]:
        """Run all registered rules, store ComplianceCheck entries, and compute preliminary verdict."""
        cls.sync_rules_to_db(db)

        # Clear existing compliance checks for this inspection if re-evaluating
        db.query(ComplianceCheck).filter(ComplianceCheck.inspection_id == inspection_id).delete()

        rule_results: List[RuleEvaluationResult] = rule_registry.evaluate_all(context)

        db_checks: List[ComplianceCheck] = []
        has_fail = False
        has_review = False

        for res in rule_results:
            db_rule = db.query(Rule).filter(Rule.rule_code == res.rule_code).first()
            if not db_rule:
                continue

            check = ComplianceCheck(
                inspection_id=inspection_id,
                rule_id=db_rule.id,
                status=res.status,
                severity=res.severity,
                explanation=res.explanation,
                evidence=res.evidence,
                confidence=res.confidence,
            )
            db.add(check)
            db_checks.append(check)

            if res.status == ComplianceStatus.FAIL:
                has_fail = True
            elif res.status == ComplianceStatus.REVIEW:
                has_review = True

        db.commit()
        for check in db_checks:
            db.refresh(check)

        # Preliminary verdict determination
        if has_fail:
            overall_status = InspectionStatus.NON_COMPLIANT
        elif has_review:
            overall_status = InspectionStatus.REVIEW_REQUIRED
        else:
            overall_status = InspectionStatus.COMPLIANT

        return overall_status, db_checks

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.rule import Rule
from app.schemas.rule import RuleResponse
from app.services.compliance_service import ComplianceService

router = APIRouter(prefix="/rules", tags=["Rules"])


@router.get("", response_model=List[RuleResponse])
def list_rules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve catalog of all versioned Legal Metrology compliance rules."""
    ComplianceService.sync_rules_to_db(db)
    rules = db.query(Rule).filter(Rule.active == True).all()  # noqa: E712
    return rules


@router.get("/{rule_code}", response_model=RuleResponse)
def get_rule_by_code(
    rule_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve details and legal references for a specific rule code."""
    rule = db.query(Rule).filter(Rule.rule_code == rule_code).first()
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Legal Metrology rule '{rule_code}' not found.",
        )
    return rule

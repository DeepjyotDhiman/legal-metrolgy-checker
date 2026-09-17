from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.inspection import Inspection
from app.models.compliance_check import ComplianceCheck
from app.schemas.compliance_check import ComplianceCheckResponse

router = APIRouter(prefix="/inspections/{inspection_id}/compliance", tags=["Compliance Findings"])


@router.get("", response_model=List[ComplianceCheckResponse])
def get_inspection_compliance(
    inspection_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve preliminary compliance findings with deterministic rule references and evidence links."""
    inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inspection '{inspection_id}' not found.",
        )

    checks = db.query(ComplianceCheck).filter(ComplianceCheck.inspection_id == inspection_id).all()
    return checks

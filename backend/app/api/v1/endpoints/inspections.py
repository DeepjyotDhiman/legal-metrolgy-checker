from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user, require_officer
from app.models.user import User
from app.models.inspection import Inspection
from app.models.enums import InspectionStatus
from app.schemas.inspection import (
    InspectionCreate,
    InspectionResponse,
    InspectionDetailResponse,
)
from app.services.inspection_service import InspectionService
from app.services.audit_service import AuditService

router = APIRouter(prefix="/inspections", tags=["Inspections"])


@router.post("", response_model=InspectionResponse, status_code=status.HTTP_201_CREATED)
def create_inspection(
    payload: InspectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer),
):
    """Create a new packaged commodity inspection record in DRAFT status."""
    inspection = Inspection(
        created_by=current_user.id,
        product_category=payload.product_category,
        status=InspectionStatus.DRAFT,
    )
    db.add(inspection)
    db.commit()
    db.refresh(inspection)

    AuditService.log_event(
        db=db,
        action="INSPECTION_CREATED",
        user_id=current_user.id,
        inspection_id=inspection.id,
        new_value={"product_category": inspection.product_category, "status": inspection.status.value},
    )

    return inspection


@router.get("", response_model=List[InspectionResponse])
def list_inspections(
    status_filter: Optional[InspectionStatus] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List inspection records with optional status filtering."""
    query = db.query(Inspection)
    if status_filter:
        query = query.filter(Inspection.status == status_filter)

    inspections = query.order_by(Inspection.created_at.desc()).offset(skip).limit(limit).all()
    return inspections


@router.get("/{inspection_id}", response_model=InspectionDetailResponse)
def get_inspection(
    inspection_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve full details of an inspection including images, OCR, extracted fields, and checks."""
    inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inspection '{inspection_id}' not found.",
        )
    return inspection


@router.post("/{inspection_id}/analyze", response_model=InspectionDetailResponse)
def analyze_inspection(
    inspection_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer),
):
    """Trigger OCR, declaration extraction, and deterministic Legal Metrology rule evaluation."""
    inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inspection '{inspection_id}' not found.",
        )

    updated_inspection = InspectionService.run_analysis(
        db=db,
        inspection=inspection,
        user_id=current_user.id,
    )
    return updated_inspection

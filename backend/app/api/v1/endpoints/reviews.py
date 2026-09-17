from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import require_officer
from app.models.user import User
from app.models.inspection import Inspection
from app.schemas.review import ReviewCreate, ReviewResponse
from app.services.inspection_service import InspectionService

router = APIRouter(prefix="/inspections/{inspection_id}/review", tags=["Officer Review"])


@router.post("", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
def submit_officer_review(
    inspection_id: str,
    payload: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer),
):
    """Submit human officer review decision and override notes, finalizing the inspection."""
    inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inspection '{inspection_id}' not found.",
        )

    review = InspectionService.submit_review(
        db=db,
        inspection=inspection,
        officer_id=current_user.id,
        decision=payload.decision,
        comment=payload.comment,
    )
    return review

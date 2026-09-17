from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.inspection import Inspection
from app.models.extracted_field import ExtractedField
from app.schemas.extracted_field import ExtractedFieldResponse

router = APIRouter(prefix="/inspections/{inspection_id}/fields", tags=["Extracted Fields"])


@router.get("", response_model=List[ExtractedFieldResponse])
def get_inspection_fields(
    inspection_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve isolated packaging declarations (MRP, Net Qty, Mfg Date, etc.) with bounding boxes."""
    inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inspection '{inspection_id}' not found.",
        )

    fields = db.query(ExtractedField).filter(ExtractedField.inspection_id == inspection_id).all()
    return fields

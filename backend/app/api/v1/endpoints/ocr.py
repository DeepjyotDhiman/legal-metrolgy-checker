from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.inspection import Inspection
from app.models.ocr import OCRResult
from app.schemas.ocr import OCRResultResponse

router = APIRouter(prefix="/inspections/{inspection_id}/ocr", tags=["OCR Results"])


@router.get("", response_model=List[OCRResultResponse])
def get_inspection_ocr(
    inspection_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve raw OCR extraction texts, detected languages, and confidence scores."""
    inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inspection '{inspection_id}' not found.",
        )

    ocr_results = db.query(OCRResult).filter(OCRResult.inspection_id == inspection_id).all()
    return ocr_results

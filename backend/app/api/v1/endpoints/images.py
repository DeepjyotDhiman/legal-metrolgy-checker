from typing import List
from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import require_officer, get_current_user
from app.models.user import User
from app.models.inspection import Inspection
from app.models.image import Image
from app.models.enums import InspectionStatus
from app.schemas.image import ImageResponse, ImageUploadResponse
from app.services.image_service import ImageService
from app.services.audit_service import AuditService

router = APIRouter(prefix="/inspections/{inspection_id}/images", tags=["Images"])


@router.post("", response_model=ImageUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_images(
    inspection_id: str,
    files: List[UploadFile] = File(...),
    image_type: str = Form("LABEL"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer),
):
    """Upload packaged commodity images with security checks, MIME verification, and quality scoring."""
    inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inspection '{inspection_id}' not found.",
        )

    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files provided for upload.",
        )

    saved_records: List[Image] = []
    for file in files:
        saved_path, quality_score = await ImageService.save_uploaded_image(
            file=file,
            inspection_id=inspection_id,
        )

        image_record = Image(
            inspection_id=inspection_id,
            file_path=str(saved_path),
            image_type=image_type,
            quality_score=quality_score,
        )
        db.add(image_record)
        saved_records.append(image_record)

    # Transition inspection status from DRAFT to UPLOADED
    if inspection.status == InspectionStatus.DRAFT:
        inspection.status = InspectionStatus.UPLOADED

    db.commit()
    for record in saved_records:
        db.refresh(record)

    AuditService.log_event(
        db=db,
        action="IMAGES_UPLOADED",
        user_id=current_user.id,
        inspection_id=inspection_id,
        new_value={
            "count": len(saved_records),
            "image_ids": [img.id for img in saved_records],
        },
    )

    return ImageUploadResponse(
        message=f"Successfully uploaded and validated {len(saved_records)} image(s).",
        uploaded_images=[ImageResponse.model_validate(img) for img in saved_records],
    )


@router.get("", response_model=List[ImageResponse])
def get_inspection_images(
    inspection_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve all uploaded packaging images for an inspection."""
    inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inspection '{inspection_id}' not found.",
        )

    images = db.query(Image).filter(Image.inspection_id == inspection_id).all()
    return images

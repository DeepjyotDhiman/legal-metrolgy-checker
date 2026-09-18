from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.inspection import Inspection
from app.models.image import Image
from app.models.ocr import OCRResult
from app.models.extracted_field import ExtractedField
from app.models.review import Review
from app.models.enums import InspectionStatus, ReviewDecision
from app.rules.base import RuleContext
from app.services.base_ocr import BaseOCRService
from app.services.mock_ocr import MockOCRService
from app.services.compliance_service import ComplianceService
from app.services.audit_service import AuditService


class InspectionService:
    """Orchestration service for the complete inspection lifecycle."""

    @staticmethod
    def get_default_ocr_service() -> BaseOCRService:
        """Resolve the active OCR provider according to application configuration."""
        from app.core.config import settings
        from app.services.paddle_ocr import PaddleOCRService

        provider = getattr(settings, "OCR_PROVIDER", "auto").lower()
        if provider == "mock":
            return MockOCRService()
        elif provider == "paddleocr":
            return PaddleOCRService()

        # Default 'auto' mode: try PaddleOCR, fall back to MockOCRService if unavailable
        try:
            return PaddleOCRService()
        except Exception:
            return MockOCRService()

    @staticmethod
    def run_analysis(
        db: Session,
        inspection: Inspection,
        ocr_service: Optional[BaseOCRService] = None,
        user_id: Optional[str] = None,
    ) -> Inspection:
        """Execute OCR, declaration field extraction, and deterministic rule evaluation."""
        if ocr_service is None:
            ocr_service = InspectionService.get_default_ocr_service()

        # Check if inspection has images
        images = db.query(Image).filter(Image.inspection_id == inspection.id).all()
        if not images:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot analyze inspection without at least one uploaded image.",
            )

        # Transition status to ANALYZING
        old_status = inspection.status.value
        inspection.status = InspectionStatus.ANALYZING
        db.commit()

        # Execute OCR & field extraction pipeline
        image_paths = [Path(img.file_path) for img in images]
        image_ids = [img.id for img in images]
        ocr_pipeline_result = ocr_service.process_images(image_paths, image_ids)

        # Persist OCRResult
        db.query(OCRResult).filter(OCRResult.inspection_id == inspection.id).delete()
        ocr_record = OCRResult(
            inspection_id=inspection.id,
            raw_text=ocr_pipeline_result.raw_output.raw_text,
            language=ocr_pipeline_result.raw_output.language,
            confidence=ocr_pipeline_result.raw_output.confidence,
        )
        db.add(ocr_record)

        # Persist ExtractedFields
        db.query(ExtractedField).filter(ExtractedField.inspection_id == inspection.id).delete()
        extracted_dict = {}
        confidence_dict = {}
        bbox_dict = {}

        for field in ocr_pipeline_result.extracted_fields:
            extracted_record = ExtractedField(
                inspection_id=inspection.id,
                field_name=field.field_name,
                field_value=field.field_value,
                confidence=field.confidence,
                source_image_id=field.source_image_id,
                bounding_box=field.bounding_box,
            )
            db.add(extracted_record)
            extracted_dict[field.field_name] = field.field_value
            confidence_dict[field.field_name] = field.confidence
            bbox_dict[field.field_name] = field.bounding_box

        db.commit()

        # Build RuleContext for deterministic Legal Metrology evaluation
        rule_context = RuleContext(
            product_category=inspection.product_category,
            extracted_fields=extracted_dict,
            field_confidences=confidence_dict,
            field_bounding_boxes=bbox_dict,
            raw_text=ocr_pipeline_result.raw_output.raw_text,
        )

        preliminary_status, _ = ComplianceService.evaluate_inspection(
            db=db,
            inspection_id=inspection.id,
            context=rule_context,
        )

        inspection.preliminary_result = preliminary_status.value
        # All preliminary results require human officer oversight
        inspection.status = InspectionStatus.REVIEW_REQUIRED
        db.commit()
        db.refresh(inspection)

        # Log audit trail
        AuditService.log_event(
            db=db,
            action="ANALYSIS_COMPLETED",
            user_id=user_id,
            inspection_id=inspection.id,
            old_value={"status": old_status},
            new_value={
                "status": inspection.status.value,
                "preliminary_result": inspection.preliminary_result,
            },
        )

        return inspection

    @staticmethod
    def submit_review(
        db: Session,
        inspection: Inspection,
        officer_id: str,
        decision: ReviewDecision,
        comment: str,
    ) -> Review:
        """Record an officer review and override decision, finalizing inspection."""
        old_status = inspection.status.value
        old_final = inspection.final_result

        review = Review(
            inspection_id=inspection.id,
            officer_id=officer_id,
            decision=decision.value,
            comment=comment,
        )
        db.add(review)

        # Update inspection with officer verdict
        inspection.final_result = decision.value
        inspection.status = InspectionStatus.COMPLETED
        inspection.completed_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(review)
        db.refresh(inspection)

        # Immutable audit log for legal accountability
        AuditService.log_event(
            db=db,
            action="OFFICER_REVIEW_SUBMITTED",
            user_id=officer_id,
            inspection_id=inspection.id,
            old_value={"status": old_status, "final_result": old_final},
            new_value={
                "status": inspection.status.value,
                "final_result": inspection.final_result,
                "decision": decision.value,
                "comment": comment,
            },
        )

        return review

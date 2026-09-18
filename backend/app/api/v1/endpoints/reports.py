from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.inspection import Inspection
from app.models.report import Report
from app.models.image import Image
from app.models.extracted_field import ExtractedField
from app.models.compliance_check import ComplianceCheck
from app.models.review import Review
from app.schemas.report import ReportResponse, InspectionReportData
from app.schemas.extracted_field import ExtractedFieldResponse
from app.schemas.compliance_check import ComplianceCheckResponse
from app.schemas.review import ReviewResponse

from typing import List

router = APIRouter(prefix="/inspections/{inspection_id}/report", tags=["Reports"])
reports_router = APIRouter(prefix="/reports", tags=["Reports"])


def build_report(inspection: Inspection, db: Session) -> ReportResponse:
    images = db.query(Image).filter(Image.inspection_id == inspection.id).all()
    fields = db.query(ExtractedField).filter(ExtractedField.inspection_id == inspection.id).all()
    checks = db.query(ComplianceCheck).filter(ComplianceCheck.inspection_id == inspection.id).all()
    reviews = db.query(Review).filter(Review.inspection_id == inspection.id).all()

    pass_count = sum(1 for c in checks if c.status.value == "PASS")
    fail_count = sum(1 for c in checks if c.status.value == "FAIL")
    review_count = sum(1 for c in checks if c.status.value == "REVIEW")

    report_data = InspectionReportData(
        inspection_id=inspection.id,
        product_category=inspection.product_category,
        status=inspection.status,
        preliminary_result=inspection.preliminary_result,
        final_result=inspection.final_result,
        created_at=inspection.created_at,
        completed_at=inspection.completed_at,
        images_count=len(images),
        extracted_fields=[ExtractedFieldResponse.model_validate(f) for f in fields],
        compliance_checks=[ComplianceCheckResponse.model_validate(c) for c in checks],
        reviews=[ReviewResponse.model_validate(r) for r in reviews],
        summary={
            "total_rules_evaluated": len(checks),
            "passed_rules": pass_count,
            "failed_rules": fail_count,
            "rules_requiring_review": review_count,
            "is_finalized": inspection.final_result is not None,
        },
    )

    db_report = db.query(Report).filter(Report.inspection_id == inspection.id).first()
    if not db_report:
        db_report = Report(
            inspection_id=inspection.id,
            file_path=f"/reports/inspection_{inspection.id}.json",
        )
        db.add(db_report)
        db.commit()
        db.refresh(db_report)

    return ReportResponse(
        id=db_report.id,
        inspection_id=inspection.id,
        file_path=db_report.file_path,
        generated_at=db_report.generated_at,
        data=report_data,
    )


@router.get("", response_model=ReportResponse)
def get_inspection_report(
    inspection_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate or retrieve a structured Legal Metrology inspection report."""
    inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inspection '{inspection_id}' not found.",
        )
    return build_report(inspection, db)


@reports_router.get("", response_model=List[ReportResponse])
def list_all_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all generated inspection reports."""
    inspections = db.query(Inspection).order_by(Inspection.created_at.desc()).all()
    reports_list = []
    for insp in inspections:
        if insp.status.value in ["COMPLETED", "REVIEW_REQUIRED"] or insp.final_result or insp.preliminary_result:
            reports_list.append(build_report(insp, db))
    return reports_list


@reports_router.get("/{report_id}", response_model=ReportResponse)
def get_report_by_id(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve a report by Report ID or associated Inspection ID."""
    db_report = db.query(Report).filter(Report.id == report_id).first()
    if db_report:
        inspection = db.query(Inspection).filter(Inspection.id == db_report.inspection_id).first()
        if inspection:
            return build_report(inspection, db)

    # Fallback to inspection_id lookup
    inspection = db.query(Inspection).filter(Inspection.id == report_id).first()
    if inspection:
        return build_report(inspection, db)

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Report '{report_id}' not found.",
    )

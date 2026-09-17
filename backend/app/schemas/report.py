from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, ConfigDict
from app.models.enums import InspectionStatus
from app.schemas.compliance_check import ComplianceCheckResponse
from app.schemas.extracted_field import ExtractedFieldResponse
from app.schemas.review import ReviewResponse


class InspectionReportData(BaseModel):
    inspection_id: str
    product_category: str
    status: InspectionStatus
    preliminary_result: Optional[str] = None
    final_result: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    images_count: int
    extracted_fields: List[ExtractedFieldResponse]
    compliance_checks: List[ComplianceCheckResponse]
    reviews: List[ReviewResponse]
    summary: dict[str, Any]


class ReportResponse(BaseModel):
    id: str
    inspection_id: str
    file_path: str
    generated_at: datetime
    data: Optional[InspectionReportData] = None

    model_config = ConfigDict(from_attributes=True)

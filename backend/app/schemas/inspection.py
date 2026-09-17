from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.models.enums import InspectionStatus
from app.schemas.image import ImageResponse
from app.schemas.ocr import OCRResultResponse
from app.schemas.extracted_field import ExtractedFieldResponse
from app.schemas.compliance_check import ComplianceCheckResponse
from app.schemas.review import ReviewResponse


class InspectionBase(BaseModel):
    product_category: str = "General Packaged Commodity"


class InspectionCreate(InspectionBase):
    pass


class InspectionUpdate(BaseModel):
    product_category: Optional[str] = None
    status: Optional[InspectionStatus] = None


class InspectionResponse(InspectionBase):
    id: str
    created_by: str
    status: InspectionStatus
    preliminary_result: Optional[str] = None
    final_result: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class InspectionDetailResponse(InspectionResponse):
    images: List[ImageResponse] = []
    ocr_results: List[OCRResultResponse] = []
    extracted_fields: List[ExtractedFieldResponse] = []
    compliance_checks: List[ComplianceCheckResponse] = []
    reviews: List[ReviewResponse] = []

    model_config = ConfigDict(from_attributes=True)

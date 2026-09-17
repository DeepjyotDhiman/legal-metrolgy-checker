from typing import Optional, Any, Dict
from pydantic import BaseModel, ConfigDict


class ExtractedFieldCreate(BaseModel):
    field_name: str
    field_value: str
    confidence: float
    source_image_id: Optional[str] = None
    bounding_box: Optional[Dict[str, Any]] = None


class ExtractedFieldResponse(BaseModel):
    id: str
    inspection_id: str
    field_name: str
    field_value: str
    confidence: float
    source_image_id: Optional[str] = None
    bounding_box: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)

from datetime import datetime
from pydantic import BaseModel, ConfigDict


class OCRResultResponse(BaseModel):
    id: str
    inspection_id: str
    raw_text: str
    language: str
    confidence: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.enums import ReviewDecision


class ReviewCreate(BaseModel):
    decision: ReviewDecision
    comment: str


class ReviewResponse(BaseModel):
    id: str
    inspection_id: str
    officer_id: str
    decision: str
    comment: str
    reviewed_at: datetime

    model_config = ConfigDict(from_attributes=True)

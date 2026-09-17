from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class ImageBase(BaseModel):
    image_type: str = "LABEL"


class ImageResponse(ImageBase):
    id: str
    inspection_id: str
    file_path: str
    quality_score: Optional[float] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ImageUploadResponse(BaseModel):
    message: str
    uploaded_images: list[ImageResponse]

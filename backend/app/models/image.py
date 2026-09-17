from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.base import generate_uuid, utc_now


class Image(Base):
    """Uploaded packaging image metadata and quality score."""

    __tablename__ = "images"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    inspection_id = Column(String(36), ForeignKey("inspections.id", ondelete="CASCADE"), nullable=False, index=True)
    file_path = Column(String(500), nullable=False)
    image_type = Column(String(50), default="LABEL", nullable=False)
    quality_score = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    inspection = relationship("Inspection", back_populates="images")
    extracted_fields = relationship("ExtractedField", back_populates="source_image")

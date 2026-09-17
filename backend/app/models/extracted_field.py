from sqlalchemy import Column, String, Text, Float, JSON, ForeignKey
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.base import generate_uuid


class ExtractedField(Base):
    """Normalized extracted declaration field with confidence and image bounding box."""

    __tablename__ = "extracted_fields"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    inspection_id = Column(String(36), ForeignKey("inspections.id", ondelete="CASCADE"), nullable=False, index=True)
    field_name = Column(String(100), nullable=False, index=True)
    field_value = Column(Text, nullable=False)
    confidence = Column(Float, default=0.0, nullable=False)
    source_image_id = Column(String(36), ForeignKey("images.id", ondelete="SET NULL"), nullable=True)
    bounding_box = Column(JSON, nullable=True)

    # Relationships
    inspection = relationship("Inspection", back_populates="extracted_fields")
    source_image = relationship("Image", back_populates="extracted_fields")

from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.base import generate_uuid, utc_now


class Review(Base):
    """Human officer review, verification, and legal override decision."""

    __tablename__ = "reviews"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    inspection_id = Column(String(36), ForeignKey("inspections.id", ondelete="CASCADE"), nullable=False, index=True)
    officer_id = Column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    decision = Column(String(50), nullable=False)
    comment = Column(Text, nullable=False)
    reviewed_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    inspection = relationship("Inspection", back_populates="reviews")
    officer = relationship("User", back_populates="reviews")

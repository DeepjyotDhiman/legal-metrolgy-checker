from sqlalchemy import Column, String, Text, Float, JSON, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.base import generate_uuid
from app.models.enums import ComplianceStatus, SeverityLevel


class ComplianceCheck(Base):
    """Deterministic evaluation outcome of a single Legal Metrology rule."""

    __tablename__ = "compliance_checks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    inspection_id = Column(String(36), ForeignKey("inspections.id", ondelete="CASCADE"), nullable=False, index=True)
    rule_id = Column(String(36), ForeignKey("rules.id", ondelete="RESTRICT"), nullable=False, index=True)
    status = Column(SQLEnum(ComplianceStatus), nullable=False)
    severity = Column(SQLEnum(SeverityLevel), default=SeverityLevel.HIGH, nullable=False)
    explanation = Column(Text, nullable=False)
    evidence = Column(JSON, nullable=True)
    confidence = Column(Float, default=1.0, nullable=False)

    # Relationships
    inspection = relationship("Inspection", back_populates="compliance_checks")
    rule = relationship("Rule", back_populates="compliance_checks")

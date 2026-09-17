from sqlalchemy import Column, String, Text, Boolean, DateTime
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.base import generate_uuid, utc_now


class Rule(Base):
    """Legal Metrology compliance rule metadata definition."""

    __tablename__ = "rules"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    rule_code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(100), default="PACKAGED_COMMODITIES", nullable=False)
    legal_reference = Column(String(255), nullable=False)
    version = Column(String(50), default="2011.1", nullable=False)
    effective_from = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    effective_to = Column(DateTime(timezone=True), nullable=True)
    active = Column(Boolean, default=True, nullable=False)

    # Relationships
    compliance_checks = relationship("ComplianceCheck", back_populates="rule")

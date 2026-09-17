from sqlalchemy import Column, String, Boolean, Enum as SQLEnum, DateTime
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.base import generate_uuid, utc_now
from app.models.enums import UserRole


class User(Base):
    """User account entity for authentication and RBAC."""

    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.OFFICER, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    inspections = relationship("Inspection", back_populates="creator", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="officer")
    audit_logs = relationship("AuditLog", back_populates="user")

from typing import Any, Optional
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog


class AuditService:
    """Service for recording audit trail events."""

    @staticmethod
    def log_event(
        db: Session,
        action: str,
        user_id: Optional[str] = None,
        inspection_id: Optional[str] = None,
        old_value: Optional[Any] = None,
        new_value: Optional[Any] = None,
    ) -> AuditLog:
        """Create and commit an immutable audit log record."""
        log_entry = AuditLog(
            user_id=user_id,
            inspection_id=inspection_id,
            action=action,
            old_value=old_value,
            new_value=new_value,
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return log_entry

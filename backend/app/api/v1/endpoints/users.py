from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import require_admin
from app.models.user import User
from app.models.enums import UserRole
from app.schemas.user import UserResponse
from app.services.audit_service import AuditService

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=List[UserResponse])
def list_users(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by 'active', 'pending', or 'all'"),
    role_filter: Optional[UserRole] = Query(None, alias="role"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """List all registered users. Restricted to ADMIN users only."""
    query = db.query(User)

    if status_filter == "pending":
        query = query.filter(User.is_active == False)
    elif status_filter == "active":
        query = query.filter(User.is_active == True)

    if role_filter:
        query = query.filter(User.role == role_filter)

    users = query.order_by(User.created_at.desc()).all()
    return users


@router.get("/pending", response_model=List[UserResponse])
def list_pending_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Retrieve users waiting for administrative account activation."""
    return db.query(User).filter(User.is_active == False).order_by(User.created_at.desc()).all()


@router.post("/{user_id}/approve", response_model=UserResponse)
def approve_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Approve and activate a pending officer user account."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '{user_id}' not found.",
        )

    old_active = user.is_active
    user.is_active = True
    db.commit()
    db.refresh(user)

    AuditService.log_event(
        db=db,
        action="USER_APPROVED",
        user_id=current_user.id,
        new_value={"approved_user_id": user.id, "email": user.email, "is_active": True},
        old_value={"is_active": old_active},
    )

    return user


@router.post("/{user_id}/reject")
def reject_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Reject and deactivate a user account or pending registration."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '{user_id}' not found.",
        )

    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot deactivate their own account.",
        )

    user.is_active = False
    db.commit()
    db.refresh(user)

    AuditService.log_event(
        db=db,
        action="USER_REJECTED",
        user_id=current_user.id,
        new_value={"rejected_user_id": user.id, "email": user.email, "is_active": False},
    )

    return {"message": f"User '{user.email}' has been rejected / deactivated.", "user_id": user.id}

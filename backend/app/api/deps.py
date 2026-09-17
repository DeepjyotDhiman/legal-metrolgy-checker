from typing import List, Optional
from fastapi import Cookie, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_session_token
from app.models.user import User
from app.models.enums import UserRole


def get_token_from_request(
    session_cookie: Optional[str] = Cookie(default=None, alias=settings.SESSION_COOKIE_NAME),
    authorization: Optional[str] = Header(default=None),
) -> Optional[str]:
    """Retrieve session token from HttpOnly cookie or Authorization Bearer header."""
    if session_cookie:
        return session_cookie
    if authorization and authorization.startswith("Bearer "):
        return authorization.split(" ")[1]
    return None


def get_current_user(
    token: Optional[str] = Depends(get_token_from_request),
    db: Session = Depends(get_db),
) -> User:
    """Validate current user from session token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication credentials were not provided or have expired.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception

    payload = decode_session_token(token)
    if not payload or "sub" not in payload:
        raise credentials_exception

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive.",
        )

    return user


class RoleChecker:
    """Dependency for enforcing Role-Based Access Control (RBAC)."""

    def __init__(self, allowed_roles: List[UserRole]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required roles: {[r.value for r in self.allowed_roles]}",
            )
        return current_user


# RBAC Role shortcuts
require_admin = RoleChecker([UserRole.ADMIN])
require_officer = RoleChecker([UserRole.OFFICER, UserRole.ADMIN])

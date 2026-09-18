from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import verify_password, create_session_token, hash_password
from app.api.deps import get_current_user
from app.models.user import User
from app.models.enums import UserRole
from app.schemas.token import LoginRequest, TokenResponse
from app.schemas.user import UserResponse, UserRegisterRequest
from app.services.audit_service import AuditService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(
    payload: UserRegisterRequest,
    db: Session = Depends(get_db),
):
    """Register a new officer account in pending status (is_active=False) awaiting admin approval."""
    clean_name = payload.name.strip()
    clean_email = payload.email.lower().strip()

    if not clean_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full name is required.",
        )

    if len(payload.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long.",
        )

    existing = db.query(User).filter(User.email == clean_email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )

    user = User(
        name=clean_name,
        email=clean_email,
        password_hash=hash_password(payload.password),
        role=UserRole.OFFICER,
        is_active=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    AuditService.log_event(
        db=db,
        action="USER_REGISTERED",
        user_id=user.id,
        new_value={"email": user.email, "role": user.role.value, "is_active": user.is_active},
    )

    return {
        "message": "Registration submitted successfully. Your account is pending administrator approval.",
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role.value,
        "is_active": user.is_active,
    }


@router.post("/login", response_model=TokenResponse)
def login(
    login_data: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """Authenticate user with Argon2id and set HttpOnly session cookie."""
    user = db.query(User).filter(User.email == login_data.email.lower().strip()).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated.",
        )

    token = create_session_token(subject=user.id, role=user.role.value)

    # Set HttpOnly, secure cookie
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=settings.COOKIE_HTTPONLY,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/",
    )

    AuditService.log_event(
        db=db,
        action="USER_LOGIN",
        user_id=user.id,
        new_value={"email": user.email, "role": user.role.value},
    )

    return TokenResponse(
        message="Login successful",
        user_id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
    )


@router.post("/logout")
def logout(
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Clear session cookie and terminate user session."""
    response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME,
        path="/",
        httponly=settings.COOKIE_HTTPONLY,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
    )

    AuditService.log_event(
        db=db,
        action="USER_LOGOUT",
        user_id=current_user.id,
    )

    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Retrieve current authenticated user profile."""
    return current_user

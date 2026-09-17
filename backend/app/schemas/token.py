from typing import Optional
from pydantic import BaseModel, EmailStr
from app.models.enums import UserRole


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    message: str
    user_id: str
    email: str
    name: str
    role: UserRole


class SessionUser(BaseModel):
    user_id: str
    email: str
    role: UserRole

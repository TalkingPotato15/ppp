"""Authentication request/response schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from src.schemas.user import UserResponse


class RegisterRequest(BaseModel):
    """Request schema for user registration."""

    email: EmailStr
    password: str = Field(..., min_length=8)
    nickname: Optional[str] = Field(None, max_length=100)


class LoginRequest(BaseModel):
    """Request schema for user login."""

    email: EmailStr
    password: str
    remember_me: bool = False


class GoogleAuthRequest(BaseModel):
    """Request schema for Google OAuth login."""

    id_token: str


class ForgotPasswordRequest(BaseModel):
    """Request schema for forgot password."""

    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Request schema for password reset."""

    token: str
    new_password: str = Field(..., min_length=8)


class AuthResponse(BaseModel):
    """Response schema for successful authentication."""

    user: UserResponse
    access_token: str
    token_type: str = "Bearer"


class TokenResponse(BaseModel):
    """Response schema for token refresh."""

    access_token: str
    token_type: str = "Bearer"


class MessageResponse(BaseModel):
    """Response schema for simple message responses."""

    message: str

"""Pydantic schemas for API request/response validation."""

from src.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    GoogleAuthRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    AuthResponse,
    TokenResponse,
    MessageResponse,
)
from src.schemas.user import UserResponse, UserUpdateRequest
from src.schemas.discovery import (
    ProblemCardResponse,
    ProblemDetailResponse,
    ProblemListResponse,
    DomainListResponse,
)

__all__ = [
    # Auth
    "RegisterRequest",
    "LoginRequest",
    "GoogleAuthRequest",
    "ForgotPasswordRequest",
    "ResetPasswordRequest",
    "AuthResponse",
    "TokenResponse",
    "MessageResponse",
    # User
    "UserResponse",
    "UserUpdateRequest",
    # Discovery
    "ProblemCardResponse",
    "ProblemDetailResponse",
    "ProblemListResponse",
    "DomainListResponse",
]

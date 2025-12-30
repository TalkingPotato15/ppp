"""User request/response schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class UserResponse(BaseModel):
    """Response schema for user data."""

    id: str
    email: str
    nickname: Optional[str] = None
    auth_provider: str
    created_at: datetime

    class Config:
        """Pydantic config."""

        from_attributes = True


class UserUpdateRequest(BaseModel):
    """Request schema for updating user profile."""

    nickname: Optional[str] = Field(None, max_length=100)

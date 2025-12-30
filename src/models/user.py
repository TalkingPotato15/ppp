"""User model for authentication."""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from src.storage import Base


class AuthProvider(str, Enum):
    """Authentication provider type."""

    LOCAL = "LOCAL"
    GOOGLE = "GOOGLE"


class User(Base):
    """User account for authentication."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    nickname: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    password_hash: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )  # Null for OAuth users
    auth_provider: Mapped[AuthProvider] = mapped_column(
        SAEnum(AuthProvider), nullable=False, default=AuthProvider.LOCAL
    )
    google_id: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True, unique=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )
    last_login_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    __table_args__ = (Index("ix_users_email", "email"),)

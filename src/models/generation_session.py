"""GenerationSession model for Stage B idea generation."""

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Optional
from uuid import uuid4

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.storage import Base

if TYPE_CHECKING:
    from src.models.user import User
    from src.models.generated_idea import GeneratedIdea


class GenerationStatus(str, Enum):
    """Status of idea generation session."""

    PENDING = "PENDING"
    GENERATING = "GENERATING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class GenerationSession(Base):
    """A single idea generation session for a user and problem."""

    __tablename__ = "generation_sessions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    problem_id: Mapped[str] = mapped_column(
        String(36), nullable=False  # References DocumentSummary but no FK constraint
    )
    status: Mapped[GenerationStatus] = mapped_column(
        SAEnum(GenerationStatus), nullable=False, default=GenerationStatus.PENDING
    )
    feedback: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )  # User feedback for regeneration
    error_message: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )  # Error details if failed
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    user: Mapped["User"] = relationship("User", backref="generation_sessions")
    ideas: Mapped[list["GeneratedIdea"]] = relationship(
        "GeneratedIdea", back_populates="session", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_generation_sessions_user_id", "user_id"),
        Index("ix_generation_sessions_problem_id", "problem_id"),
    )

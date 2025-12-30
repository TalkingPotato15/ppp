"""SavedIdea model for user's saved/favorite ideas."""

from datetime import datetime
from typing import TYPE_CHECKING, Optional
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.storage import Base

if TYPE_CHECKING:
    from src.models.user import User
    from src.models.generated_idea import GeneratedIdea


class SavedIdea(Base):
    """A user's saved/favorite idea reference."""

    __tablename__ = "saved_ideas"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    idea_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("generated_ideas.id", ondelete="CASCADE"),
        nullable=False,
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )  # User's personal notes
    saved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )

    # Relationships
    user: Mapped["User"] = relationship("User", backref="saved_ideas")
    idea: Mapped["GeneratedIdea"] = relationship(
        "GeneratedIdea", back_populates="saved_by"
    )

    __table_args__ = (
        Index("ix_saved_ideas_user_id", "user_id"),
        Index("ix_saved_ideas_idea_id", "idea_id"),
        UniqueConstraint("user_id", "idea_id", name="uq_user_idea"),
    )

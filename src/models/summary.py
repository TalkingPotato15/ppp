"""DocumentSummary model for UI display."""

from datetime import datetime
from typing import Optional
from uuid import uuid4

from sqlalchemy import DateTime, Enum, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.sqlite import JSON

from src.models import Sentiment, Trend
from src.storage import Base


class DocumentSummary(Base):
    """Lightweight view for UI display. Stored in SQLite/PostgreSQL."""

    __tablename__ = "document_summaries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    source_url: Mapped[str] = mapped_column(String(2048), nullable=False, unique=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    keywords: Mapped[list] = mapped_column(JSON, nullable=False)
    domain_tag: Mapped[str] = mapped_column(String(50), nullable=False)
    trend: Mapped[Trend] = mapped_column(Enum(Trend), nullable=False)
    sentiment: Mapped[Sentiment] = mapped_column(Enum(Sentiment), nullable=False)
    posted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )

    def __repr__(self) -> str:
        return f"<DocumentSummary(id={self.id}, title={self.title[:30]}...)>"

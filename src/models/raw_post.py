"""RawPost model for scraped content before processing."""

from datetime import datetime
from typing import Optional
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.storage import Base


class RawPost(Base):
    """Represents scraped content before any processing. Temporary storage."""

    __tablename__ = "raw_posts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    source_url: Mapped[str] = mapped_column(String(2048), nullable=False, unique=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    author_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    posted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    scraped_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )
    collection_job_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("collection_jobs.id"), nullable=False
    )

    def __repr__(self) -> str:
        return f"<RawPost(id={self.id}, url={self.source_url[:50]}...)>"

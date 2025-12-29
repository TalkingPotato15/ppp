"""CollectionJob model for tracking scraping runs."""

from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import DateTime, Enum, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.models import JobStatus, JobType
from src.storage import Base


class CollectionJob(Base):
    """Tracks each scraping run for monitoring and gap detection."""

    __tablename__ = "collection_jobs"

    id: Mapped[UUID] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    job_type: Mapped[JobType] = mapped_column(Enum(JobType), nullable=False)
    status: Mapped[JobStatus] = mapped_column(
        Enum(JobStatus), nullable=False, default=JobStatus.PENDING
    )
    target_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    target_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    posts_collected: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    posts_processed: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    posts_filtered: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )

    def __repr__(self) -> str:
        return f"<CollectionJob(id={self.id}, type={self.job_type}, status={self.status})>"

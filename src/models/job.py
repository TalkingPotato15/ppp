"""CollectionJob model - represents data collection jobs."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from uuid import uuid4

from src.models import JobStatus, JobType


@dataclass
class CollectionJob:
    """Data collection job.

    Corresponds to Supabase table: collection_jobs
    """
    job_type: JobType
    id: str = field(default_factory=lambda: str(uuid4()))
    status: JobStatus = JobStatus.PENDING
    target_start: Optional[datetime] = None
    target_end: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    posts_collected: int = 0
    posts_processed: int = 0
    posts_filtered: int = 0
    error_message: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> dict:
        """Convert to dictionary for database insertion."""
        return {
            "id": self.id,
            "job_type": self.job_type.value,
            "status": self.status.value,
            "target_start": self.target_start.isoformat() if self.target_start else None,
            "target_end": self.target_end.isoformat() if self.target_end else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "posts_collected": self.posts_collected,
            "posts_processed": self.posts_processed,
            "posts_filtered": self.posts_filtered,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "CollectionJob":
        """Create CollectionJob from dictionary."""
        return cls(
            id=data.get("id", str(uuid4())),
            job_type=JobType(data["job_type"]),
            status=JobStatus(data.get("status", "PENDING")),
            target_start=datetime.fromisoformat(data["target_start"]) if data.get("target_start") else None,
            target_end=datetime.fromisoformat(data["target_end"]) if data.get("target_end") else None,
            started_at=datetime.fromisoformat(data["started_at"]) if data.get("started_at") else None,
            completed_at=datetime.fromisoformat(data["completed_at"]) if data.get("completed_at") else None,
            posts_collected=data.get("posts_collected", 0),
            posts_processed=data.get("posts_processed", 0),
            posts_filtered=data.get("posts_filtered", 0),
            error_message=data.get("error_message"),
            created_at=datetime.fromisoformat(data["created_at"]) if data.get("created_at") else datetime.now(),
        )

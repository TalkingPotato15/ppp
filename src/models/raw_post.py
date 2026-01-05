"""RawPost model - represents scraped posts before processing."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from uuid import uuid4


@dataclass
class RawPost:
    """Raw scraped post from a forum.

    Corresponds to Supabase table: raw_posts
    """
    source_url: str
    content: str
    posted_at: datetime
    id: str = field(default_factory=lambda: str(uuid4()))
    author_hash: Optional[str] = None
    scraped_at: datetime = field(default_factory=datetime.now)
    collection_job_id: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert to dictionary for database insertion."""
        return {
            "id": self.id,
            "source_url": self.source_url,
            "content": self.content,
            "author_hash": self.author_hash,
            "posted_at": self.posted_at.isoformat() if self.posted_at else None,
            "scraped_at": self.scraped_at.isoformat() if self.scraped_at else None,
            "collection_job_id": self.collection_job_id,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "RawPost":
        """Create RawPost from dictionary."""
        return cls(
            id=data.get("id", str(uuid4())),
            source_url=data["source_url"],
            content=data["content"],
            author_hash=data.get("author_hash"),
            posted_at=datetime.fromisoformat(data["posted_at"]) if isinstance(data.get("posted_at"), str) else data.get("posted_at"),
            scraped_at=datetime.fromisoformat(data["scraped_at"]) if isinstance(data.get("scraped_at"), str) else data.get("scraped_at", datetime.now()),
            collection_job_id=data.get("collection_job_id"),
        )

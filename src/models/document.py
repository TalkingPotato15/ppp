"""ProcessedDocument model - represents cleaned and processed documents."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from uuid import uuid4

from src.models import Sentiment, Trend


@dataclass
class ProcessedDocument:
    """Processed document with extracted metadata.

    Corresponds to Supabase table: document_summaries
    """
    source_url: str
    title: str
    content: str
    keywords: list[str]
    domain_tag: str
    trend: Trend
    sentiment: Sentiment
    content_hash: str
    posted_at: datetime
    id: str = field(default_factory=lambda: str(uuid4()))
    processed_at: datetime = field(default_factory=datetime.now)
    collection_job_id: Optional[str] = None
    embedding: Optional[list[float]] = None

    def to_dict(self) -> dict:
        """Convert to dictionary for database insertion."""
        return {
            "id": self.id,
            "source_url": self.source_url,
            "title": self.title,
            "keywords": self.keywords,
            "domain_tag": self.domain_tag,
            "trend": self.trend.value,
            "sentiment": self.sentiment.value,
            "posted_at": self.posted_at.isoformat() if self.posted_at else None,
            "created_at": self.processed_at.isoformat() if self.processed_at else None,
        }

    def to_summary_dict(self) -> dict:
        """Convert to dictionary for document_summaries table."""
        return {
            "id": self.id,
            "source_url": self.source_url,
            "title": self.title,
            "keywords": self.keywords,
            "domain_tag": self.domain_tag,
            "trend": self.trend.value,
            "sentiment": self.sentiment.value,
            "posted_at": self.posted_at.isoformat() if self.posted_at else None,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "ProcessedDocument":
        """Create ProcessedDocument from dictionary."""
        return cls(
            id=data.get("id", str(uuid4())),
            source_url=data["source_url"],
            title=data["title"],
            content=data.get("content", ""),
            keywords=data.get("keywords", []),
            domain_tag=data.get("domain_tag", "general"),
            trend=Trend(data.get("trend", "STABLE")),
            sentiment=Sentiment(data.get("sentiment", "NEUTRAL")),
            content_hash=data.get("content_hash", ""),
            posted_at=datetime.fromisoformat(data["posted_at"]) if isinstance(data.get("posted_at"), str) else data.get("posted_at", datetime.now()),
            processed_at=datetime.fromisoformat(data["created_at"]) if isinstance(data.get("created_at"), str) else data.get("created_at", datetime.now()),
            collection_job_id=data.get("collection_job_id"),
            embedding=data.get("embedding"),
        )

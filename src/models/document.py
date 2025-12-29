"""ProcessedDocument model for cleaned and structured content."""

from datetime import datetime
from typing import Optional
from uuid import uuid4

from pydantic import BaseModel, Field

from src.models import Sentiment, Trend


class ProcessedDocument(BaseModel):
    """Cleaned and structured content ready for RAG. Stored in Vector DB."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    source_url: str
    title: str = Field(min_length=10, max_length=500)
    content: str
    keywords: list[str] = Field(min_length=3, max_length=10)
    domain_tag: str = Field(max_length=50)
    trend: Trend
    sentiment: Sentiment
    content_hash: str = Field(max_length=64)
    posted_at: datetime
    processed_at: datetime = Field(default_factory=datetime.utcnow)
    collection_job_id: Optional[str] = None

    class Config:
        use_enum_values = True


class DocumentEmbedding(BaseModel):
    """Vector representation stored in ChromaDB."""

    id: str
    embedding: list[float]
    metadata: dict

"""Discovery UI request/response schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from src.models import Trend, Sentiment


class ProblemCardResponse(BaseModel):
    """Response schema for problem card (list view)."""

    id: str
    title: str
    keywords: list[str]
    domain_tag: str
    trend: Trend
    sentiment: Sentiment
    posted_at: datetime

    class Config:
        """Pydantic config."""

        from_attributes = True


class ProblemDetailResponse(ProblemCardResponse):
    """Response schema for problem detail view."""

    source_url: str
    created_at: datetime


class ProblemListResponse(BaseModel):
    """Response schema for paginated problem list."""

    items: list[ProblemCardResponse]
    total: int
    has_more: bool
    limit: int
    offset: int


class DomainListResponse(BaseModel):
    """Response schema for available domains."""

    domains: list[str]

"""Stage B Ideas request/response schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from src.models import GenerationStatus


# Request schemas
class GenerateIdeasRequest(BaseModel):
    """Request schema for generating ideas."""

    problem_id: str = Field(..., description="ID of the problem to generate ideas for")
    payment_id: Optional[str] = Field(
        None, description="Payment session ID (required for paid generation)"
    )
    feedback: Optional[str] = Field(
        None, max_length=1000, description="Optional feedback to guide generation"
    )


class SaveIdeaRequest(BaseModel):
    """Request schema for saving an idea."""

    notes: Optional[str] = Field(
        None, max_length=500, description="Optional personal notes"
    )


class BookmarkRequest(BaseModel):
    """Request schema for bookmarking an idea."""

    is_bookmarked: bool = Field(..., description="Whether to bookmark or unbookmark")


# Response schemas
class IdeaResponse(BaseModel):
    """Response schema for a single generated idea."""

    id: str
    title: str
    description: str
    target_audience: str
    differentiators: list[str]
    market_opportunity: str
    implementation_hints: str
    market_signals: Optional[list[str]] = Field(
        None, description="References to market data from RAG context"
    )
    confidence_score: Optional[float] = Field(
        None, ge=0.0, le=1.0, description="0.0-1.0 score based on data grounding"
    )
    is_bookmarked: bool = Field(default=False, description="Whether user has bookmarked this idea")
    is_deleted: bool = Field(default=False, description="Whether idea is soft-deleted")
    created_at: datetime

    class Config:
        """Pydantic config."""

        from_attributes = True


class GenerationSessionResponse(BaseModel):
    """Response schema for a generation session."""

    id: str
    problem_id: str
    status: GenerationStatus
    feedback: Optional[str]
    error_message: Optional[str]
    rag_context: Optional[dict] = Field(
        None, description="Retrieved documents used for generation (for debugging)"
    )
    ideas: list[IdeaResponse]
    created_at: datetime
    completed_at: Optional[datetime]

    class Config:
        """Pydantic config."""

        from_attributes = True


class GenerationSessionListResponse(BaseModel):
    """Response schema for list of generation sessions."""

    items: list[GenerationSessionResponse]
    total: int


class SavedIdeaResponse(BaseModel):
    """Response schema for a saved idea."""

    id: str
    idea: IdeaResponse
    problem_id: str
    problem_title: str
    notes: Optional[str]
    saved_at: datetime

    class Config:
        """Pydantic config."""

        from_attributes = True


class SavedIdeaListResponse(BaseModel):
    """Response schema for list of saved ideas."""

    items: list[SavedIdeaResponse]
    total: int


class ProblemSummary(BaseModel):
    """Brief problem summary for context."""

    id: str
    title: str
    keywords: list[str]
    domain_tag: str


class BookmarkResponse(BaseModel):
    """Response schema for bookmark operation."""

    idea_id: str
    is_bookmarked: bool


class IdeaWithContextResponse(BaseModel):
    """Response schema for an idea with problem context."""

    id: str
    title: str
    description: str
    target_audience: str
    differentiators: list[str]
    market_opportunity: str
    implementation_hints: str
    market_signals: Optional[list[str]] = None
    confidence_score: Optional[float] = None
    is_bookmarked: bool
    is_deleted: bool = False
    created_at: datetime
    problem_id: str
    problem_title: str

    class Config:
        """Pydantic config."""

        from_attributes = True


class BookmarkedIdeasListResponse(BaseModel):
    """Response schema for list of bookmarked ideas."""

    items: list[IdeaWithContextResponse]
    total: int


class MyIdeasListResponse(BaseModel):
    """Response schema for list of all user's ideas (My Ideas page)."""

    items: list[IdeaWithContextResponse]
    total: int


class SoftDeleteResponse(BaseModel):
    """Response schema for soft delete operation."""

    idea_id: str
    is_deleted: bool
    message: str

"""Stage B Ideas request/response schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from src.models import GenerationStatus


# Request schemas
class GenerateIdeasRequest(BaseModel):
    """Request schema for generating ideas."""

    problem_id: str = Field(..., description="ID of the problem to generate ideas for")
    feedback: Optional[str] = Field(
        None, max_length=1000, description="Optional feedback to guide regeneration"
    )


class SaveIdeaRequest(BaseModel):
    """Request schema for saving an idea."""

    notes: Optional[str] = Field(
        None, max_length=500, description="Optional personal notes"
    )


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

"""Discovery UI API endpoints."""

from typing import Literal, Optional

from fastapi import APIRouter, Query
from sqlalchemy import func, select

from src.api.dependencies import DbSession
from src.models import Trend, Sentiment
from src.models.summary import DocumentSummary
from src.schemas.discovery import (
    ProblemCardResponse,
    ProblemDetailResponse,
    ProblemListResponse,
    DomainListResponse,
)
from src.storage.rdb_store import get_summaries, get_summary_by_id, get_summary_count


router = APIRouter()


@router.get("/problems", response_model=ProblemListResponse)
async def list_problems(
    session: DbSession,
    domain: Optional[str] = Query(None, description="Filter by domain tag"),
    trend: Optional[Trend] = Query(None, description="Filter by trend"),
    sentiment: Optional[Sentiment] = Query(None, description="Filter by sentiment"),
    keywords: Optional[str] = Query(None, description="Filter by keywords (comma-separated)"),
    sort_by: Literal["recent", "oldest"] = Query("recent", description="Sort order"),
    limit: int = Query(20, ge=1, le=100, description="Number of items per page"),
    offset: int = Query(0, ge=0, description="Number of items to skip"),
):
    """List problem cards with filtering and pagination.

    Supports filtering by domain, trend, sentiment, and keywords.
    Returns paginated results with total count.
    """
    # Parse keywords if provided
    keyword_list = None
    if keywords:
        keyword_list = [k.strip() for k in keywords.split(",") if k.strip()]

    # Get problems
    problems = await get_summaries(
        session,
        domain=domain,
        keywords=keyword_list,
        trend=trend,
        sentiment=sentiment,
        sort_by=sort_by,
        limit=limit,
        offset=offset,
    )

    # Get total count
    total = await get_summary_count(
        session,
        domain=domain,
        trend=trend,
        sentiment=sentiment,
    )

    # Convert to response models
    items = [ProblemCardResponse.model_validate(p) for p in problems]
    has_more = offset + len(items) < total

    return ProblemListResponse(
        items=items,
        total=total,
        has_more=has_more,
        limit=limit,
        offset=offset,
    )


@router.get("/problems/{problem_id}", response_model=ProblemDetailResponse)
async def get_problem(
    problem_id: str,
    session: DbSession,
):
    """Get problem detail by ID."""
    problem = await get_summary_by_id(session, problem_id)

    if not problem:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Problem not found",
        )

    return ProblemDetailResponse.model_validate(problem)


@router.get("/domains", response_model=DomainListResponse)
async def list_domains(
    session: DbSession,
):
    """Get list of available domain tags."""
    result = await session.execute(
        select(DocumentSummary.domain_tag)
        .distinct()
        .order_by(DocumentSummary.domain_tag)
    )
    domains = [row[0] for row in result.all()]

    return DomainListResponse(domains=domains)

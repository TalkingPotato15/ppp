"""Idea storage operations for Stage B."""

from datetime import datetime
from typing import Optional

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.generation_session import GenerationSession, GenerationStatus
from src.models.generated_idea import GeneratedIdea
from src.models.saved_idea import SavedIdea
from src.models.summary import DocumentSummary


# ============================================================================
# Generation Session Operations
# ============================================================================


async def create_session(
    session: AsyncSession,
    user_id: str,
    problem_id: str,
    feedback: Optional[str] = None,
) -> GenerationSession:
    """Create a new generation session.

    Args:
        session: Database session.
        user_id: User UUID.
        problem_id: Problem/DocumentSummary ID.
        feedback: Optional user feedback for regeneration.

    Returns:
        The created GenerationSession object.
    """
    gen_session = GenerationSession(
        user_id=user_id,
        problem_id=problem_id,
        feedback=feedback,
        status=GenerationStatus.PENDING,
    )
    session.add(gen_session)
    await session.flush()
    return gen_session


async def update_session_status(
    session: AsyncSession,
    session_id: str,
    status: GenerationStatus,
    error_message: Optional[str] = None,
) -> Optional[GenerationSession]:
    """Update session status.

    Args:
        session: Database session.
        session_id: GenerationSession UUID.
        status: New status.
        error_message: Error message if status is FAILED.

    Returns:
        Updated GenerationSession if found, None otherwise.
    """
    result = await session.execute(
        select(GenerationSession).where(GenerationSession.id == session_id)
    )
    gen_session = result.scalar_one_or_none()

    if not gen_session:
        return None

    gen_session.status = status
    gen_session.error_message = error_message

    if status in (GenerationStatus.COMPLETED, GenerationStatus.FAILED):
        gen_session.completed_at = datetime.utcnow()

    await session.flush()
    return gen_session


async def add_ideas_to_session(
    session: AsyncSession,
    session_id: str,
    ideas_data: list[dict],
) -> list[GeneratedIdea]:
    """Add generated ideas to a session.

    Args:
        session: Database session.
        session_id: GenerationSession UUID.
        ideas_data: List of idea dictionaries with fields:
            - title, description, target_audience, differentiators,
              market_opportunity, implementation_hints

    Returns:
        List of created GeneratedIdea objects.
    """
    ideas = []
    for data in ideas_data:
        idea = GeneratedIdea(
            session_id=session_id,
            title=data["title"],
            description=data["description"],
            target_audience=data["target_audience"],
            differentiators=data.get("differentiators", []),
            market_opportunity=data["market_opportunity"],
            implementation_hints=data["implementation_hints"],
        )
        session.add(idea)
        ideas.append(idea)

    await session.flush()
    return ideas


async def get_session(
    session: AsyncSession, session_id: str
) -> Optional[GenerationSession]:
    """Get a generation session with its ideas.

    Args:
        session: Database session.
        session_id: GenerationSession UUID.

    Returns:
        GenerationSession with ideas loaded, or None if not found.
    """
    result = await session.execute(
        select(GenerationSession)
        .options(selectinload(GenerationSession.ideas))
        .where(GenerationSession.id == session_id)
    )
    return result.scalar_one_or_none()


async def get_user_sessions(
    session: AsyncSession,
    user_id: str,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[GenerationSession], int]:
    """Get user's generation sessions with pagination.

    Args:
        session: Database session.
        user_id: User UUID.
        limit: Maximum number of sessions to return.
        offset: Number of sessions to skip.

    Returns:
        Tuple of (list of GenerationSession objects, total count).
    """
    # Get count
    count_result = await session.execute(
        select(func.count(GenerationSession.id)).where(
            GenerationSession.user_id == user_id
        )
    )
    total = count_result.scalar_one()

    # Get sessions
    result = await session.execute(
        select(GenerationSession)
        .options(selectinload(GenerationSession.ideas))
        .where(GenerationSession.user_id == user_id)
        .order_by(GenerationSession.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    sessions = list(result.scalars().all())

    return sessions, total


async def get_latest_session_for_problem(
    session: AsyncSession,
    user_id: str,
    problem_id: str,
) -> Optional[GenerationSession]:
    """Get the latest generation session for a user and problem.

    Args:
        session: Database session.
        user_id: User UUID.
        problem_id: Problem/DocumentSummary ID.

    Returns:
        Latest GenerationSession with ideas, or None if not found.
    """
    result = await session.execute(
        select(GenerationSession)
        .options(selectinload(GenerationSession.ideas))
        .where(
            GenerationSession.user_id == user_id,
            GenerationSession.problem_id == problem_id,
        )
        .order_by(GenerationSession.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


# ============================================================================
# Idea Operations
# ============================================================================


async def get_idea(session: AsyncSession, idea_id: str) -> Optional[GeneratedIdea]:
    """Get a generated idea by ID.

    Args:
        session: Database session.
        idea_id: GeneratedIdea UUID.

    Returns:
        GeneratedIdea if found, None otherwise.
    """
    result = await session.execute(
        select(GeneratedIdea).where(GeneratedIdea.id == idea_id)
    )
    return result.scalar_one_or_none()


# ============================================================================
# Saved Idea Operations
# ============================================================================


async def save_idea(
    session: AsyncSession,
    user_id: str,
    idea_id: str,
    notes: Optional[str] = None,
) -> SavedIdea:
    """Save an idea for a user.

    Args:
        session: Database session.
        user_id: User UUID.
        idea_id: GeneratedIdea UUID.
        notes: Optional personal notes.

    Returns:
        The created SavedIdea object.
    """
    saved = SavedIdea(
        user_id=user_id,
        idea_id=idea_id,
        notes=notes,
    )
    session.add(saved)
    await session.flush()
    return saved


async def unsave_idea(session: AsyncSession, saved_id: str, user_id: str) -> bool:
    """Remove a saved idea.

    Args:
        session: Database session.
        saved_id: SavedIdea UUID.
        user_id: User UUID (for ownership verification).

    Returns:
        True if deleted, False if not found or not owned by user.
    """
    result = await session.execute(
        delete(SavedIdea).where(
            SavedIdea.id == saved_id,
            SavedIdea.user_id == user_id,
        )
    )
    return result.rowcount > 0


async def get_saved_idea_by_idea_id(
    session: AsyncSession,
    user_id: str,
    idea_id: str,
) -> Optional[SavedIdea]:
    """Check if user has saved a specific idea.

    Args:
        session: Database session.
        user_id: User UUID.
        idea_id: GeneratedIdea UUID.

    Returns:
        SavedIdea if found, None otherwise.
    """
    result = await session.execute(
        select(SavedIdea).where(
            SavedIdea.user_id == user_id,
            SavedIdea.idea_id == idea_id,
        )
    )
    return result.scalar_one_or_none()


async def get_saved_ideas(
    session: AsyncSession,
    user_id: str,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[SavedIdea], int]:
    """Get user's saved ideas with pagination.

    Args:
        session: Database session.
        user_id: User UUID.
        limit: Maximum number of saved ideas to return.
        offset: Number of saved ideas to skip.

    Returns:
        Tuple of (list of SavedIdea objects with ideas loaded, total count).
    """
    # Get count
    count_result = await session.execute(
        select(func.count(SavedIdea.id)).where(SavedIdea.user_id == user_id)
    )
    total = count_result.scalar_one()

    # Get saved ideas with idea details
    result = await session.execute(
        select(SavedIdea)
        .options(
            selectinload(SavedIdea.idea).selectinload(GeneratedIdea.session)
        )
        .where(SavedIdea.user_id == user_id)
        .order_by(SavedIdea.saved_at.desc())
        .limit(limit)
        .offset(offset)
    )
    saved_ideas = list(result.scalars().all())

    return saved_ideas, total


# ============================================================================
# Problem Operations (for context)
# ============================================================================


async def get_problem(
    session: AsyncSession, problem_id: str
) -> Optional[DocumentSummary]:
    """Get a problem/document summary by ID.

    Args:
        session: Database session.
        problem_id: DocumentSummary UUID.

    Returns:
        DocumentSummary if found, None otherwise.
    """
    result = await session.execute(
        select(DocumentSummary).where(DocumentSummary.id == problem_id)
    )
    return result.scalar_one_or_none()

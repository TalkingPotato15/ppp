"""Stage B Ideas API endpoints."""

import asyncio
import logging

from fastapi import APIRouter, HTTPException, status
from openai import APIConnectionError, APITimeoutError, RateLimitError

from src.api.dependencies import DbSession, CurrentUser
from src.models import GenerationStatus
from src.schemas.ideas import (
    GenerateIdeasRequest,
    SaveIdeaRequest,
    BookmarkRequest,
    IdeaResponse,
    GenerationSessionResponse,
    GenerationSessionListResponse,
    SavedIdeaResponse,
    SavedIdeaListResponse,
    BookmarkResponse,
    IdeaWithContextResponse,
    BookmarkedIdeasListResponse,
    MyIdeasListResponse,
    SoftDeleteResponse,
)
from src.storage import idea_store
from src.storage.session_store import get_unused_payment, mark_payment_used
from src.services.ai_agent import ai_agent
from src.services.rag_service import (
    retrieve_similar_problems,
    format_rag_context_for_prompt,
    rag_context_to_dict,
)


logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/generate", response_model=GenerationSessionResponse)
async def generate_ideas(
    request: GenerateIdeasRequest,
    session: DbSession,
    user: CurrentUser,
):
    """Generate business ideas for a problem.

    Creates a new generation session and uses the AI agent to generate ideas.
    Payment validation: each generation requires an unused payment for the problem.
    Multiple generations for same problem allowed with multiple payments.
    """
    # Get the problem details
    problem = await idea_store.get_problem(session, request.problem_id)
    if not problem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Problem not found",
        )

    # Payment validation - find unused payment for this user and problem
    payment_id = request.payment_id
    if payment_id:
        # Use specified payment_id - validate it's unused and belongs to user
        from src.storage.session_store import get_payment_session
        payment = get_payment_session(payment_id)
        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment not found",
            )
        if payment.user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Payment does not belong to this user",
            )
        if payment.problem_id != request.problem_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment is for a different problem",
            )
        if payment.is_used:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Payment has already been used for generation",
            )
    else:
        # Find an unused payment for this user and problem
        payment = get_unused_payment(user.id, request.problem_id)
        if not payment:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="No unused payment found for this problem. Please complete payment first.",
            )
        payment_id = payment.session_id

    # Mark payment as used before generation
    if not mark_payment_used(payment_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Failed to reserve payment. It may have been used by another request.",
        )

    # Create generation session with payment_id
    gen_session = await idea_store.create_session(
        session=session,
        user_id=user.id,
        problem_id=request.problem_id,
        payment_id=payment_id,
        feedback=request.feedback,
    )

    # Update status to generating
    await idea_store.update_session_status(
        session=session,
        session_id=gen_session.id,
        status=GenerationStatus.GENERATING,
    )

    try:
        # Retrieve RAG context for grounding
        logger.info(f"Retrieving RAG context for problem: {problem.title[:50]}...")
        rag_context = await retrieve_similar_problems(
            problem_title=problem.title,
            keywords=problem.keywords,
            domain_tag=problem.domain_tag,
            top_k=5,
        )

        # Format RAG context for prompt
        rag_prompt_context = format_rag_context_for_prompt(rag_context)

        # Store RAG context in session for debugging
        await idea_store.update_session_rag_context(
            session=session,
            session_id=gen_session.id,
            rag_context=rag_context_to_dict(rag_context),
        )

        # Generate ideas using AI agent with RAG context
        ideas_data = await ai_agent.generate_ideas(
            problem_title=problem.title,
            keywords=problem.keywords or [],
            domain=problem.domain_tag or "general",
            trend=problem.trend.value if problem.trend else "STABLE",
            sentiment=problem.sentiment.value if problem.sentiment else "NEUTRAL",
            rag_context=rag_prompt_context,
        )

        # Convert to dict format for storage (including new fields)
        ideas_dicts = [
            {
                "title": idea.title,
                "description": idea.description,
                "target_audience": idea.target_audience,
                "differentiators": idea.differentiators,
                "market_opportunity": idea.market_opportunity,
                "implementation_hints": idea.implementation_hints,
                "market_signals": idea.market_signals,
                "confidence_score": idea.confidence_score,
            }
            for idea in ideas_data
        ]

        # Save ideas to database
        await idea_store.add_ideas_to_session(
            session=session,
            session_id=gen_session.id,
            ideas_data=ideas_dicts,
        )

        # Update status to completed
        await idea_store.update_session_status(
            session=session,
            session_id=gen_session.id,
            status=GenerationStatus.COMPLETED,
        )

        # Reload session with ideas
        gen_session = await idea_store.get_session(session, gen_session.id)

        return gen_session

    except asyncio.TimeoutError as e:
        logger.error(f"AI generation timeout: {e}")
        await idea_store.update_session_status(
            session=session,
            session_id=gen_session.id,
            status=GenerationStatus.FAILED,
            error_message="Generation timed out. Please try again.",
        )
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Idea generation timed out. The AI service took too long to respond. Please try again.",
        )
    except APITimeoutError as e:
        logger.error(f"OpenAI API timeout: {e}")
        await idea_store.update_session_status(
            session=session,
            session_id=gen_session.id,
            status=GenerationStatus.FAILED,
            error_message="AI service timed out. Please try again.",
        )
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="The AI service timed out. Please try again in a moment.",
        )
    except (APIConnectionError, RateLimitError) as e:
        logger.error(f"OpenAI API unavailable: {e}")
        await idea_store.update_session_status(
            session=session,
            session_id=gen_session.id,
            status=GenerationStatus.FAILED,
            error_message="AI service temporarily unavailable.",
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The AI service is temporarily unavailable. Please try again later.",
        )
    except ValueError as e:
        # Invalid response from LLM (e.g., JSON parse error)
        logger.error(f"Invalid AI response: {e}")
        await idea_store.update_session_status(
            session=session,
            session_id=gen_session.id,
            status=GenerationStatus.FAILED,
            error_message="Invalid response from AI. Please try again.",
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Received an invalid response from the AI service. Please try again.",
        )
    except Exception as e:
        logger.error(f"Failed to generate ideas: {e}")
        await idea_store.update_session_status(
            session=session,
            session_id=gen_session.id,
            status=GenerationStatus.FAILED,
            error_message=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while generating ideas. Please try again.",
        )


@router.get("/sessions", response_model=GenerationSessionListResponse)
async def list_sessions(
    session: DbSession,
    user: CurrentUser,
    limit: int = 20,
    offset: int = 0,
):
    """List user's generation sessions."""
    sessions, total = await idea_store.get_user_sessions(
        session=session,
        user_id=user.id,
        limit=limit,
        offset=offset,
    )

    return GenerationSessionListResponse(items=sessions, total=total)


@router.get("/sessions/{session_id}", response_model=GenerationSessionResponse)
async def get_session(
    session_id: str,
    session: DbSession,
    user: CurrentUser,
):
    """Get a specific generation session with its ideas."""
    gen_session = await idea_store.get_session(session, session_id)

    if not gen_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    # Verify ownership
    if gen_session.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    return gen_session


@router.get("/problem/{problem_id}/latest", response_model=GenerationSessionResponse)
async def get_latest_session_for_problem(
    problem_id: str,
    session: DbSession,
    user: CurrentUser,
):
    """Get the latest generation session for a specific problem."""
    gen_session = await idea_store.get_latest_session_for_problem(
        session=session,
        user_id=user.id,
        problem_id=problem_id,
    )

    if not gen_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No session found for this problem",
        )

    return gen_session


@router.post("/{idea_id}/save", response_model=SavedIdeaResponse)
async def save_idea(
    idea_id: str,
    request: SaveIdeaRequest,
    session: DbSession,
    user: CurrentUser,
):
    """Save an idea to user's collection."""
    # Check if idea exists
    idea = await idea_store.get_idea(session, idea_id)
    if not idea:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Idea not found",
        )

    # Check if already saved
    existing = await idea_store.get_saved_idea_by_idea_id(
        session=session,
        user_id=user.id,
        idea_id=idea_id,
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Idea already saved",
        )

    # Save the idea
    saved_idea = await idea_store.save_idea(
        session=session,
        user_id=user.id,
        idea_id=idea_id,
        notes=request.notes,
    )

    # Get problem info for response
    gen_session = await idea_store.get_session(session, idea.session_id)
    problem = await idea_store.get_problem(session, gen_session.problem_id)

    return SavedIdeaResponse(
        id=saved_idea.id,
        idea=IdeaResponse(
            id=idea.id,
            title=idea.title,
            description=idea.description,
            target_audience=idea.target_audience,
            differentiators=idea.differentiators,
            market_opportunity=idea.market_opportunity,
            implementation_hints=idea.implementation_hints,
            market_signals=idea.market_signals,
            confidence_score=idea.confidence_score,
            is_bookmarked=idea.is_bookmarked,
            created_at=idea.created_at,
        ),
        problem_id=gen_session.problem_id,
        problem_title=problem.title if problem else "Unknown Problem",
        notes=saved_idea.notes,
        saved_at=saved_idea.saved_at,
    )


@router.delete("/saved/{saved_id}")
async def unsave_idea(
    saved_id: str,
    session: DbSession,
    user: CurrentUser,
):
    """Remove an idea from user's saved collection."""
    deleted = await idea_store.unsave_idea(
        session=session,
        saved_id=saved_id,
        user_id=user.id,
    )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Saved idea not found",
        )

    return {"message": "Idea removed from saved collection"}


@router.get("/saved", response_model=SavedIdeaListResponse)
async def list_saved_ideas(
    session: DbSession,
    user: CurrentUser,
    limit: int = 50,
    offset: int = 0,
):
    """List user's saved ideas."""
    saved_ideas, total = await idea_store.get_saved_ideas(
        session=session,
        user_id=user.id,
        limit=limit,
        offset=offset,
    )

    # Build response with problem context
    items = []
    for saved in saved_ideas:
        idea = saved.idea
        gen_session = idea.session
        problem = await idea_store.get_problem(session, gen_session.problem_id)

        items.append(
            SavedIdeaResponse(
                id=saved.id,
                idea=IdeaResponse(
                    id=idea.id,
                    title=idea.title,
                    description=idea.description,
                    target_audience=idea.target_audience,
                    differentiators=idea.differentiators,
                    market_opportunity=idea.market_opportunity,
                    implementation_hints=idea.implementation_hints,
                    market_signals=idea.market_signals,
                    confidence_score=idea.confidence_score,
                    is_bookmarked=idea.is_bookmarked,
                    created_at=idea.created_at,
                ),
                problem_id=gen_session.problem_id,
                problem_title=problem.title if problem else "Unknown Problem",
                notes=saved.notes,
                saved_at=saved.saved_at,
            )
        )

    return SavedIdeaListResponse(items=items, total=total)


@router.get("/{idea_id}/saved-status")
async def check_saved_status(
    idea_id: str,
    session: DbSession,
    user: CurrentUser,
):
    """Check if an idea is saved by the current user."""
    saved = await idea_store.get_saved_idea_by_idea_id(
        session=session,
        user_id=user.id,
        idea_id=idea_id,
    )

    return {
        "is_saved": saved is not None,
        "saved_id": saved.id if saved else None,
    }


# ============================================================================
# Bookmark Endpoints
# ============================================================================


@router.patch("/{idea_id}/bookmark", response_model=BookmarkResponse)
async def toggle_bookmark(
    idea_id: str,
    request: BookmarkRequest,
    session: DbSession,
    user: CurrentUser,
):
    """Toggle bookmark status for an idea.

    User must own the idea (via session ownership).
    """
    idea = await idea_store.toggle_bookmark(
        session=session,
        idea_id=idea_id,
        user_id=user.id,
        is_bookmarked=request.is_bookmarked,
    )

    if not idea:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Idea not found or access denied",
        )

    return BookmarkResponse(
        idea_id=idea.id,
        is_bookmarked=idea.is_bookmarked,
    )


@router.get("/bookmarked", response_model=BookmarkedIdeasListResponse)
async def list_bookmarked_ideas(
    session: DbSession,
    user: CurrentUser,
    limit: int = 50,
    offset: int = 0,
):
    """List user's bookmarked ideas with problem context."""
    ideas, total = await idea_store.get_bookmarked_ideas(
        session=session,
        user_id=user.id,
        limit=limit,
        offset=offset,
    )

    # Build response with problem context
    items = []
    for idea in ideas:
        gen_session = idea.session
        problem = await idea_store.get_problem(session, gen_session.problem_id)

        items.append(
            IdeaWithContextResponse(
                id=idea.id,
                title=idea.title,
                description=idea.description,
                target_audience=idea.target_audience,
                differentiators=idea.differentiators,
                market_opportunity=idea.market_opportunity,
                implementation_hints=idea.implementation_hints,
                market_signals=idea.market_signals,
                confidence_score=idea.confidence_score,
                is_bookmarked=idea.is_bookmarked,
                created_at=idea.created_at,
                problem_id=gen_session.problem_id,
                problem_title=problem.title if problem else "Unknown Problem",
            )
        )

    return BookmarkedIdeasListResponse(items=items, total=total)


# ============================================================================
# My Ideas Endpoints (All Generated Ideas)
# ============================================================================


@router.get("/my-ideas", response_model=MyIdeasListResponse)
async def list_my_ideas(
    session: DbSession,
    user: CurrentUser,
    bookmarked_only: bool = False,
    limit: int = 50,
    offset: int = 0,
):
    """List all user's generated ideas (My Ideas page).

    Returns all ideas from all generation sessions, excluding soft-deleted ones.
    Supports filtering by bookmark status.
    """
    ideas, total = await idea_store.get_all_user_ideas(
        session=session,
        user_id=user.id,
        include_deleted=False,
        bookmarked_only=bookmarked_only,
        limit=limit,
        offset=offset,
    )

    # Build response with problem context
    items = []
    for idea in ideas:
        gen_session = idea.session
        problem = await idea_store.get_problem(session, gen_session.problem_id)

        items.append(
            IdeaWithContextResponse(
                id=idea.id,
                title=idea.title,
                description=idea.description,
                target_audience=idea.target_audience,
                differentiators=idea.differentiators,
                market_opportunity=idea.market_opportunity,
                implementation_hints=idea.implementation_hints,
                market_signals=idea.market_signals,
                confidence_score=idea.confidence_score,
                is_bookmarked=idea.is_bookmarked,
                is_deleted=idea.is_deleted,
                created_at=idea.created_at,
                problem_id=gen_session.problem_id,
                problem_title=problem.title if problem else "Unknown Problem",
            )
        )

    return MyIdeasListResponse(items=items, total=total)


@router.delete("/{idea_id}", response_model=SoftDeleteResponse)
async def delete_idea(
    idea_id: str,
    session: DbSession,
    user: CurrentUser,
):
    """Soft delete an idea (remove from My Ideas).

    The idea is not permanently deleted, just hidden from the list.
    Can be restored later if needed.
    """
    idea = await idea_store.soft_delete_idea(
        session=session,
        idea_id=idea_id,
        user_id=user.id,
    )

    if not idea:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Idea not found or access denied",
        )

    return SoftDeleteResponse(
        idea_id=idea.id,
        is_deleted=True,
        message="Idea removed from My Ideas",
    )


@router.post("/{idea_id}/restore", response_model=SoftDeleteResponse)
async def restore_idea(
    idea_id: str,
    session: DbSession,
    user: CurrentUser,
):
    """Restore a soft-deleted idea.

    Returns the idea back to My Ideas list.
    """
    idea = await idea_store.restore_idea(
        session=session,
        idea_id=idea_id,
        user_id=user.id,
    )

    if not idea:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Idea not found or access denied",
        )

    return SoftDeleteResponse(
        idea_id=idea.id,
        is_deleted=False,
        message="Idea restored to My Ideas",
    )

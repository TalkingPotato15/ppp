"""Stage B Ideas API endpoints."""

from fastapi import APIRouter, HTTPException, status

from src.api.dependencies import DbSession, CurrentUser
from src.models import GenerationStatus
from src.schemas.ideas import (
    GenerateIdeasRequest,
    SaveIdeaRequest,
    IdeaResponse,
    GenerationSessionResponse,
    GenerationSessionListResponse,
    SavedIdeaResponse,
    SavedIdeaListResponse,
)
from src.storage import idea_store
from src.services.ai_agent import ai_agent


router = APIRouter()


@router.post("/generate", response_model=GenerationSessionResponse)
async def generate_ideas(
    request: GenerateIdeasRequest,
    session: DbSession,
    user: CurrentUser,
):
    """Generate business ideas for a problem.

    Creates a new generation session and uses the AI agent to generate ideas.
    """
    # Get the problem details
    problem = await idea_store.get_problem(session, request.problem_id)
    if not problem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Problem not found",
        )

    # Create generation session
    gen_session = await idea_store.create_session(
        session=session,
        user_id=user.id,
        problem_id=request.problem_id,
        feedback=request.feedback,
    )

    # Update status to generating
    await idea_store.update_session_status(
        session=session,
        session_id=gen_session.id,
        status=GenerationStatus.GENERATING,
    )

    try:
        # Generate ideas using AI agent
        ideas_data = await ai_agent.generate_ideas(
            problem_title=problem.title,
            keywords=problem.keywords or [],
            domain=problem.domain_tag or "general",
            trend=problem.trend.value if problem.trend else "STABLE",
            sentiment=problem.sentiment.value if problem.sentiment else "NEUTRAL",
            feedback=request.feedback,
        )

        # Convert to dict format for storage
        ideas_dicts = [
            {
                "title": idea.title,
                "description": idea.description,
                "target_audience": idea.target_audience,
                "differentiators": idea.differentiators,
                "market_opportunity": idea.market_opportunity,
                "implementation_hints": idea.implementation_hints,
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

    except Exception as e:
        # Update status to failed
        await idea_store.update_session_status(
            session=session,
            session_id=gen_session.id,
            status=GenerationStatus.FAILED,
            error_message=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate ideas: {str(e)}",
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

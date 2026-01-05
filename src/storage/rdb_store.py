"""Relational database store using Supabase."""

import os
import logging
from contextlib import asynccontextmanager
from typing import Optional
from supabase import create_client, Client

from src.models import JobStatus, RelationshipType
from src.models.raw_post import RawPost
from src.models.document import ProcessedDocument
from src.models.job import CollectionJob

logger = logging.getLogger(__name__)

# Supabase client (initialized lazily)
_supabase_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """Get or create Supabase client."""
    global _supabase_client
    if _supabase_client is None:
        url = (
            os.getenv("SUPABASE_URL") or
            os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        )
        key = (
            os.getenv("SUPABASE_SERVICE_KEY") or
            os.getenv("SUPABASE_SERVICE_ROLE_KEY") or
            os.getenv("SUPABASE_ANON_KEY")
        )

        if not url or not key:
            raise ValueError(
                "Supabase credentials not found. "
                "Set SUPABASE_URL and SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY) environment variables."
            )

        _supabase_client = create_client(url, key)
    return _supabase_client


class SupabaseSession:
    """Simple session wrapper for Supabase operations."""

    def __init__(self):
        self.client = get_supabase_client()


@asynccontextmanager
async def get_session():
    """Get a database session context manager."""
    session = SupabaseSession()
    try:
        yield session
    finally:
        pass  # Supabase client doesn't need explicit cleanup


# ============================================================================
# Raw Posts Operations
# ============================================================================

async def save_raw_posts(session: SupabaseSession, raw_posts: list[RawPost]) -> list[RawPost]:
    """Save raw posts to database.

    Args:
        session: Database session.
        raw_posts: List of raw posts to save.

    Returns:
        List of saved raw posts.
    """
    if not raw_posts:
        return []

    data = [post.to_dict() for post in raw_posts]

    try:
        result = session.client.table("raw_posts").upsert(data).execute()
        logger.info(f"Saved {len(result.data)} raw posts")
        return raw_posts
    except Exception as e:
        logger.error(f"Error saving raw posts: {e}")
        raise


async def get_raw_post_urls(session: SupabaseSession) -> set[str]:
    """Get all existing raw post URLs for deduplication.

    Args:
        session: Database session.

    Returns:
        Set of existing source URLs.
    """
    try:
        result = session.client.table("raw_posts").select("source_url").execute()
        return {row["source_url"] for row in result.data}
    except Exception as e:
        logger.error(f"Error getting raw post URLs: {e}")
        return set()


# ============================================================================
# Document Summaries Operations
# ============================================================================

async def save_summaries(session: SupabaseSession, documents: list[ProcessedDocument]) -> list[ProcessedDocument]:
    """Save processed documents as summaries.

    Args:
        session: Database session.
        documents: List of processed documents to save.

    Returns:
        List of saved documents.
    """
    if not documents:
        return []

    data = [doc.to_summary_dict() for doc in documents]

    try:
        result = session.client.table("document_summaries").upsert(data).execute()
        logger.info(f"Saved {len(result.data)} document summaries")
        return documents
    except Exception as e:
        logger.error(f"Error saving summaries: {e}")
        raise


async def get_summaries(
    session: SupabaseSession,
    limit: int = 100,
    offset: int = 0,
) -> list[ProcessedDocument]:
    """Get document summaries with pagination.

    Args:
        session: Database session.
        limit: Maximum number of results.
        offset: Number of results to skip.

    Returns:
        List of document summaries.
    """
    try:
        result = (
            session.client.table("document_summaries")
            .select("*")
            .range(offset, offset + limit - 1)
            .execute()
        )
        return [ProcessedDocument.from_dict(row) for row in result.data]
    except Exception as e:
        logger.error(f"Error getting summaries: {e}")
        return []


# ============================================================================
# Collection Jobs Operations
# ============================================================================

async def save_job(session: SupabaseSession, job: CollectionJob) -> CollectionJob:
    """Save a collection job.

    Args:
        session: Database session.
        job: Collection job to save.

    Returns:
        Saved collection job.
    """
    try:
        result = session.client.table("collection_jobs").insert(job.to_dict()).execute()
        logger.info(f"Saved collection job: {job.id}")
        return job
    except Exception as e:
        logger.error(f"Error saving job: {e}")
        raise


async def get_job_by_id(session: SupabaseSession, job_id: str) -> Optional[CollectionJob]:
    """Get a collection job by ID.

    Args:
        session: Database session.
        job_id: Job ID to look up.

    Returns:
        CollectionJob or None if not found.
    """
    try:
        result = (
            session.client.table("collection_jobs")
            .select("*")
            .eq("id", job_id)
            .single()
            .execute()
        )
        return CollectionJob.from_dict(result.data) if result.data else None
    except Exception as e:
        logger.error(f"Error getting job {job_id}: {e}")
        return None


async def update_job(session: SupabaseSession, job: CollectionJob) -> CollectionJob:
    """Update a collection job.

    Args:
        session: Database session.
        job: Collection job with updated values.

    Returns:
        Updated collection job.
    """
    try:
        result = (
            session.client.table("collection_jobs")
            .update(job.to_dict())
            .eq("id", job.id)
            .execute()
        )
        logger.info(f"Updated collection job: {job.id}")
        return job
    except Exception as e:
        logger.error(f"Error updating job {job.id}: {e}")
        raise


async def get_recent_jobs(session: SupabaseSession, limit: int = 100) -> list[CollectionJob]:
    """Get recent collection jobs.

    Args:
        session: Database session.
        limit: Maximum number of results.

    Returns:
        List of recent collection jobs.
    """
    try:
        result = (
            session.client.table("collection_jobs")
            .select("*")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return [CollectionJob.from_dict(row) for row in result.data]
    except Exception as e:
        logger.error(f"Error getting recent jobs: {e}")
        return []


# ============================================================================
# Document Relationships Operations
# ============================================================================

async def relationship_exists(
    session: SupabaseSession,
    source_id: str,
    target_id: str,
) -> bool:
    """Check if a relationship exists between two documents.

    Args:
        session: Database session.
        source_id: Source document ID.
        target_id: Target document ID.

    Returns:
        True if relationship exists.
    """
    try:
        result = (
            session.client.table("document_relationships")
            .select("id")
            .eq("source_document_id", source_id)
            .eq("target_document_id", target_id)
            .execute()
        )
        return len(result.data) > 0
    except Exception as e:
        logger.error(f"Error checking relationship: {e}")
        return False


async def save_relationships(
    session: SupabaseSession,
    relationships: list[tuple[str, str, float, RelationshipType]],
) -> int:
    """Save document relationships.

    Args:
        session: Database session.
        relationships: List of (source_id, target_id, score, type) tuples.

    Returns:
        Number of relationships saved.
    """
    if not relationships:
        return 0

    data = [
        {
            "source_document_id": source_id,
            "target_document_id": target_id,
            "similarity_score": score,
            "relationship_type": rel_type.value,
        }
        for source_id, target_id, score, rel_type in relationships
    ]

    try:
        result = session.client.table("document_relationships").insert(data).execute()
        logger.info(f"Saved {len(result.data)} relationships")
        return len(result.data)
    except Exception as e:
        logger.error(f"Error saving relationships: {e}")
        return 0

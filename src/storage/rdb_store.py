"""RDB storage operations for document summaries and raw posts."""

import logging
from datetime import datetime
from typing import Literal, Optional
from zoneinfo import ZoneInfo

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import RelationshipType, Sentiment, Trend
from src.models.summary import DocumentSummary
from src.models.raw_post import RawPost
from src.models.job import CollectionJob
from src.models.document import ProcessedDocument
from src.models.relationship import DocumentRelationship

logger = logging.getLogger(__name__)

# Timezone for Korea
KST = ZoneInfo("Asia/Seoul")


# ============================================================================
# DocumentSummary Operations (T032-T036)
# ============================================================================


async def save_summary(session: AsyncSession, document: ProcessedDocument) -> DocumentSummary:
    """Save a document summary to the database.

    Args:
        session: Database session.
        document: ProcessedDocument to create summary from.

    Returns:
        The saved DocumentSummary.
    """
    summary = DocumentSummary(
        id=document.id,
        source_url=document.source_url,
        title=document.title,
        keywords=document.keywords,
        domain_tag=document.domain_tag,
        trend=document.trend if isinstance(document.trend, Trend) else Trend(document.trend),
        sentiment=document.sentiment if isinstance(document.sentiment, Sentiment) else Sentiment(document.sentiment),
        posted_at=document.posted_at,
        created_at=datetime.now(KST),
    )

    session.add(summary)
    await session.flush()

    logger.info(f"Saved document summary: {summary.id}")
    return summary


async def save_summaries(
    session: AsyncSession, documents: list[ProcessedDocument]
) -> list[DocumentSummary]:
    """Save multiple document summaries to the database.

    Args:
        session: Database session.
        documents: List of ProcessedDocuments to create summaries from.

    Returns:
        List of saved DocumentSummary objects.
    """
    summaries = []
    for doc in documents:
        summary = DocumentSummary(
            id=doc.id,
            source_url=doc.source_url,
            title=doc.title,
            keywords=doc.keywords,
            domain_tag=doc.domain_tag,
            trend=doc.trend if isinstance(doc.trend, Trend) else Trend(doc.trend),
            sentiment=doc.sentiment if isinstance(doc.sentiment, Sentiment) else Sentiment(doc.sentiment),
            posted_at=doc.posted_at,
            created_at=datetime.now(KST),
        )
        summaries.append(summary)
        session.add(summary)

    await session.flush()

    logger.info(f"Saved {len(summaries)} document summaries")
    return summaries


async def get_summaries(
    session: AsyncSession,
    domain: Optional[str] = None,
    keywords: Optional[list[str]] = None,
    trend: Optional[Trend] = None,
    sentiment: Optional[Sentiment] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    sort_by: Literal["recent", "oldest"] = "recent",
    limit: int = 20,
    offset: int = 0,
) -> list[DocumentSummary]:
    """Get document summaries with filtering, sorting, and pagination.

    Args:
        session: Database session.
        domain: Filter by domain_tag.
        keywords: Filter by any matching keyword.
        trend: Filter by trend.
        sentiment: Filter by sentiment.
        from_date: Filter posts from this date.
        to_date: Filter posts until this date.
        sort_by: Sort order - "recent" (newest first) or "oldest" (oldest first).
        limit: Maximum number of results.
        offset: Number of results to skip.

    Returns:
        List of DocumentSummary matching the filters.
    """
    stmt = select(DocumentSummary)

    # Apply filters
    if domain:
        stmt = stmt.where(DocumentSummary.domain_tag == domain)

    if trend:
        stmt = stmt.where(DocumentSummary.trend == trend)

    if sentiment:
        stmt = stmt.where(DocumentSummary.sentiment == sentiment)

    if from_date:
        stmt = stmt.where(DocumentSummary.posted_at >= from_date)

    if to_date:
        stmt = stmt.where(DocumentSummary.posted_at <= to_date)

    # Keyword filtering (check if any keyword matches)
    # Note: SQLite JSON support - using LIKE for simplicity
    if keywords:
        keyword_conditions = []
        for kw in keywords:
            # Check if keyword exists in JSON array (SQLite compatible)
            keyword_conditions.append(
                func.json_extract(DocumentSummary.keywords, "$").like(f'%"{kw}"%')
            )
        stmt = stmt.where(or_(*keyword_conditions))

    # Apply sorting
    if sort_by == "recent":
        stmt = stmt.order_by(DocumentSummary.posted_at.desc())
    else:
        stmt = stmt.order_by(DocumentSummary.posted_at.asc())

    # Apply pagination
    stmt = stmt.limit(limit).offset(offset)

    result = await session.execute(stmt)
    summaries = list(result.scalars().all())

    logger.debug(
        f"Retrieved {len(summaries)} summaries (domain={domain}, trend={trend}, "
        f"sentiment={sentiment}, limit={limit}, offset={offset})"
    )

    return summaries


async def get_summary_by_id(
    session: AsyncSession, summary_id: str
) -> Optional[DocumentSummary]:
    """Get a document summary by ID.

    Args:
        session: Database session.
        summary_id: The summary ID.

    Returns:
        DocumentSummary if found, None otherwise.
    """
    stmt = select(DocumentSummary).where(DocumentSummary.id == summary_id)
    result = await session.execute(stmt)
    summary = result.scalar_one_or_none()

    if summary:
        logger.debug(f"Retrieved summary: {summary_id}")
    else:
        logger.debug(f"Summary not found: {summary_id}")

    return summary


async def get_summary_by_url(
    session: AsyncSession, source_url: str
) -> Optional[DocumentSummary]:
    """Get a document summary by source URL.

    Args:
        session: Database session.
        source_url: The source URL.

    Returns:
        DocumentSummary if found, None otherwise.
    """
    stmt = select(DocumentSummary).where(DocumentSummary.source_url == source_url)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_summary_count(
    session: AsyncSession,
    domain: Optional[str] = None,
    trend: Optional[Trend] = None,
    sentiment: Optional[Sentiment] = None,
) -> int:
    """Get total count of summaries with optional filters.

    Args:
        session: Database session.
        domain: Filter by domain_tag.
        trend: Filter by trend.
        sentiment: Filter by sentiment.

    Returns:
        Total count of matching summaries.
    """
    stmt = select(func.count(DocumentSummary.id))

    if domain:
        stmt = stmt.where(DocumentSummary.domain_tag == domain)
    if trend:
        stmt = stmt.where(DocumentSummary.trend == trend)
    if sentiment:
        stmt = stmt.where(DocumentSummary.sentiment == sentiment)

    result = await session.execute(stmt)
    count = result.scalar() or 0

    logger.debug(f"Summary count: {count}")
    return count


# ============================================================================
# RawPost Operations (for US1)
# ============================================================================


async def save_raw_post(session: AsyncSession, raw_post: RawPost) -> RawPost:
    """Save a raw post to the database.

    Args:
        session: Database session.
        raw_post: The raw post to save.

    Returns:
        The saved RawPost.
    """
    session.add(raw_post)
    await session.flush()

    logger.debug(f"Saved raw post: {raw_post.id}")
    return raw_post


async def save_raw_posts(
    session: AsyncSession, raw_posts: list[RawPost]
) -> list[RawPost]:
    """Save multiple raw posts to the database.

    Args:
        session: Database session.
        raw_posts: List of raw posts to save.

    Returns:
        List of saved RawPosts.
    """
    for post in raw_posts:
        session.add(post)

    await session.flush()

    logger.info(f"Saved {len(raw_posts)} raw posts")
    return raw_posts


async def get_raw_posts_by_job(
    session: AsyncSession, job_id: str
) -> list[RawPost]:
    """Get all raw posts for a collection job.

    Args:
        session: Database session.
        job_id: The collection job ID.

    Returns:
        List of RawPosts for the job.
    """
    stmt = select(RawPost).where(RawPost.collection_job_id == job_id)
    result = await session.execute(stmt)
    return list(result.scalars().all())


# ============================================================================
# CollectionJob Operations (for US1)
# ============================================================================


async def save_job(session: AsyncSession, job: CollectionJob) -> CollectionJob:
    """Save a collection job to the database.

    Args:
        session: Database session.
        job: The collection job to save.

    Returns:
        The saved CollectionJob.
    """
    session.add(job)
    await session.flush()

    logger.info(f"Saved collection job: {job.id} ({job.job_type})")
    return job


async def update_job(session: AsyncSession, job: CollectionJob) -> CollectionJob:
    """Update a collection job in the database.

    Args:
        session: Database session.
        job: The collection job to update.

    Returns:
        The updated CollectionJob.
    """
    await session.flush()

    logger.info(f"Updated collection job: {job.id} (status={job.status})")
    return job


async def get_job_by_id(
    session: AsyncSession, job_id: str
) -> Optional[CollectionJob]:
    """Get a collection job by ID.

    Args:
        session: Database session.
        job_id: The job ID.

    Returns:
        CollectionJob if found, None otherwise.
    """
    stmt = select(CollectionJob).where(CollectionJob.id == job_id)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_recent_jobs(
    session: AsyncSession, limit: int = 10
) -> list[CollectionJob]:
    """Get recent collection jobs.

    Args:
        session: Database session.
        limit: Maximum number of jobs to return.

    Returns:
        List of recent CollectionJobs.
    """
    stmt = (
        select(CollectionJob)
        .order_by(CollectionJob.created_at.desc())
        .limit(limit)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


# ============================================================================
# DocumentRelationship Operations (for US6)
# ============================================================================


async def save_relationship(
    session: AsyncSession,
    source_id: str,
    target_id: str,
    similarity_score: float,
    relationship_type: RelationshipType = RelationshipType.SIMILAR_TOPIC,
) -> DocumentRelationship:
    """Save a document relationship.

    Args:
        session: Database session.
        source_id: Source document ID.
        target_id: Target document ID.
        similarity_score: Similarity score between documents.
        relationship_type: Type of relationship.

    Returns:
        The saved DocumentRelationship.
    """
    relationship = DocumentRelationship(
        source_document_id=source_id,
        target_document_id=target_id,
        similarity_score=similarity_score,
        relationship_type=relationship_type,
    )
    session.add(relationship)
    await session.flush()

    logger.debug(f"Saved relationship: {source_id[:8]} -> {target_id[:8]} ({similarity_score:.2f})")
    return relationship


async def save_relationships(
    session: AsyncSession,
    relationships: list[tuple[str, str, float, RelationshipType]],
) -> list[DocumentRelationship]:
    """Save multiple document relationships.

    Args:
        session: Database session.
        relationships: List of (source_id, target_id, score, type) tuples.

    Returns:
        List of saved DocumentRelationships.
    """
    saved = []
    for source_id, target_id, score, rel_type in relationships:
        rel = DocumentRelationship(
            source_document_id=source_id,
            target_document_id=target_id,
            similarity_score=score,
            relationship_type=rel_type,
        )
        session.add(rel)
        saved.append(rel)

    await session.flush()

    logger.info(f"Saved {len(saved)} document relationships")
    return saved


async def get_related_documents(
    session: AsyncSession,
    document_id: str,
    relationship_type: Optional[RelationshipType] = None,
    min_score: Optional[float] = None,
    limit: int = 10,
) -> list[tuple[DocumentSummary, float]]:
    """Get documents related to a given document.

    Args:
        session: Database session.
        document_id: The source document ID.
        relationship_type: Filter by relationship type.
        min_score: Minimum similarity score.
        limit: Maximum number of results.

    Returns:
        List of (DocumentSummary, similarity_score) tuples.
    """
    # Query relationships where document is source
    stmt = (
        select(DocumentRelationship)
        .where(DocumentRelationship.source_document_id == document_id)
    )

    if relationship_type:
        stmt = stmt.where(DocumentRelationship.relationship_type == relationship_type)

    if min_score:
        stmt = stmt.where(DocumentRelationship.similarity_score >= min_score)

    stmt = stmt.order_by(DocumentRelationship.similarity_score.desc()).limit(limit)

    result = await session.execute(stmt)
    relationships = list(result.scalars().all())

    # Fetch related documents
    related = []
    for rel in relationships:
        summary = await get_summary_by_id(session, rel.target_document_id)
        if summary:
            related.append((summary, rel.similarity_score))

    logger.debug(f"Found {len(related)} related documents for {document_id[:8]}")
    return related


async def relationship_exists(
    session: AsyncSession,
    source_id: str,
    target_id: str,
) -> bool:
    """Check if a relationship already exists between two documents.

    Args:
        session: Database session.
        source_id: Source document ID.
        target_id: Target document ID.

    Returns:
        True if relationship exists.
    """
    stmt = (
        select(DocumentRelationship.id)
        .where(DocumentRelationship.source_document_id == source_id)
        .where(DocumentRelationship.target_document_id == target_id)
        .limit(1)
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none() is not None

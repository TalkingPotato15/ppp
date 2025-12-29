"""Pipeline orchestrator for data collection workflow."""

import logging
from datetime import datetime, timedelta
from typing import Optional
from uuid import uuid4

from src.agents.analyst.cleaner import clean_posts
from src.agents.analyst.embedder import generate_embedding, generate_embeddings
from src.agents.analyst.scraper import ForumScraper, ScrapedPost
from src.config.settings import settings
from src.models import JobStatus, JobType, RelationshipType
from src.models.document import ProcessedDocument
from src.models.job import CollectionJob
from src.models.raw_post import RawPost
from src.services.dedup import filter_new_urls
from src.storage import get_session
from src.storage import rdb_store
from src.storage import vector_store

logger = logging.getLogger(__name__)


class PipelineResult:
    """Result of a pipeline run."""

    def __init__(self):
        self.job_id: Optional[str] = None
        self.posts_collected: int = 0
        self.posts_processed: int = 0
        self.posts_filtered: int = 0
        self.errors: list[str] = []
        self.success: bool = True

    def __repr__(self) -> str:
        return (
            f"PipelineResult(job_id={self.job_id}, collected={self.posts_collected}, "
            f"processed={self.posts_processed}, filtered={self.posts_filtered}, "
            f"success={self.success})"
        )


async def _scrape_phase(
    scraper: ForumScraper,
    from_date: datetime,
    to_date: datetime,
    skip_urls: set[str],
    max_posts: Optional[int] = None,
) -> list[ScrapedPost]:
    """Scraping phase of the pipeline.

    Args:
        scraper: ForumScraper instance.
        from_date: Start date for scraping.
        to_date: End date for scraping.
        skip_urls: URLs to skip (already in database).
        max_posts: Maximum number of posts to scrape.

    Returns:
        List of scraped posts.
    """
    logger.info(f"Starting scrape phase: {from_date} to {to_date}")

    posts = await scraper.scrape_posts_from_list(
        list_url=settings.target_forum_url,
        from_date=from_date,
        to_date=to_date,
        max_posts=max_posts,
        skip_urls=skip_urls,
    )

    logger.info(f"Scrape phase complete: {len(posts)} posts collected")
    return posts


async def _save_raw_posts(
    scraped_posts: list[ScrapedPost], job_id: str
) -> list[RawPost]:
    """Save scraped posts as raw posts in database.

    Args:
        scraped_posts: List of scraped posts.
        job_id: Collection job ID.

    Returns:
        List of saved RawPost objects.
    """
    async with get_session() as session:
        raw_posts = []
        for sp in scraped_posts:
            raw_post = RawPost(
                id=str(uuid4()),
                source_url=sp.source_url,
                content=sp.content,
                author_hash=sp.author_hash,
                posted_at=sp.posted_at,
                scraped_at=sp.scraped_at,
                collection_job_id=job_id,
            )
            raw_posts.append(raw_post)

        saved = await rdb_store.save_raw_posts(session, raw_posts)
        logger.info(f"Saved {len(saved)} raw posts to database")
        return saved


async def _clean_phase(raw_posts: list[RawPost]) -> tuple[list[ProcessedDocument], int, int]:
    """Cleaning phase of the pipeline.

    Args:
        raw_posts: List of raw posts to clean.

    Returns:
        Tuple of (processed_documents, filtered_count, error_count).
    """
    logger.info(f"Starting clean phase: {len(raw_posts)} posts")

    processed, filtered, errors = await clean_posts(raw_posts)

    logger.info(
        f"Clean phase complete: {len(processed)} processed, "
        f"{filtered} filtered, {errors} errors"
    )
    return processed, filtered, errors


async def _embed_and_store_phase(documents: list[ProcessedDocument]) -> int:
    """Embedding and storage phase of the pipeline.

    Args:
        documents: List of processed documents to embed and store.

    Returns:
        Number of documents stored.
    """
    if not documents:
        return 0

    logger.info(f"Starting embed/store phase: {len(documents)} documents")

    # Generate embeddings for all documents
    contents = [doc.content for doc in documents]
    embeddings = await generate_embeddings(contents)

    # Store in vector database
    await vector_store.add_documents(documents, embeddings)

    # Store summaries in RDB
    async with get_session() as session:
        await rdb_store.save_summaries(session, documents)

    logger.info(f"Embed/store phase complete: {len(documents)} documents stored")
    return len(documents)


async def _create_job(
    job_type: JobType,
    target_start: datetime,
    target_end: datetime,
) -> CollectionJob:
    """Create a new collection job.

    Args:
        job_type: Type of job.
        target_start: Start of collection period.
        target_end: End of collection period.

    Returns:
        Created CollectionJob.
    """
    job = CollectionJob(
        id=str(uuid4()),
        job_type=job_type,
        status=JobStatus.PENDING,
        target_start=target_start,
        target_end=target_end,
    )

    async with get_session() as session:
        await rdb_store.save_job(session, job)

    logger.info(f"Created collection job: {job.id} ({job_type})")
    return job


async def _update_job_status(
    job_id: str,
    status: JobStatus,
    posts_collected: int = 0,
    posts_processed: int = 0,
    posts_filtered: int = 0,
    error_message: Optional[str] = None,
) -> None:
    """Update collection job status.

    Args:
        job_id: Job ID to update.
        status: New status.
        posts_collected: Number of posts collected.
        posts_processed: Number of posts processed.
        posts_filtered: Number of posts filtered.
        error_message: Error message if failed.
    """
    async with get_session() as session:
        job = await rdb_store.get_job_by_id(session, job_id)
        if not job:
            logger.error(f"Job not found: {job_id}")
            return

        job.status = status
        job.posts_collected = posts_collected
        job.posts_processed = posts_processed
        job.posts_filtered = posts_filtered

        if status == JobStatus.RUNNING and job.started_at is None:
            job.started_at = datetime.utcnow()

        if status in (JobStatus.COMPLETED, JobStatus.FAILED):
            job.completed_at = datetime.utcnow()

        if error_message:
            job.error_message = error_message

        await rdb_store.update_job(session, job)

    logger.info(f"Updated job {job_id}: status={status}")


async def _get_existing_urls() -> set[str]:
    """Get all URLs already in the database for deduplication.

    Returns:
        Set of existing URLs.
    """
    async with get_session() as session:
        from sqlalchemy import select
        from src.models.raw_post import RawPost

        stmt = select(RawPost.source_url)
        result = await session.execute(stmt)
        urls = set(row[0] for row in result.fetchall())

    logger.debug(f"Found {len(urls)} existing URLs in database")
    return urls


async def initial_load(months: int = 3, max_posts: Optional[int] = None) -> PipelineResult:
    """Perform initial bulk data load.

    Args:
        months: Number of months of historical data to collect.
        max_posts: Maximum number of posts to collect (for testing).

    Returns:
        PipelineResult with statistics.
    """
    result = PipelineResult()

    # Calculate date range
    to_date = datetime.utcnow()
    from_date = to_date - timedelta(days=months * 30)

    logger.info(f"Starting initial load: {months} months ({from_date} to {to_date})")

    # Create job
    job = await _create_job(JobType.INITIAL_LOAD, from_date, to_date)
    result.job_id = job.id

    try:
        # Update job status to running
        await _update_job_status(job.id, JobStatus.RUNNING)

        # Get existing URLs for deduplication
        skip_urls = await _get_existing_urls()

        # Phase 1: Scrape
        scraper = ForumScraper()
        try:
            scraped_posts = await _scrape_phase(
                scraper, from_date, to_date, skip_urls, max_posts
            )
            result.posts_collected = len(scraped_posts)
        finally:
            await scraper.close()

        if not scraped_posts:
            logger.info("No new posts to process")
            await _update_job_status(
                job.id, JobStatus.COMPLETED,
                posts_collected=0, posts_processed=0, posts_filtered=0
            )
            return result

        # Phase 2: Save raw posts
        raw_posts = await _save_raw_posts(scraped_posts, job.id)

        # Phase 3: Clean
        processed_docs, filtered_count, error_count = await _clean_phase(raw_posts)
        result.posts_filtered = filtered_count

        if error_count > 0:
            result.errors.append(f"{error_count} posts failed during cleaning")

        # Phase 4: Embed and store
        if processed_docs:
            stored_count = await _embed_and_store_phase(processed_docs)
            result.posts_processed = stored_count

        # Update job as completed
        await _update_job_status(
            job.id, JobStatus.COMPLETED,
            posts_collected=result.posts_collected,
            posts_processed=result.posts_processed,
            posts_filtered=result.posts_filtered
        )

        logger.info(f"Initial load complete: {result}")

    except Exception as e:
        logger.error(f"Initial load failed: {e}")
        result.success = False
        result.errors.append(str(e))

        await _update_job_status(
            job.id, JobStatus.FAILED,
            posts_collected=result.posts_collected,
            posts_processed=result.posts_processed,
            posts_filtered=result.posts_filtered,
            error_message=str(e)
        )

    return result


async def incremental_collect(hours: int = 1) -> PipelineResult:
    """Perform incremental data collection.

    Args:
        hours: Number of hours to look back.

    Returns:
        PipelineResult with statistics.
    """
    result = PipelineResult()

    # Calculate date range
    to_date = datetime.utcnow()
    from_date = to_date - timedelta(hours=hours)

    logger.info(f"Starting incremental collection: {hours} hours ({from_date} to {to_date})")

    # Create job
    job = await _create_job(JobType.INCREMENTAL, from_date, to_date)
    result.job_id = job.id

    try:
        await _update_job_status(job.id, JobStatus.RUNNING)

        # Get existing URLs for deduplication
        skip_urls = await _get_existing_urls()

        # Phase 1: Scrape
        scraper = ForumScraper()
        try:
            scraped_posts = await _scrape_phase(scraper, from_date, to_date, skip_urls)
            result.posts_collected = len(scraped_posts)
        finally:
            await scraper.close()

        if not scraped_posts:
            logger.info("No new posts in the last hour")
            await _update_job_status(
                job.id, JobStatus.COMPLETED,
                posts_collected=0, posts_processed=0, posts_filtered=0
            )
            return result

        # Phase 2: Save raw posts
        raw_posts = await _save_raw_posts(scraped_posts, job.id)

        # Phase 3: Clean
        processed_docs, filtered_count, error_count = await _clean_phase(raw_posts)
        result.posts_filtered = filtered_count

        if error_count > 0:
            result.errors.append(f"{error_count} posts failed during cleaning")

        # Phase 4: Embed and store
        if processed_docs:
            stored_count = await _embed_and_store_phase(processed_docs)
            result.posts_processed = stored_count

        await _update_job_status(
            job.id, JobStatus.COMPLETED,
            posts_collected=result.posts_collected,
            posts_processed=result.posts_processed,
            posts_filtered=result.posts_filtered
        )

        logger.info(f"Incremental collection complete: {result}")

    except Exception as e:
        logger.error(f"Incremental collection failed: {e}")
        result.success = False
        result.errors.append(str(e))

        await _update_job_status(
            job.id, JobStatus.FAILED,
            posts_collected=result.posts_collected,
            posts_processed=result.posts_processed,
            posts_filtered=result.posts_filtered,
            error_message=str(e)
        )

    return result


async def check_gaps() -> list[tuple[datetime, datetime]]:
    """Check for gaps in collection history.

    Returns:
        List of (start, end) tuples representing gaps.
    """
    async with get_session() as session:
        from sqlalchemy import select
        jobs = await rdb_store.get_recent_jobs(session, limit=100)

    if not jobs:
        return []

    # Sort jobs by target_start
    sorted_jobs = sorted(
        [j for j in jobs if j.status == JobStatus.COMPLETED],
        key=lambda j: j.target_start
    )

    gaps = []
    for i in range(1, len(sorted_jobs)):
        prev_end = sorted_jobs[i - 1].target_end
        curr_start = sorted_jobs[i].target_start

        # If there's a gap of more than 1 hour
        if (curr_start - prev_end).total_seconds() > 3600:
            gaps.append((prev_end, curr_start))

    logger.info(f"Found {len(gaps)} gaps in collection history")
    return gaps


async def recover_gaps() -> list[PipelineResult]:
    """Recover data for any gaps in collection history.

    Returns:
        List of PipelineResults for each gap recovered.
    """
    gaps = await check_gaps()
    results = []

    for gap_start, gap_end in gaps:
        hours = int((gap_end - gap_start).total_seconds() / 3600) + 1
        logger.info(f"Recovering gap: {gap_start} to {gap_end} ({hours} hours)")

        # Run incremental collection for the gap period
        result = await incremental_collect(hours=hours)
        results.append(result)

    return results


# ============================================================================
# Document Relationship Detection (US6)
# ============================================================================


async def find_similar_documents(
    document: ProcessedDocument,
    threshold: Optional[float] = None,
    max_results: Optional[int] = None,
) -> list[tuple[str, float]]:
    """Find documents similar to the given document using vector similarity.

    Args:
        document: The document to find similar documents for.
        threshold: Minimum similarity score (default from settings).
        max_results: Maximum number of results (default from settings).

    Returns:
        List of (document_id, similarity_score) tuples.
    """
    threshold = threshold or settings.similarity_threshold
    max_results = max_results or settings.max_similar_documents

    # Generate embedding for the document
    embedding = await generate_embedding(document.content)

    # Search vector store for similar documents
    # ChromaDB returns distance, we need to convert to similarity
    results = await vector_store.search_similar(
        query_embedding=embedding,
        n_results=max_results + 1,  # +1 to account for self-match
    )

    similar = []
    for result in results:
        doc_id = result["id"]
        distance = result["distance"]

        # Skip self-match
        if doc_id == document.id:
            continue

        # Convert distance to similarity score (1 - distance for cosine)
        # ChromaDB uses L2 distance by default, adjust as needed
        similarity = 1.0 / (1.0 + distance) if distance is not None else 0.0

        if similarity >= threshold:
            similar.append((doc_id, similarity))

    # Sort by similarity descending and limit
    similar.sort(key=lambda x: x[1], reverse=True)
    similar = similar[:max_results]

    logger.debug(f"Found {len(similar)} similar documents for {document.id[:8]}")
    return similar


async def detect_and_store_relationships(
    documents: list[ProcessedDocument],
) -> int:
    """Detect and store relationships for a list of documents.

    Args:
        documents: List of documents to process.

    Returns:
        Number of relationships created.
    """
    if not documents:
        return 0

    logger.info(f"Detecting relationships for {len(documents)} documents")

    total_relationships = 0

    async with get_session() as session:
        for document in documents:
            try:
                # Find similar documents
                similar = await find_similar_documents(document)

                if not similar:
                    continue

                # Prepare relationships to save
                relationships_to_save = []
                for target_id, score in similar:
                    # Check if relationship already exists
                    exists = await rdb_store.relationship_exists(
                        session, document.id, target_id
                    )
                    if not exists:
                        relationships_to_save.append((
                            document.id,
                            target_id,
                            score,
                            RelationshipType.SIMILAR_TOPIC,
                        ))

                if relationships_to_save:
                    await rdb_store.save_relationships(session, relationships_to_save)
                    total_relationships += len(relationships_to_save)

            except Exception as e:
                logger.error(f"Error detecting relationships for {document.id}: {e}")
                continue

    logger.info(f"Created {total_relationships} document relationships")
    return total_relationships


async def process_relationships_for_existing_documents(
    batch_size: int = 100,
) -> int:
    """Process relationships for all existing documents.

    Args:
        batch_size: Number of documents to process at a time.

    Returns:
        Total number of relationships created.
    """
    logger.info("Processing relationships for existing documents")

    total = 0
    offset = 0

    async with get_session() as session:
        while True:
            # Get batch of summaries
            summaries = await rdb_store.get_summaries(
                session, limit=batch_size, offset=offset
            )

            if not summaries:
                break

            # Convert to ProcessedDocument for embedding
            for summary in summaries:
                # Get full document from vector store
                doc_data = await vector_store.get_document(summary.id)
                if not doc_data:
                    continue

                # Create ProcessedDocument from summary + content
                document = ProcessedDocument(
                    id=summary.id,
                    source_url=summary.source_url,
                    title=summary.title,
                    content=doc_data["content"],
                    keywords=summary.keywords,
                    domain_tag=summary.domain_tag,
                    trend=summary.trend,
                    sentiment=summary.sentiment,
                    content_hash="",  # Not needed for similarity
                    posted_at=summary.posted_at,
                )

                # Find and store relationships
                similar = await find_similar_documents(document)

                if similar:
                    relationships_to_save = []
                    for target_id, score in similar:
                        exists = await rdb_store.relationship_exists(
                            session, document.id, target_id
                        )
                        if not exists:
                            relationships_to_save.append((
                                document.id,
                                target_id,
                                score,
                                RelationshipType.SIMILAR_TOPIC,
                            ))

                    if relationships_to_save:
                        await rdb_store.save_relationships(session, relationships_to_save)
                        total += len(relationships_to_save)

            offset += batch_size
            logger.info(f"Processed {offset} documents, {total} relationships created")

    logger.info(f"Relationship processing complete: {total} relationships created")
    return total

"""Content cleaner for filtering noise and extracting metadata."""

import logging
from datetime import datetime
from typing import Optional

from src.models import Sentiment, Trend
from src.models.document import ProcessedDocument
from src.models.raw_post import RawPost
from src.services.dedup import generate_content_hash
from src.services.llm_service import classify_content

logger = logging.getLogger(__name__)

# Default domain tag for real estate forum
DEFAULT_DOMAIN_TAG = "real_estate"


async def clean_post(raw_post: RawPost) -> Optional[ProcessedDocument]:
    """Clean a raw post and transform to ProcessedDocument if valid.

    Args:
        raw_post: The raw scraped post to clean.

    Returns:
        ProcessedDocument if the content is valid, None if it's noise.
    """
    logger.debug(f"Processing post: {raw_post.source_url}")

    # Classify content using LLM
    classification = await classify_content(raw_post.content)

    # Check if content is noise
    if classification.get("is_noise", True):
        noise_reason = classification.get("noise_reason", "Unknown")
        logger.info(f"Filtered noise post: {raw_post.source_url} - Reason: {noise_reason}")
        return None

    # Extract metadata from classification
    title = classification.get("title", "")
    keywords = classification.get("keywords", [])
    trend_str = classification.get("trend", "STABLE")
    sentiment_str = classification.get("sentiment", "NEUTRAL")

    # Validate required fields
    if not title or len(title) < 10:
        logger.warning(f"Invalid title for post {raw_post.source_url}, using truncated content")
        title = raw_post.content[:100].strip() + "..." if len(raw_post.content) > 100 else raw_post.content

    if not keywords or len(keywords) < 3:
        logger.warning(f"Insufficient keywords for post {raw_post.source_url}")
        keywords = ["부동산", "일반", "정보"]  # Default Korean real estate keywords

    # Parse enums safely
    try:
        trend = Trend(trend_str)
    except ValueError:
        logger.warning(f"Invalid trend value: {trend_str}, defaulting to STABLE")
        trend = Trend.STABLE

    try:
        sentiment = Sentiment(sentiment_str)
    except ValueError:
        logger.warning(f"Invalid sentiment value: {sentiment_str}, defaulting to NEUTRAL")
        sentiment = Sentiment.NEUTRAL

    # Generate content hash for deduplication
    content_hash = generate_content_hash(raw_post.content)

    # Create ProcessedDocument
    processed_doc = ProcessedDocument(
        source_url=raw_post.source_url,
        title=title[:500],  # Ensure max length
        content=raw_post.content,
        keywords=keywords[:10],  # Ensure max 10 keywords
        domain_tag=DEFAULT_DOMAIN_TAG,
        trend=trend,
        sentiment=sentiment,
        content_hash=content_hash,
        posted_at=raw_post.posted_at,
        processed_at=datetime.utcnow(),
        collection_job_id=raw_post.collection_job_id,
    )

    logger.info(f"Successfully processed post: {raw_post.source_url}")
    return processed_doc


async def clean_posts(
    raw_posts: list[RawPost],
) -> tuple[list[ProcessedDocument], int, int]:
    """Clean multiple raw posts.

    Args:
        raw_posts: List of raw posts to clean.

    Returns:
        Tuple of (processed_documents, filtered_count, error_count).
    """
    processed_docs: list[ProcessedDocument] = []
    filtered_count = 0
    error_count = 0

    for raw_post in raw_posts:
        try:
            result = await clean_post(raw_post)
            if result is None:
                filtered_count += 1
            else:
                processed_docs.append(result)
        except Exception as e:
            logger.error(f"Error processing post {raw_post.source_url}: {e}")
            error_count += 1

    logger.info(
        f"Cleaning complete: {len(processed_docs)} processed, "
        f"{filtered_count} filtered, {error_count} errors"
    )

    return processed_docs, filtered_count, error_count

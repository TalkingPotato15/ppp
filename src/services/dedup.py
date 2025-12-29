"""Deduplication service for content hash generation and URL checking."""

import hashlib
import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.raw_post import RawPost

logger = logging.getLogger(__name__)


def generate_content_hash(content: str) -> str:
    """Generate SHA-256 hash of content for deduplication.

    Args:
        content: The content to hash.

    Returns:
        64-character hexadecimal hash string.
    """
    normalized_content = content.strip().lower()
    return hashlib.sha256(normalized_content.encode("utf-8")).hexdigest()


async def url_exists(session: AsyncSession, url: str) -> bool:
    """Check if a URL already exists in the database.

    Args:
        session: Database session.
        url: The URL to check.

    Returns:
        True if URL exists, False otherwise.
    """
    stmt = select(RawPost.id).where(RawPost.source_url == url).limit(1)
    result = await session.execute(stmt)
    exists = result.scalar_one_or_none() is not None

    if exists:
        logger.debug(f"URL already exists: {url}")

    return exists


async def filter_new_urls(session: AsyncSession, urls: list[str]) -> list[str]:
    """Filter out URLs that already exist in the database.

    Args:
        session: Database session.
        urls: List of URLs to check.

    Returns:
        List of URLs that don't exist in the database.
    """
    if not urls:
        return []

    stmt = select(RawPost.source_url).where(RawPost.source_url.in_(urls))
    result = await session.execute(stmt)
    existing_urls = set(row[0] for row in result.fetchall())

    new_urls = [url for url in urls if url not in existing_urls]

    logger.info(f"URL filter: {len(urls)} total, {len(existing_urls)} existing, {len(new_urls)} new")

    return new_urls

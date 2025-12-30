"""Forum scraper with rate limiting and retry logic."""

import asyncio
import hashlib
import logging
import random
from datetime import datetime
from typing import Optional
from urllib.parse import urljoin
from zoneinfo import ZoneInfo

import httpx
from bs4 import BeautifulSoup

from src.config.selectors import ForumSelectors, get_selectors
from src.config.settings import settings

logger = logging.getLogger(__name__)

# Timezone for Korea
KST = ZoneInfo("Asia/Seoul")

# Rate limiting: 1 request per 5 seconds
REQUEST_DELAY = 5.0

# Retry configuration
MAX_RETRIES = 3
RETRY_BACKOFF_BASE = 2.0  # Exponential backoff base

# User agents for rotation
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
]


class ScrapedPost:
    """Represents a scraped post before database storage."""

    def __init__(
        self,
        source_url: str,
        content: str,
        author: Optional[str],
        posted_at: datetime,
    ):
        self.source_url = source_url
        self.content = content
        self.author = author
        self.author_hash = self._hash_author(author) if author else None
        self.posted_at = posted_at
        self.scraped_at = datetime.now(KST)

    @staticmethod
    def _hash_author(author: str) -> str:
        """Hash author name for privacy."""
        return hashlib.sha256(author.encode("utf-8")).hexdigest()


class ForumScraper:
    """Async forum scraper with rate limiting and retry logic."""

    def __init__(self, forum_name: str = "example_forum"):
        self.forum_name = forum_name
        self.selectors: ForumSelectors = get_selectors(forum_name)
        self.base_url = settings.target_forum_url
        self._last_request_time: Optional[float] = None
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=30.0,
                follow_redirects=True,
                headers={"User-Agent": self._get_user_agent()},
            )
        return self._client

    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None

    def _get_user_agent(self) -> str:
        """Get a random user agent for rotation."""
        return random.choice(USER_AGENTS)

    async def _rate_limit(self) -> None:
        """Apply rate limiting between requests."""
        if self._last_request_time is not None:
            elapsed = asyncio.get_event_loop().time() - self._last_request_time
            if elapsed < REQUEST_DELAY:
                delay = REQUEST_DELAY - elapsed
                logger.debug(f"Rate limiting: waiting {delay:.2f}s")
                await asyncio.sleep(delay)
        self._last_request_time = asyncio.get_event_loop().time()

    async def _fetch_with_retry(self, url: str) -> Optional[str]:
        """Fetch URL with exponential backoff retry.

        Args:
            url: URL to fetch.

        Returns:
            HTML content or None if all retries failed.
        """
        client = await self._get_client()

        for attempt in range(MAX_RETRIES):
            try:
                await self._rate_limit()

                # Rotate user agent on retry
                if attempt > 0:
                    client.headers["User-Agent"] = self._get_user_agent()

                response = await client.get(url)
                response.raise_for_status()

                logger.debug(f"Fetched: {url} (attempt {attempt + 1})")
                return response.text

            except httpx.HTTPStatusError as e:
                logger.warning(f"HTTP error {e.response.status_code} for {url} (attempt {attempt + 1})")
                if e.response.status_code == 404:
                    return None  # Don't retry 404s
            except httpx.RequestError as e:
                logger.warning(f"Request error for {url}: {e} (attempt {attempt + 1})")

            # Exponential backoff
            if attempt < MAX_RETRIES - 1:
                backoff = RETRY_BACKOFF_BASE ** attempt + random.uniform(0, 1)
                logger.debug(f"Retrying in {backoff:.2f}s")
                await asyncio.sleep(backoff)

        logger.error(f"Failed to fetch {url} after {MAX_RETRIES} retries")
        return None

    def parse_post_list(self, html: str) -> list[dict]:
        """Parse post list page to extract post URLs and basic info.

        Args:
            html: HTML content of the list page.

        Returns:
            List of dicts with post URLs and metadata.
        """
        soup = BeautifulSoup(html, "lxml")
        posts = []

        post_elements = soup.select(self.selectors["post_list"])
        logger.debug(f"Found {len(post_elements)} posts on page")

        for elem in post_elements:
            try:
                # Extract post URL
                url_elem = elem.select_one(self.selectors["post_url"])
                if not url_elem:
                    continue

                href = url_elem.get("href", "")
                post_url = urljoin(self.base_url, href)

                # Extract title (optional at list level)
                title_elem = elem.select_one(self.selectors["post_title"])
                title = title_elem.get_text(strip=True) if title_elem else ""

                # Extract date if available at list level
                date_elem = elem.select_one(self.selectors["post_date"])
                date_str = date_elem.get_text(strip=True) if date_elem else None

                posts.append({
                    "url": post_url,
                    "title": title,
                    "date_str": date_str,
                })

            except Exception as e:
                logger.warning(f"Error parsing post element: {e}")
                continue

        return posts

    def parse_post_detail(self, html: str, url: str) -> Optional[ScrapedPost]:
        """Parse post detail page to extract full content.

        Args:
            html: HTML content of the detail page.
            url: URL of the post.

        Returns:
            ScrapedPost or None if parsing failed.
        """
        soup = BeautifulSoup(html, "lxml")

        try:
            # Extract content
            content_elem = soup.select_one(self.selectors["post_content"])
            if not content_elem:
                logger.warning(f"No content found for {url}")
                return None

            content = content_elem.get_text(strip=True)
            if not content:
                logger.warning(f"Empty content for {url}")
                return None

            # Extract author
            author_elem = soup.select_one(self.selectors["post_author"])
            author = author_elem.get_text(strip=True) if author_elem else None

            # Extract date
            date_elem = soup.select_one(self.selectors["post_date"])
            posted_at = self._parse_date(date_elem.get_text(strip=True)) if date_elem else datetime.now(KST)

            return ScrapedPost(
                source_url=url,
                content=content,
                author=author,
                posted_at=posted_at,
            )

        except Exception as e:
            logger.error(f"Error parsing post detail {url}: {e}")
            return None

    def _parse_date(self, date_str: str) -> datetime:
        """Parse date string to datetime.

        Args:
            date_str: Date string from the forum.

        Returns:
            Parsed datetime, defaults to now if parsing fails.
        """
        # Remove common Korean date prefixes
        date_str = date_str.strip()
        korean_prefixes = ["등록일", "작성일", "날짜"]
        for prefix in korean_prefixes:
            if date_str.startswith(prefix):
                date_str = date_str[len(prefix):].strip()
                break

        # Common Korean date formats
        formats = [
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d %H:%M",
            "%Y.%m.%d %H:%M:%S",
            "%Y.%m.%d %H:%M",
            "%Y/%m/%d %H:%M:%S",
            "%Y/%m/%d %H:%M",
            "%Y-%m-%d",
            "%Y.%m.%d",
        ]

        for fmt in formats:
            try:
                return datetime.strptime(date_str.strip(), fmt)
            except ValueError:
                continue

        logger.warning(f"Could not parse date: {date_str}, using current time")
        return datetime.now(KST)

    def get_next_page_url(self, html: str, current_url: str) -> Optional[str]:
        """Get the next page URL from the current page.

        Args:
            html: HTML content of the current page.
            current_url: URL of the current page.

        Returns:
            Next page URL or None if no next page.
        """
        soup = BeautifulSoup(html, "lxml")
        next_elem = soup.select_one(self.selectors["next_page"])

        if next_elem:
            href = next_elem.get("href", "")
            if href:
                return urljoin(current_url, href)

        return None

    async def scrape_post(self, url: str) -> Optional[ScrapedPost]:
        """Scrape a single post by URL.

        Args:
            url: URL of the post to scrape.

        Returns:
            ScrapedPost or None if scraping failed.
        """
        html = await self._fetch_with_retry(url)
        if not html:
            return None

        return self.parse_post_detail(html, url)

    async def scrape_post_list(self, list_url: str) -> list[dict]:
        """Scrape a post list page.

        Args:
            list_url: URL of the post list page.

        Returns:
            List of post info dicts.
        """
        html = await self._fetch_with_retry(list_url)
        if not html:
            return []

        return self.parse_post_list(html)

    async def scrape_posts_from_list(
        self,
        list_url: str,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
        max_posts: Optional[int] = None,
        skip_urls: Optional[set[str]] = None,
    ) -> list[ScrapedPost]:
        """Scrape posts from a list page, following pagination.

        Args:
            list_url: Starting list page URL.
            from_date: Only scrape posts from this date onwards.
            to_date: Only scrape posts until this date.
            max_posts: Maximum number of posts to scrape.
            skip_urls: Set of URLs to skip (already scraped).

        Returns:
            List of ScrapedPosts.
        """
        posts: list[ScrapedPost] = []
        current_url = list_url
        skip_urls = skip_urls or set()
        pages_scraped = 0
        max_pages = 100  # Safety limit

        while current_url and pages_scraped < max_pages:
            logger.info(f"Scraping list page: {current_url}")

            html = await self._fetch_with_retry(current_url)
            if not html:
                break

            post_list = self.parse_post_list(html)
            pages_scraped += 1

            for post_info in post_list:
                post_url = post_info["url"]

                # Skip already scraped URLs
                if post_url in skip_urls:
                    logger.debug(f"Skipping already scraped: {post_url}")
                    continue

                # Scrape individual post
                post = await self.scrape_post(post_url)
                if not post:
                    continue

                # Apply date filters
                if from_date and post.posted_at < from_date:
                    logger.debug(f"Post before from_date, stopping: {post_url}")
                    return posts  # Stop if we've gone past the date range

                if to_date and post.posted_at > to_date:
                    logger.debug(f"Post after to_date, skipping: {post_url}")
                    continue

                posts.append(post)
                logger.info(f"Scraped post {len(posts)}: {post_url[:60]}...")

                if max_posts and len(posts) >= max_posts:
                    logger.info(f"Reached max_posts limit: {max_posts}")
                    return posts

            # Get next page
            next_url = self.get_next_page_url(html, current_url)
            if next_url == current_url:
                break  # Avoid infinite loop
            current_url = next_url

        logger.info(f"Scraping complete: {len(posts)} posts from {pages_scraped} pages")
        return posts

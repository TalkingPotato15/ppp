"""CSS selectors configuration for web scraping."""

from typing import TypedDict


class ForumSelectors(TypedDict):
    """CSS selectors for a forum."""

    post_list: str
    post_title: str
    post_content: str
    post_author: str
    post_date: str
    post_url: str
    next_page: str


# Forum-specific selectors
# Add new forums here with their CSS selectors
SELECTORS: dict[str, ForumSelectors] = {
    "example_forum": {
        "post_list": "div.post-list > article",
        "post_title": "h2.title",
        "post_content": "div.content",
        "post_author": "span.author",
        "post_date": "time.posted",
        "post_url": "a.post-link",
        "next_page": "a.next-page",
    },
    # Ppomppu (뽐뿌) - Korean forum (verified 2025-12-30)
    "ppomppu_real_estate": {
        # List page selectors
        "post_list": "table tr",  # Each row is a post
        "post_title": "a[href*='view.php']",  # Title from list (reused for detail)
        "post_url": "a[href*='view.php?id=house']",  # Link to post detail
        "next_page": "a[href*='&page=']",  # Pagination links

        # Detail page selectors
        "post_content": "td.board-contents",  # Main content body
        "post_author": "a.baseList-name",  # Author name
        "post_date": ".topTitle-mainbox li:nth-child(2)",  # Date/time (2nd li element)
    },
}


def get_selectors(forum_name: str) -> ForumSelectors:
    """Get CSS selectors for a specific forum.

    Args:
        forum_name: Name of the forum to get selectors for.

    Returns:
        ForumSelectors for the specified forum.

    Raises:
        KeyError: If forum_name is not found in SELECTORS.
    """
    if forum_name not in SELECTORS:
        raise KeyError(f"No selectors configured for forum: {forum_name}")
    return SELECTORS[forum_name]

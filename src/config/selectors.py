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
    # Add more forums as needed
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

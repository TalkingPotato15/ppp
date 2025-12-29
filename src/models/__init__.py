"""Data models for the Agent Business Builder."""

from enum import Enum


class Trend(str, Enum):
    """Trend indicator for market problems."""

    RISING = "RISING"
    STABLE = "STABLE"
    DECLINING = "DECLINING"


class Sentiment(str, Enum):
    """Sentiment classification for content."""

    POSITIVE = "POSITIVE"
    NEUTRAL = "NEUTRAL"
    NEGATIVE = "NEGATIVE"


class JobType(str, Enum):
    """Type of collection job."""

    INITIAL_LOAD = "INITIAL_LOAD"
    INCREMENTAL = "INCREMENTAL"


class JobStatus(str, Enum):
    """Status of a collection job."""

    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class RelationshipType(str, Enum):
    """Type of relationship between documents."""

    SIMILAR_TOPIC = "SIMILAR_TOPIC"
    SAME_DOMAIN = "SAME_DOMAIN"
    TREND_CORRELATION = "TREND_CORRELATION"

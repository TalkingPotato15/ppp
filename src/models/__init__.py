"""Models package - Enums and data models for the application."""

from enum import Enum


class Trend(str, Enum):
    """Market trend indicator."""
    RISING = "RISING"
    STABLE = "STABLE"
    DECLINING = "DECLINING"


class Sentiment(str, Enum):
    """Content sentiment classification."""
    POSITIVE = "POSITIVE"
    NEUTRAL = "NEUTRAL"
    NEGATIVE = "NEGATIVE"


class JobStatus(str, Enum):
    """Collection job status."""
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class JobType(str, Enum):
    """Collection job type."""
    INITIAL_LOAD = "INITIAL_LOAD"
    INCREMENTAL = "INCREMENTAL"


class RelationshipType(str, Enum):
    """Document relationship type."""
    SIMILAR_TOPIC = "SIMILAR_TOPIC"
    SAME_DOMAIN = "SAME_DOMAIN"
    RELATED_KEYWORDS = "RELATED_KEYWORDS"


class GenerationStatus(str, Enum):
    """Idea generation status."""
    PENDING = "PENDING"
    GENERATING = "GENERATING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class AuthProvider(str, Enum):
    """Authentication provider."""
    LOCAL = "LOCAL"
    GOOGLE = "GOOGLE"


# Export all enums
__all__ = [
    "Trend",
    "Sentiment",
    "JobStatus",
    "JobType",
    "RelationshipType",
    "GenerationStatus",
    "AuthProvider",
]

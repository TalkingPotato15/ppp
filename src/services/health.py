"""Health check service for monitoring system status."""

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional

from src.config.settings import settings
from src.models import JobStatus
from src.storage import get_session
from src.storage import rdb_store
from src.storage import vector_store

logger = logging.getLogger(__name__)


@dataclass
class HealthStatus:
    """Health status of a component."""

    healthy: bool
    message: str
    details: Optional[dict] = None


@dataclass
class SystemHealth:
    """Overall system health status."""

    healthy: bool
    database: HealthStatus
    vector_store: HealthStatus
    recent_collection: HealthStatus
    timestamp: datetime


async def check_database_health() -> HealthStatus:
    """Check database connectivity and status.

    Returns:
        HealthStatus for the database.
    """
    try:
        async with get_session() as session:
            # Simple query to verify connection
            count = await rdb_store.get_summary_count(session)

        return HealthStatus(
            healthy=True,
            message="Database connected",
            details={"document_count": count},
        )
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return HealthStatus(
            healthy=False,
            message=f"Database error: {str(e)}",
        )


def check_vector_store_health() -> HealthStatus:
    """Check vector store connectivity and status.

    Returns:
        HealthStatus for the vector store.
    """
    try:
        count = vector_store.get_document_count()

        return HealthStatus(
            healthy=True,
            message="Vector store connected",
            details={"document_count": count},
        )
    except Exception as e:
        logger.error(f"Vector store health check failed: {e}")
        return HealthStatus(
            healthy=False,
            message=f"Vector store error: {str(e)}",
        )


async def check_recent_collection_health() -> HealthStatus:
    """Check if data collection is running properly.

    Returns:
        HealthStatus for recent collection activity.
    """
    try:
        async with get_session() as session:
            jobs = await rdb_store.get_recent_jobs(session, limit=5)

        if not jobs:
            return HealthStatus(
                healthy=True,
                message="No collection jobs found (system may be new)",
            )

        # Check if there's a recent successful job
        recent_threshold = datetime.utcnow() - timedelta(hours=2)
        recent_jobs = [
            j for j in jobs
            if j.completed_at and j.completed_at > recent_threshold
        ]

        if recent_jobs:
            latest = recent_jobs[0]
            return HealthStatus(
                healthy=True,
                message="Recent collection successful",
                details={
                    "last_job_id": latest.id,
                    "last_job_status": latest.status.value,
                    "posts_processed": latest.posts_processed or 0,
                },
            )

        # Check for failed jobs
        failed_jobs = [j for j in jobs if j.status == JobStatus.FAILED]
        if failed_jobs:
            latest_failed = failed_jobs[0]
            return HealthStatus(
                healthy=False,
                message="Recent collection jobs failed",
                details={
                    "failed_job_id": latest_failed.id,
                    "error": latest_failed.error_message,
                },
            )

        # No recent jobs but no failures
        return HealthStatus(
            healthy=True,
            message="No recent collection activity",
            details={"last_job_age": "more than 2 hours"},
        )

    except Exception as e:
        logger.error(f"Collection health check failed: {e}")
        return HealthStatus(
            healthy=False,
            message=f"Collection check error: {str(e)}",
        )


async def get_system_health() -> SystemHealth:
    """Get overall system health status.

    Returns:
        SystemHealth with all component statuses.
    """
    db_health = await check_database_health()
    vs_health = check_vector_store_health()
    collection_health = await check_recent_collection_health()

    overall_healthy = all([
        db_health.healthy,
        vs_health.healthy,
        collection_health.healthy,
    ])

    return SystemHealth(
        healthy=overall_healthy,
        database=db_health,
        vector_store=vs_health,
        recent_collection=collection_health,
        timestamp=datetime.utcnow(),
    )

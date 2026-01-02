"""APScheduler setup for automated data collection."""

import asyncio
import logging
import signal
import sys
from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore

from src.config.settings import settings

logger = logging.getLogger(__name__)
n# Timezone for Korea
KST = ZoneInfo("Asia/Seoul")

# Global scheduler instance
_scheduler: Optional[AsyncIOScheduler] = None
_shutdown_event: Optional[asyncio.Event] = None


def get_scheduler() -> AsyncIOScheduler:
    """Get or create the scheduler instance.

    Returns:
        AsyncIOScheduler instance.
    """
    global _scheduler

    if _scheduler is None:
        # Configure job store with SQLite
        # Convert async URL to sync URL for APScheduler
        db_url = settings.database_url.replace("sqlite+aiosqlite", "sqlite")

        jobstores = {
            "default": SQLAlchemyJobStore(url=db_url, tablename="apscheduler_jobs")
        }

        _scheduler = AsyncIOScheduler(
            jobstores=jobstores,
            job_defaults={
                "coalesce": True,  # Combine multiple missed runs into one
                "max_instances": 1,  # Only one instance at a time
                "misfire_grace_time": 3600,  # 1 hour grace period
            },
        )

        logger.info("Scheduler initialized with SQLite job store")

    return _scheduler


async def _run_incremental_job() -> None:
    """Job function for incremental collection."""
    from src.services.pipeline import incremental_collect

    logger.info(f"[Scheduler] Starting incremental collection at {datetime.now(KST)}")

    try:
        result = await incremental_collect(hours=1)

        if result.success:
            logger.info(
                f"[Scheduler] Incremental collection completed: "
                f"{result.posts_processed} processed, {result.posts_filtered} filtered"
            )
        else:
            logger.error(f"[Scheduler] Incremental collection failed: {result.errors}")

    except Exception as e:
        logger.exception(f"[Scheduler] Incremental collection error: {e}")


async def _run_gap_recovery_job() -> None:
    """Job function for gap recovery (runs less frequently)."""
    from src.services.pipeline import recover_gaps

    logger.info(f"[Scheduler] Starting gap recovery check at {datetime.now(KST)}")

    try:
        results = await recover_gaps()

        if results:
            total_processed = sum(r.posts_processed for r in results)
            logger.info(f"[Scheduler] Gap recovery completed: {len(results)} gaps, {total_processed} posts")
        else:
            logger.debug("[Scheduler] No gaps to recover")

    except Exception as e:
        logger.exception(f"[Scheduler] Gap recovery error: {e}")


def setup_jobs(scheduler: AsyncIOScheduler) -> None:
    """Setup scheduled jobs.

    Args:
        scheduler: The scheduler instance.
    """
    # Hourly incremental collection (at minute 5 to avoid exactly on the hour)
    scheduler.add_job(
        _run_incremental_job,
        CronTrigger(minute=5),  # Every hour at :05
        id="incremental_collection",
        name="Incremental Data Collection",
        replace_existing=True,
    )
    logger.info("Added job: incremental_collection (hourly at :05)")

    # Gap recovery check (every 6 hours)
    scheduler.add_job(
        _run_gap_recovery_job,
        CronTrigger(hour="*/6", minute=30),  # Every 6 hours at :30
        id="gap_recovery",
        name="Gap Recovery Check",
        replace_existing=True,
    )
    logger.info("Added job: gap_recovery (every 6 hours at :30)")


def _handle_shutdown(signum, frame) -> None:
    """Handle shutdown signals."""
    global _shutdown_event
    logger.info(f"Received signal {signum}, initiating shutdown...")
    if _shutdown_event:
        _shutdown_event.set()


async def start_scheduler(run_immediately: bool = False) -> None:
    """Start the scheduler and run until shutdown.

    Args:
        run_immediately: If True, run an incremental collection immediately.
    """
    global _shutdown_event
    _shutdown_event = asyncio.Event()

    scheduler = get_scheduler()
    setup_jobs(scheduler)

    # Setup signal handlers
    signal.signal(signal.SIGINT, _handle_shutdown)
    signal.signal(signal.SIGTERM, _handle_shutdown)

    logger.info("Starting scheduler...")
    scheduler.start()

    # Run immediately if requested
    if run_immediately:
        logger.info("Running immediate incremental collection...")
        await _run_incremental_job()

    # Print next run times
    jobs = scheduler.get_jobs()
    for job in jobs:
        next_run = job.next_run_time
        if next_run:
            logger.info(f"Job '{job.name}' next run: {next_run}")

    logger.info("Scheduler running. Press Ctrl+C to stop.")

    # Wait for shutdown signal
    try:
        await _shutdown_event.wait()
    except asyncio.CancelledError:
        pass

    logger.info("Shutting down scheduler...")
    scheduler.shutdown(wait=True)
    logger.info("Scheduler stopped.")


def stop_scheduler() -> None:
    """Stop the scheduler gracefully."""
    global _scheduler, _shutdown_event

    if _shutdown_event:
        _shutdown_event.set()

    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=True)
        _scheduler = None

    logger.info("Scheduler stopped")

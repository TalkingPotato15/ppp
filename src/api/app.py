"""FastAPI application setup."""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config.settings import settings, validate_payment_settings
from src.storage import init_db, close_db
from src.storage.session_store import cleanup_expired_sessions
from src.api.routers import auth, discovery, users, ideas, payment

logger = logging.getLogger(__name__)


async def session_cleanup_task():
    """Background task to cleanup expired payment sessions."""
    logger.info("Starting session cleanup background task")
    while True:
        try:
            await asyncio.sleep(300)  # Run every 5 minutes
            count = cleanup_expired_sessions()
            if count > 0:
                logger.info(f"Cleaned up {count} expired payment sessions")
        except Exception as e:
            logger.error(f"Error in session cleanup task: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    logger.info("Application startup initiated")

    # Validate payment settings
    try:
        validate_payment_settings()
        logger.info("Payment settings validated successfully")
    except ValueError as e:
        logger.warning(f"Payment settings validation failed: {e}")
        logger.warning("Payment features may not work correctly")

    # Initialize database
    await init_db()

    # Start session cleanup background task
    cleanup_task = asyncio.create_task(session_cleanup_task())
    logger.info("Session cleanup task started")

    yield

    # Shutdown
    logger.info("Application shutdown initiated")
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        logger.info("Session cleanup task cancelled")
    await close_db()
    logger.info("Application shutdown complete")


app = FastAPI(
    title="Discovery API",
    description="API for AI Agent Business Builder Discovery UI",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(discovery.router, prefix="/api/discovery", tags=["Discovery"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(ideas.router, prefix="/api/ideas", tags=["Ideas"])
app.include_router(payment.router, prefix="/api/payment", tags=["Payment"])


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

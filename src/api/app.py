"""FastAPI application setup."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config.settings import settings
from src.storage import init_db, close_db
from src.api.routers import auth, discovery, users, ideas


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    await init_db()
    yield
    # Shutdown
    await close_db()


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


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

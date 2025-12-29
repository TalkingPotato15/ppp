# Quickstart: Data Collection Pipeline

**Feature**: 001-data-pipeline
**Date**: 2025-12-28

## Prerequisites

- Python 3.11+
- uv (Python package manager)
- OpenAI API key

## Environment Setup

### 1. Clone and Install

```bash
# Install uv if not already installed
curl -LsSf https://astral.sh/uv/install.sh | sh

# Initialize project and install dependencies
uv sync
```

### 2. Environment Variables

Create `.env` file in project root:

```env
# Database (SQLite for local, PostgreSQL for production)
DATABASE_URL=sqlite+aiosqlite:///./data/app.db
# DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/agent_builder

# OpenAI
OPENAI_API_KEY=sk-...

# Target Forum (configure for your source)
TARGET_FORUM_URL=https://example-forum.com
TARGET_FORUM_NAME=example_forum

# Collection Settings
INITIAL_LOAD_MONTHS=3
SCRAPE_RATE_LIMIT_SECONDS=5
INCREMENTAL_INTERVAL_HOURS=1

# ChromaDB (local by default)
CHROMA_PERSIST_DIRECTORY=./data/chroma

# Logging
LOG_LEVEL=INFO
```

### 3. Database Setup

```bash
# Create data directory
mkdir -p data

# Run migrations (creates SQLite DB automatically)
uv run alembic upgrade head
```

## Running the Pipeline

### Initial Data Load

Run once to populate baseline data:

```bash
uv run python -m src.main initial-load --months 3
```

This will:
1. Scrape posts from the past 3 months
2. Filter noise using LLM
3. Store in Vector DB and PostgreSQL
4. Log progress to console

### Start Scheduler (Incremental Collection)

Run as a background service:

```bash
uv run python -m src.main scheduler
```

This will:
1. Run every hour
2. Collect posts from the previous hour
3. Process and store new documents
4. Skip duplicates automatically

### Manual Incremental Run

For testing or backfilling:

```bash
uv run python -m src.main incremental --hours 2
```

## CLI Commands Reference

```bash
# Show help
uv run python -m src.main --help

# Initial load with custom period
uv run python -m src.main initial-load --months 6

# Start scheduler daemon
uv run python -m src.main scheduler

# Manual incremental (custom hours)
uv run python -m src.main incremental --hours 24

# Check job history
uv run python -m src.main jobs list

# View specific job
uv run python -m src.main jobs show <job-id>

# Health check
uv run python -m src.main health

# Test scraper (dry run, no storage)
uv run python -m src.main test-scrape --url "https://..." --dry-run
```

## Testing

```bash
# Run all tests
uv run pytest

# Run with coverage
uv run pytest --cov=src --cov-report=html

# Run specific test file
uv run pytest tests/unit/test_scraper.py

# Run integration tests (requires DB)
uv run pytest tests/integration/ -v
```

## Project Structure

```
src/
├── agents/analyst/     # Agent 1 components
│   ├── scraper.py      # Web scraping
│   ├── cleaner.py      # LLM noise filtering
│   ├── embedder.py     # Embedding generation
│   └── scheduler.py    # Job scheduling
├── models/             # Data models
├── storage/            # DB operations
├── services/           # Business logic
├── config/             # Settings
└── main.py             # CLI entry point

tests/
├── unit/               # Unit tests
├── integration/        # Integration tests
└── fixtures/           # Test data
```

## Monitoring

### Check Pipeline Health

```bash
uv run python -m src.main health
```

Expected output:
```json
{
  "status": "healthy",
  "components": {
    "database": "up",
    "vector_db": "up",
    "scheduler": "running"
  },
  "last_job": {
    "id": "...",
    "status": "COMPLETED",
    "posts_processed": 42
  }
}
```

### View Recent Jobs

```bash
uv run python -m src.main jobs list --limit 5
```

### Gap Detection

If the scheduler was down, detect missed windows:

```bash
uv run python -m src.main jobs check-gaps
```

## Troubleshooting

### Common Issues

**1. Scraping blocked (403/429 errors)**
```
Solution: Increase SCRAPE_RATE_LIMIT_SECONDS in .env
```

**2. OpenAI rate limit**
```
Solution: Batch processing is automatic. Check API quota.
```

**3. ChromaDB disk full**
```
Solution: Check CHROMA_PERSIST_DIRECTORY disk space
```

**4. PostgreSQL connection refused**
```
Solution: Verify DATABASE_URL and PostgreSQL is running
```

### Debug Mode

```bash
LOG_LEVEL=DEBUG uv run python -m src.main scheduler
```

## Configuration

### CSS Selectors

Forum-specific selectors in `src/config/selectors.py`:

```python
SELECTORS = {
    "example_forum": {
        "post_list": "div.post-list > article",
        "post_title": "h2.title",
        "post_content": "div.content",
        "post_author": "span.author",
        "post_date": "time.posted",
        "next_page": "a.next-page"
    }
}
```

### Adding New Forum

1. Add selectors to `selectors.py`
2. Update `.env` with new forum URL
3. Run `test-scrape --dry-run` to verify
4. Run `initial-load` for new forum

## Dependencies

Core dependencies (managed via `uv` in `pyproject.toml`):

```
# Web scraping
beautifulsoup4>=4.12.0
httpx>=0.25.0
lxml>=4.9.0

# LLM/Embeddings
openai>=1.0.0
langchain>=0.1.0

# Vector DB
chromadb>=0.4.0

# Database (SQLite for local, PostgreSQL for production)
sqlalchemy>=2.0.0
aiosqlite>=0.19.0
alembic>=1.13.0

# Scheduling
apscheduler>=3.10.0

# Config
pydantic>=2.0.0
pydantic-settings>=2.0.0
python-dotenv>=1.0.0

# CLI
typer>=0.9.0
rich>=13.0.0

# Testing
pytest>=7.4.0
pytest-asyncio>=0.21.0
pytest-cov>=4.1.0
```

Install with:
```bash
uv sync
```

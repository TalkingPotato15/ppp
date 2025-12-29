# Implementation Plan: Data Collection Pipeline

**Branch**: `001-data-pipeline` | **Date**: 2025-12-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-data-pipeline/spec.md`

## Summary

Build Agent 1 (Data Analyst) - a data collection pipeline that scrapes a Korean real estate community forum, filters noise using LLM, and stores structured documents in both Vector DB (for RAG) and PostgreSQL (for UI). The pipeline performs initial bulk load followed by hourly incremental collection.

## Technical Context

**Language/Version**: Python 3.11+
**Primary Dependencies**: BeautifulSoup, httpx, LangChain, OpenAI, ChromaDB, SQLAlchemy, aiosqlite
**Storage**: ChromaDB (Vector DB) + SQLite (Local RDB) / PostgreSQL (Production RDB)
**Package Manager**: uv
**Testing**: pytest + pytest-asyncio
**Target Platform**: Linux server (Docker-ready)
**Project Type**: Single backend service
**Performance Goals**: Process 1000 posts/hour, <5s per post processing
**Constraints**: Rate limit 1 req/5sec to avoid blocking, <5% hallucination rate
**Scale/Scope**: PoC with 10 users, 3 months historical data, single forum

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Status | Implementation |
|-----------|-------------|--------|----------------|
| I. Data-First | Source URL traceability | ✅ PASS | Every document stores source_url field |
| I. Data-First | 80%+ noise filtering | ✅ PASS | LLM-based classification + human validation |
| II. Multi-Agent | Single responsibility | ✅ PASS | Agent 1 only collects/cleans data |
| III. RAG-Driven | Vector DB for RAG | ✅ PASS | ChromaDB with OpenAI embeddings |
| III. RAG-Driven | RDB for UI summaries | ✅ PASS | PostgreSQL stores title, keywords, etc. |
| IV. Budget-Aware | Low-cost PoC | ✅ PASS | Local ChromaDB, GPT-4o-mini |
| V. Staged Monetization | N/A | ✅ PASS | Pre-Stage, no monetization |

**All gates passed. No violations.**

## Project Structure

### Documentation (this feature)

```text
specs/001-data-pipeline/
├── plan.md              # This file
├── research.md          # Technology decisions (complete)
├── data-model.md        # Entity definitions
├── quickstart.md        # Developer setup guide
├── contracts/           # API contracts
│   └── internal-api.yaml
└── tasks.md             # Implementation tasks (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── agents/
│   └── analyst/
│       ├── __init__.py
│       ├── scraper.py       # Web scraping logic
│       ├── cleaner.py       # LLM-based noise filtering
│       ├── embedder.py      # Embedding generation
│       └── scheduler.py     # APScheduler job management
├── models/
│   ├── __init__.py
│   ├── raw_post.py          # RawPost entity
│   ├── document.py          # ProcessedDocument entity
│   ├── summary.py           # DocumentSummary entity
│   └── job.py               # CollectionJob entity
├── storage/
│   ├── __init__.py
│   ├── vector_store.py      # ChromaDB operations
│   ├── rdb_store.py         # PostgreSQL operations
│   └── migrations/          # Alembic migrations
├── services/
│   ├── __init__.py
│   ├── pipeline.py          # Orchestrates scrape→clean→store
│   └── dedup.py             # Deduplication logic
├── config/
│   ├── __init__.py
│   ├── settings.py          # Pydantic settings
│   └── selectors.py         # CSS selectors config
└── main.py                  # Entry point

tests/
├── unit/
│   ├── test_scraper.py
│   ├── test_cleaner.py
│   └── test_dedup.py
├── integration/
│   ├── test_pipeline.py
│   └── test_storage.py
└── fixtures/
    └── sample_posts.json
```

**Structure Decision**: Single backend service. No frontend in this feature (Stage A UI is separate feature). CLI-based operation with scheduler.

## Complexity Tracking

> No Constitution violations. Table not applicable.

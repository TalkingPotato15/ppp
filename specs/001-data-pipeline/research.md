# Research: Data Collection Pipeline

**Feature**: 001-data-pipeline
**Date**: 2025-12-28
**Status**: Complete

## Technology Decisions

### 1. Programming Language

**Decision**: Python 3.11+

**Rationale**:
- Best ecosystem for web scraping (BeautifulSoup, Scrapy, Playwright)
- Native LLM/AI library support (LangChain, OpenAI, sentence-transformers)
- Strong async support for concurrent scraping
- Easy integration with Vector DBs and RDBs

**Alternatives Considered**:
- Node.js: Good for scraping but weaker ML/embedding ecosystem
- Go: Fast but limited LLM library support
- Rust: Overkill for PoC, slower development velocity

---

### 2. Web Scraping Framework

**Decision**: BeautifulSoup + httpx (async)

**Rationale**:
- BeautifulSoup: Simple HTML parsing, sufficient for forum scraping
- httpx: Modern async HTTP client, better than requests for scheduled jobs
- Lightweight compared to Scrapy (no need for full framework)
- Easy to add Playwright later if JS rendering needed

**Alternatives Considered**:
- Scrapy: Too heavy for single-source PoC
- Playwright: Only needed if forum uses heavy JS (add later if required)
- Selenium: Slow, resource-intensive

---

### 3. Vector Database

**Decision**: ChromaDB (PoC) → Pinecone/Qdrant (Production)

**Rationale**:
- ChromaDB: Zero-config, runs locally, free, perfect for PoC
- Embedded mode requires no separate server
- Easy migration path to cloud Vector DBs
- Python-native API

**Alternatives Considered**:
- Pinecone: Excellent but paid, overkill for PoC with 10 users
- Qdrant: Good but requires Docker/server setup
- Weaviate: More complex, better for larger scale
- pgvector: Adds complexity to PostgreSQL setup

---

### 4. Relational Database

**Decision**: SQLite (Local) → PostgreSQL (Production)

**Rationale**:
- SQLite for local development: Zero-config, file-based, perfect for PoC
- PostgreSQL for production: Scalable, concurrent writes
- SQLAlchemy abstracts DB differences
- Easy migration path via Alembic

**Alternatives Considered**:
- PostgreSQL only: Requires Docker/server setup for local dev
- MySQL: Less flexible JSON support
- MongoDB: Not needed, data is structured

---

### 5. Embedding Model

**Decision**: OpenAI text-embedding-3-small

**Rationale**:
- High quality embeddings for Korean text
- Cost-effective ($0.02/1M tokens)
- Simple API integration
- 1536 dimensions, good balance of quality and storage

**Alternatives Considered**:
- sentence-transformers (local): Free but lower Korean quality
- OpenAI text-embedding-3-large: Higher cost, overkill for PoC
- Cohere: Good but adds another vendor

---

### 6. LLM for Data Cleaning

**Decision**: OpenAI GPT-4o-mini

**Rationale**:
- Cost-effective for classification/filtering tasks
- Good at Korean text understanding
- Structured output support (JSON mode)
- Sufficient for noise detection and metadata extraction

**Alternatives Considered**:
- GPT-4o: More expensive, not needed for classification
- Claude: Good but different API patterns
- Local LLM: Quality concerns for Korean, infrastructure overhead

---

### 7. Task Scheduling

**Decision**: APScheduler with SQLAlchemy job store

**Rationale**:
- Lightweight, runs in-process
- Persistent job storage via PostgreSQL
- Simple cron-like scheduling
- No separate worker infrastructure needed for PoC

**Alternatives Considered**:
- Celery: Requires Redis/RabbitMQ, overkill for single scheduled task
- cron: Not portable, no job tracking
- Airflow: Too complex for single pipeline

---

### 8. Target Forum

**Decision**: To be configured at deployment

**Rationale**:
- Korean real estate community forums (e.g., 부동산 관련 커뮤니티)
- Forum selection depends on:
  - Public accessibility
  - Terms of service
  - Data richness
- Configurable via environment variable

**Initial Candidates**:
- 네이버 부동산 카페 (requires login - may not work)
- 부동산 관련 DC인사이드 갤러리
- 기타 공개 부동산 커뮤니티

---

### 9. Initial Data Load Period

**Decision**: 3 months of historical data

**Rationale**:
- Sufficient for trend analysis and relationship detection
- Manageable volume for PoC storage
- Recent enough to be relevant
- Configurable via parameter

---

## Architecture Decisions

### Data Flow

```
Forum → Scraper → RawPost → Cleaner (LLM) → ProcessedDocument
                                          ↓
                              ┌───────────┴───────────┐
                              ↓                       ↓
                         Vector DB              PostgreSQL
                        (embeddings)            (summaries)
```

### Deduplication Strategy

**Decision**: Content hash + URL-based deduplication

**Implementation**:
1. URL deduplication: Skip if source_url exists in DB
2. Content hash: SHA-256 of normalized content
3. Check before storage, not after

### Error Handling

**Decision**: Retry with exponential backoff + dead letter logging

**Implementation**:
1. Transient errors: Retry 3x with exponential backoff
2. Persistent errors: Log to dead_letter table, continue pipeline
3. Gap detection: Track last successful timestamp per source

---

## Constitution Alignment

| Principle | Requirement | Implementation |
|-----------|-------------|----------------|
| I. Data-First | Source URL traceability | Every document stores source_url |
| I. Data-First | 80%+ noise filtering | LLM-based classification with human validation |
| II. Multi-Agent | Agent 1 scope only | Only data collection, no idea generation |
| III. RAG-Driven | Vector DB + RDB | ChromaDB for embeddings, PostgreSQL for UI |
| IV. Budget-Aware | Low-cost PoC | Local ChromaDB, GPT-4o-mini, minimal infra |

---

## Risk Mitigations

| Risk | Mitigation |
|------|------------|
| Forum blocks scraping | Rate limiting (1 req/5sec), User-Agent rotation |
| Forum structure changes | CSS selector config file, graceful failure alerts |
| LLM rate limits | Batch processing, async queuing |
| Korean text quality | Use Korean-optimized prompts, manual spot-checking |

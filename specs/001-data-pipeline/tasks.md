# Tasks: Data Collection Pipeline

**Input**: Design documents from `/specs/001-data-pipeline/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested - test tasks omitted. Add tests as needed.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US6)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root (per plan.md)
- **Database**: SQLite (local), PostgreSQL (production)
- **Package Manager**: uv

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create project structure per implementation plan (src/, tests/, data/ directories)
- [x] T002 Initialize Python 3.11+ project with uv: `uv init` and configure pyproject.toml
- [x] T003 [P] Install core dependencies with uv: beautifulsoup4, httpx, openai, chromadb, sqlalchemy, aiosqlite, apscheduler, pydantic, pydantic-settings, typer, rich, alembic, lxml
- [x] T004 [P] Configure linting (ruff) and formatting in pyproject.toml
- [x] T005 [P] Create .env.example with required environment variables (DATABASE_URL for SQLite path)
- [x] T006 [P] Create .gitignore for Python project, uv, SQLite db files, and data directories

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 Create enum definitions in src/models/__init__.py (Trend, Sentiment, JobType, JobStatus, RelationshipType)
- [x] T008 [P] Create Pydantic settings in src/config/settings.py with DATABASE_URL defaulting to SQLite
- [x] T009 [P] Create CSS selectors config in src/config/selectors.py for target forum
- [x] T010 Create CollectionJob model in src/models/job.py per data-model.md
- [x] T011 [P] Create RawPost model in src/models/raw_post.py per data-model.md
- [x] T012 [P] Create ProcessedDocument model in src/models/document.py per data-model.md
- [x] T013 [P] Create DocumentSummary model in src/models/summary.py per data-model.md
- [x] T014 Setup Alembic migrations framework in src/storage/migrations/ (SQLite compatible)
- [x] T015 Create initial migration with all tables per data-model.md schema (SQLite syntax)
- [x] T016 Create database connection utilities in src/storage/__init__.py (async session factory for SQLite)
- [x] T017 [P] Create ChromaDB connection utilities in src/storage/vector_store.py (collection setup only)
- [x] T018 Setup logging configuration in src/config/__init__.py

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 3 - Data Cleaning (Priority: P1)

**Goal**: Agent 1 processes raw data to filter noise and transform valid content into structured documents with metadata

**Independent Test**: Provide sample raw data containing known noise and valid content, verify noise is filtered and valid content is properly structured

**Why this order**: Cleaner can be tested independently with sample data before scraper is built

### Implementation for User Story 3

- [x] T019 [US3] Create LLM service wrapper in src/services/llm_service.py for OpenAI GPT-4o-mini
- [x] T020 [US3] Implement noise classification prompt in src/agents/analyst/cleaner.py (ads, spam, off-topic detection)
- [x] T021 [US3] Implement metadata extraction prompt in src/agents/analyst/cleaner.py (title, keywords, trend, sentiment)
- [x] T022 [US3] Implement clean_post() function in src/agents/analyst/cleaner.py that returns ProcessedDocument or None
- [x] T023 [US3] Add content hash generation (SHA-256) in src/services/dedup.py
- [x] T024 [US3] Create sample test data in tests/fixtures/sample_posts.json with noise and valid posts
- [x] T025 [US3] Add logging for cleaning operations (filtered count, processed count)

**Checkpoint**: Cleaner can process sample RawPost data and output ProcessedDocument with 80%+ noise filtering

---

## Phase 4: User Story 4 - Vector DB Storage (Priority: P1)

**Goal**: Store processed documents in Vector Database with embeddings for semantic search and RAG retrieval

**Independent Test**: Store sample documents and perform similarity searches to verify relevant documents are retrieved

### Implementation for User Story 4

- [ ] T026 [US4] Implement embedding generation in src/agents/analyst/embedder.py using OpenAI text-embedding-3-small
- [ ] T027 [US4] Implement add_document() in src/storage/vector_store.py to store document with embedding
- [ ] T028 [US4] Implement search_similar() in src/storage/vector_store.py for semantic search
- [ ] T029 [US4] Implement get_document() in src/storage/vector_store.py to retrieve by ID
- [ ] T030 [US4] Add metadata preservation (source_url, title, keywords, trend, sentiment, domain_tag)
- [ ] T031 [US4] Add logging for vector store operations

**Checkpoint**: Can store ProcessedDocument with embedding and retrieve via semantic search with 90%+ precision

---

## Phase 5: User Story 5 - RDB Storage (Priority: P2)

**Goal**: Store document summaries in SQLite for fast UI queries

**Independent Test**: Insert sample summaries and query by domain, keywords, or date to verify fast retrieval

### Implementation for User Story 5

- [ ] T032 [P] [US5] Implement save_summary() in src/storage/rdb_store.py
- [ ] T033 [P] [US5] Implement get_summaries() in src/storage/rdb_store.py with filtering (domain, keywords, trend, sentiment)
- [ ] T034 [US5] Implement get_summary_by_id() in src/storage/rdb_store.py
- [ ] T035 [US5] Implement pagination (limit, offset) and sorting (recent, oldest) in get_summaries()
- [ ] T036 [US5] Add logging for RDB operations

**Checkpoint**: Can store DocumentSummary and query with filters, pagination, sorting

---

## Phase 6: User Story 1 - Initial Data Load (Priority: P1) 🎯 MVP

**Goal**: Agent 1 performs initial bulk data collection from target forum to establish baseline dataset

**Independent Test**: Run initial load against target forum and verify historical data is stored with expected content structure

**Dependencies**: Requires US3 (cleaner), US4 (vector store), US5 (rdb store)

### Implementation for User Story 1

- [ ] T037 [US1] Implement forum scraper in src/agents/analyst/scraper.py with httpx async client
- [ ] T038 [US1] Implement parse_post_list() in scraper.py using BeautifulSoup and CSS selectors
- [ ] T039 [US1] Implement parse_post_detail() in scraper.py to extract content, author, timestamp
- [ ] T040 [US1] Implement rate limiting (1 req/5sec) in scraper.py
- [ ] T041 [US1] Implement URL-based deduplication check in src/services/dedup.py (check before scraping)
- [ ] T042 [US1] Implement save_raw_post() in src/storage/rdb_store.py for temporary RawPost storage
- [ ] T043 [US1] Create pipeline orchestrator in src/services/pipeline.py (scrape → clean → embed → store)
- [ ] T044 [US1] Implement initial_load() function in pipeline.py with configurable time range
- [ ] T045 [US1] Implement job tracking: create CollectionJob before start, update on completion/failure
- [ ] T046 [US1] Implement error handling with retry (3x exponential backoff) in scraper.py
- [ ] T047 [US1] Implement resume from last successful point on error
- [ ] T048 [US1] Add CLI command `initial-load --months N` in src/main.py using Typer
- [ ] T049 [US1] Add comprehensive logging for initial load progress

**Checkpoint**: Can run `uv run python -m src.main initial-load --months 3` and populate baseline dataset

---

## Phase 7: User Story 2 - Incremental Collection (Priority: P1)

**Goal**: Agent 1 runs on 1-hour schedule to collect new posts from previous hour

**Independent Test**: Simulate hourly runs and verify only new content from previous hour is collected

**Dependencies**: Requires US1 complete

### Implementation for User Story 2

- [ ] T050 [US2] Implement incremental_collect() in src/services/pipeline.py for 1-hour window
- [ ] T051 [US2] Implement APScheduler setup in src/agents/analyst/scheduler.py with SQLite job store
- [ ] T052 [US2] Configure hourly cron trigger in scheduler.py
- [ ] T053 [US2] Implement gap detection in src/services/pipeline.py (find missed collection windows)
- [ ] T054 [US2] Implement gap recovery: collect data for missed periods automatically
- [ ] T055 [US2] Add CLI command `scheduler` in src/main.py to start daemon mode
- [ ] T056 [US2] Add CLI command `incremental --hours N` for manual runs in src/main.py
- [ ] T057 [US2] Add logging for scheduler events and incremental collection

**Checkpoint**: Can run `uv run python -m src.main scheduler` and collect data every hour automatically

---

## Phase 8: User Story 6 - Document Relationships (Priority: P3)

**Goal**: Identify and store relationships between documents with similar problems or domains

**Independent Test**: Process documents with known overlapping topics and verify relationship links are created

**Dependencies**: Requires US4 (vector store for similarity search)

### Implementation for User Story 6

- [ ] T058 [US6] Create DocumentRelationship model in src/models/relationship.py per data-model.md
- [ ] T059 [US6] Add migration for document_relationships table
- [ ] T060 [US6] Implement find_similar_documents() in src/services/pipeline.py using vector similarity
- [ ] T061 [US6] Implement save_relationships() in src/storage/rdb_store.py
- [ ] T062 [US6] Implement get_related_documents() in src/storage/rdb_store.py
- [ ] T063 [US6] Integrate relationship detection into pipeline.py after document storage
- [ ] T064 [US6] Add similarity threshold configuration (default: 0.8)
- [ ] T065 [US6] Add logging for relationship detection

**Checkpoint**: Documents with similar topics automatically linked with similarity scores

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T066 [P] Implement health check endpoint logic in src/services/health.py
- [ ] T067 [P] Add CLI command `health` in src/main.py
- [ ] T068 [P] Add CLI command `jobs list` and `jobs show <id>` in src/main.py
- [ ] T069 [P] Add CLI command `jobs check-gaps` in src/main.py
- [ ] T070 Create sample forum selector config for testing in src/config/selectors.py
- [ ] T071 Add graceful shutdown handling for scheduler
- [ ] T072 Add User-Agent rotation in scraper.py for rate limit mitigation
- [ ] T073 Validate quickstart.md commands work end-to-end with uv
- [ ] T074 Code cleanup and docstrings for public functions

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational) ← BLOCKS all user stories
    ↓
┌───────────────────────────────────────┐
│  User Stories can proceed in order:   │
│                                       │
│  Phase 3 (US3: Cleaning)              │
│      ↓                                │
│  Phase 4 (US4: Vector DB)             │
│      ↓                                │
│  Phase 5 (US5: RDB) ←─ parallel w/ 4  │
│      ↓                                │
│  Phase 6 (US1: Initial Load) ← MVP!   │
│      ↓                                │
│  Phase 7 (US2: Incremental)           │
│      ↓                                │
│  Phase 8 (US6: Relationships)         │
└───────────────────────────────────────┘
    ↓
Phase 9 (Polish)
```

### User Story Dependencies

| Story | Depends On | Can Start After |
|-------|------------|-----------------|
| US3 (Cleaning) | Foundational | Phase 2 |
| US4 (Vector DB) | US3 (for ProcessedDocument) | Phase 3 |
| US5 (RDB) | Foundational | Phase 2 (parallel with US4) |
| US1 (Initial Load) | US3, US4, US5 | Phase 5 |
| US2 (Incremental) | US1 | Phase 6 |
| US6 (Relationships) | US4 | Phase 4 (can parallel with US5, US1) |

### Within Each User Story

- Models → Services → Integration
- Core implementation → Error handling → Logging
- Story complete before moving to next

### Parallel Opportunities

**Phase 2 (Foundational)**:
```
T008 (settings) + T009 (selectors) + T011 (RawPost) + T012 (ProcessedDocument) + T013 (DocumentSummary) + T017 (ChromaDB setup)
```

**Phase 5 (US5) + Phase 4 (US4)**: Can run in parallel after US3

**Phase 9 (Polish)**:
```
T066 (health) + T067 (CLI health) + T068 (CLI jobs) + T069 (CLI gaps)
```

---

## Parallel Example: Foundational Phase

```bash
# Launch all independent model tasks together:
Task: "Create Pydantic settings in src/config/settings.py"
Task: "Create CSS selectors config in src/config/selectors.py"
Task: "Create RawPost model in src/models/raw_post.py"
Task: "Create ProcessedDocument model in src/models/document.py"
Task: "Create DocumentSummary model in src/models/summary.py"
Task: "Create ChromaDB connection utilities in src/storage/vector_store.py"
```

---

## Implementation Strategy

### MVP First (User Stories 1-5)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: US3 (Cleaning) - test with sample data
4. Complete Phase 4: US4 (Vector DB) - test with sample docs
5. Complete Phase 5: US5 (RDB) - test with sample summaries
6. Complete Phase 6: US1 (Initial Load) - **MVP COMPLETE!**
7. **STOP and VALIDATE**: Run initial load, verify data quality

### Full Feature

8. Complete Phase 7: US2 (Incremental) - scheduler running
9. Complete Phase 8: US6 (Relationships) - document linking
10. Complete Phase 9: Polish

### Incremental Delivery

1. After Phase 6 → Can demo initial data load ✅
2. After Phase 7 → Can run continuous collection ✅
3. After Phase 8 → Full feature complete ✅

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US3, US4, US5 can be tested independently with sample data
- US1 integrates all components into working pipeline
- US2 adds automation on top of US1
- US6 is optional for MVP, adds relationship discovery
- **Database**: SQLite for local development (data/app.db), PostgreSQL for production
- **Package Manager**: uv (`uv run`, `uv add`)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently

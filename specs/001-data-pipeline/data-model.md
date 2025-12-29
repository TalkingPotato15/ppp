# Data Model: Data Collection Pipeline

**Feature**: 001-data-pipeline
**Date**: 2025-12-28

## Entity Overview

```
┌─────────────┐     ┌───────────────────┐     ┌─────────────────┐
│  RawPost    │────▶│ ProcessedDocument │────▶│ DocumentSummary │
└─────────────┘     └───────────────────┘     └─────────────────┘
                            │
                            ▼
                    ┌───────────────────┐
                    │ DocumentEmbedding │
                    └───────────────────┘
                            │
                            ▼
                    ┌───────────────────┐
                    │DocumentRelationship│
                    └───────────────────┘

┌───────────────┐
│ CollectionJob │ (tracks scraping runs)
└───────────────┘
```

## Entities

### RawPost

**Description**: Represents scraped content before any processing. Temporary storage.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| source_url | String(2048) | Yes | Original post URL |
| content | Text | Yes | Raw HTML/text content |
| author_hash | String(64) | No | SHA-256 hash of author name (anonymized) |
| posted_at | DateTime | Yes | Original post timestamp |
| scraped_at | DateTime | Yes | When we collected it |
| collection_job_id | UUID | Yes | FK to CollectionJob |

**Constraints**:
- source_url UNIQUE (prevents duplicate scraping)

**Lifecycle**: Created during scraping → Deleted after successful processing

---

### ProcessedDocument

**Description**: Cleaned and structured content ready for RAG. Stored in Vector DB.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| source_url | String(2048) | Yes | Original post URL |
| title | String(500) | Yes | Extracted/generated title |
| content | Text | Yes | Cleaned content (noise removed) |
| keywords | Array[String] | Yes | Extracted keywords (3-10) |
| domain_tag | String(50) | Yes | Domain category (e.g., "real_estate") |
| trend | Enum | Yes | RISING, STABLE, DECLINING |
| sentiment | Enum | Yes | POSITIVE, NEUTRAL, NEGATIVE |
| content_hash | String(64) | Yes | SHA-256 for deduplication |
| posted_at | DateTime | Yes | Original post timestamp |
| processed_at | DateTime | Yes | When we processed it |
| collection_job_id | UUID | Yes | FK to CollectionJob |

**Constraints**:
- source_url UNIQUE
- content_hash UNIQUE (prevents content duplicates)

**Validation Rules**:
- title: 10-500 characters
- keywords: 3-10 items, each 2-50 characters
- domain_tag: From predefined list

---

### DocumentEmbedding

**Description**: Vector representation stored in ChromaDB.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | String | Yes | Same as ProcessedDocument.id |
| embedding | Vector(1536) | Yes | OpenAI text-embedding-3-small |
| metadata | JSON | Yes | Contains all ProcessedDocument fields |

**Storage**: ChromaDB collection "market_documents"

---

### DocumentSummary

**Description**: Lightweight view for UI display. Stored in PostgreSQL.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Same as ProcessedDocument.id |
| source_url | String(2048) | Yes | Original post URL |
| title | String(500) | Yes | Display title |
| keywords | Array[String] | Yes | For filtering/search |
| domain_tag | String(50) | Yes | Domain category |
| trend | Enum | Yes | RISING, STABLE, DECLINING |
| sentiment | Enum | Yes | POSITIVE, NEUTRAL, NEGATIVE |
| posted_at | DateTime | Yes | Original post timestamp |
| created_at | DateTime | Yes | When summary created |

**Indexes**:
- domain_tag (for filtering)
- posted_at (for sorting by recency)
- keywords (GIN index for array search)

---

### DocumentRelationship

**Description**: Links between related documents.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| source_document_id | UUID | Yes | FK to ProcessedDocument |
| target_document_id | UUID | Yes | FK to ProcessedDocument |
| relationship_type | Enum | Yes | SIMILAR_TOPIC, SAME_DOMAIN, TREND_CORRELATION |
| similarity_score | Float | Yes | 0.0-1.0 cosine similarity |
| created_at | DateTime | Yes | When relationship detected |

**Constraints**:
- (source_document_id, target_document_id) UNIQUE
- source_document_id != target_document_id

---

### CollectionJob

**Description**: Tracks each scraping run for monitoring and gap detection.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| job_type | Enum | Yes | INITIAL_LOAD, INCREMENTAL |
| status | Enum | Yes | PENDING, RUNNING, COMPLETED, FAILED |
| target_start | DateTime | Yes | Start of time range to collect |
| target_end | DateTime | Yes | End of time range to collect |
| started_at | DateTime | No | When job started |
| completed_at | DateTime | No | When job finished |
| posts_collected | Integer | No | Raw posts scraped |
| posts_processed | Integer | No | Documents created |
| posts_filtered | Integer | No | Noise items removed |
| error_message | Text | No | Error details if failed |

**Indexes**:
- status (for finding pending/failed jobs)
- target_end (for gap detection)

---

## Enums

### Trend
```
RISING     - Increasing discussion volume
STABLE     - Consistent discussion volume
DECLINING  - Decreasing discussion volume
```

### Sentiment
```
POSITIVE   - Favorable/optimistic content
NEUTRAL    - Factual/balanced content
NEGATIVE   - Critical/pessimistic content
```

### JobType
```
INITIAL_LOAD  - One-time historical data load
INCREMENTAL   - Hourly delta collection
```

### JobStatus
```
PENDING    - Scheduled but not started
RUNNING    - Currently executing
COMPLETED  - Successfully finished
FAILED     - Encountered error
```

### RelationshipType
```
SIMILAR_TOPIC      - Documents discuss similar problems
SAME_DOMAIN        - Documents in same domain category
TREND_CORRELATION  - Documents show correlated trends
```

---

## State Transitions

### CollectionJob Lifecycle

```
PENDING ──▶ RUNNING ──▶ COMPLETED
              │
              ▼
           FAILED
```

### Document Processing Flow

```
RawPost (created)
    │
    ▼
[LLM Classification]
    │
    ├── Is Noise? ──▶ Delete RawPost (logged as filtered)
    │
    └── Is Valid? ──▶ ProcessedDocument (created)
                         │
                         ├──▶ DocumentEmbedding (ChromaDB)
                         │
                         ├──▶ DocumentSummary (PostgreSQL)
                         │
                         └──▶ DocumentRelationship (if similar docs exist)
                         │
                         ▼
                      Delete RawPost
```

---

## Database Schema (PostgreSQL)

```sql
-- Enums
CREATE TYPE trend_type AS ENUM ('RISING', 'STABLE', 'DECLINING');
CREATE TYPE sentiment_type AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');
CREATE TYPE job_type AS ENUM ('INITIAL_LOAD', 'INCREMENTAL');
CREATE TYPE job_status AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');
CREATE TYPE relationship_type AS ENUM ('SIMILAR_TOPIC', 'SAME_DOMAIN', 'TREND_CORRELATION');

-- Tables
CREATE TABLE collection_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type job_type NOT NULL,
    status job_status NOT NULL DEFAULT 'PENDING',
    target_start TIMESTAMPTZ NOT NULL,
    target_end TIMESTAMPTZ NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    posts_collected INTEGER,
    posts_processed INTEGER,
    posts_filtered INTEGER,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE raw_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_url VARCHAR(2048) NOT NULL UNIQUE,
    content TEXT NOT NULL,
    author_hash VARCHAR(64),
    posted_at TIMESTAMPTZ NOT NULL,
    scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    collection_job_id UUID REFERENCES collection_jobs(id)
);

CREATE TABLE document_summaries (
    id UUID PRIMARY KEY,
    source_url VARCHAR(2048) NOT NULL UNIQUE,
    title VARCHAR(500) NOT NULL,
    keywords TEXT[] NOT NULL,
    domain_tag VARCHAR(50) NOT NULL,
    trend trend_type NOT NULL,
    sentiment sentiment_type NOT NULL,
    posted_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE document_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_document_id UUID NOT NULL,
    target_document_id UUID NOT NULL,
    relationship_type relationship_type NOT NULL,
    similarity_score FLOAT NOT NULL CHECK (similarity_score >= 0 AND similarity_score <= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(source_document_id, target_document_id),
    CHECK(source_document_id != target_document_id)
);

-- Indexes
CREATE INDEX idx_jobs_status ON collection_jobs(status);
CREATE INDEX idx_jobs_target_end ON collection_jobs(target_end);
CREATE INDEX idx_summaries_domain ON document_summaries(domain_tag);
CREATE INDEX idx_summaries_posted ON document_summaries(posted_at DESC);
CREATE INDEX idx_summaries_keywords ON document_summaries USING GIN(keywords);
CREATE INDEX idx_relationships_source ON document_relationships(source_document_id);
CREATE INDEX idx_relationships_target ON document_relationships(target_document_id);
```

---

## Vector DB Schema (ChromaDB)

```python
# Collection: market_documents
{
    "name": "market_documents",
    "metadata": {
        "description": "Processed market problem documents for RAG",
        "embedding_model": "text-embedding-3-small",
        "dimensions": 1536
    }
}

# Document format
{
    "id": "uuid-string",
    "embedding": [1536 floats],
    "metadata": {
        "source_url": "https://...",
        "title": "...",
        "content": "...",
        "keywords": ["kw1", "kw2"],
        "domain_tag": "real_estate",
        "trend": "RISING",
        "sentiment": "NEGATIVE",
        "posted_at": "2025-01-15T10:30:00Z",
        "processed_at": "2025-01-15T11:00:00Z"
    }
}
```

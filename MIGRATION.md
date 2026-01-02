# Vercel + Supabase Migration Guide

## Project Migration Overview

This document outlines the migration of the PPP (Problem-to-Product Pipeline) application from the current architecture to a modern, serverless deployment using Vercel and Supabase.

### Current Architecture

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 14 (App Router) |
| Backend API | FastAPI (Python 3.11+) |
| Database | SQLite + SQLAlchemy (async) |
| Vector Search | ChromaDB |
| Authentication | Custom JWT (httpOnly cookies) |
| Payments | Toss Payments SDK |

### Target Architecture

| Component | Technology |
|-----------|------------|
| Frontend + API | Next.js 14 on Vercel |
| Database | Supabase PostgreSQL |
| Vector Search | Supabase pgvector |
| Authentication | Custom JWT (preserved) |
| Payments | Toss Payments (preserved) |
| Data Pipeline | Separate Python service |

---

## Migration Phases

### Phase 1: Supabase Setup

#### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down:
   - Project URL: `https://xxx.supabase.co`
   - API Key (anon): `eyJ...`
   - Service Role Key: `eyJ...`
   - Database URL: `postgresql://postgres:[password]@db.xxx.supabase.co:5432/postgres`

#### 1.2 Enable pgvector Extension
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

#### 1.3 Database Schema

Execute the following SQL in Supabase SQL Editor:

```sql
-- Enums
CREATE TYPE auth_provider AS ENUM ('LOCAL', 'GOOGLE');
CREATE TYPE generation_status AS ENUM ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED');
CREATE TYPE trend AS ENUM ('RISING', 'STABLE', 'DECLINING');
CREATE TYPE sentiment AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');
CREATE TYPE relationship_type AS ENUM ('SIMILAR_TOPIC', 'SAME_DOMAIN', 'RELATED_KEYWORDS');
CREATE TYPE job_type AS ENUM ('INITIAL_LOAD', 'INCREMENTAL');
CREATE TYPE job_status AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    nickname VARCHAR(100),
    password_hash VARCHAR(255),
    auth_provider auth_provider NOT NULL DEFAULT 'LOCAL',
    google_id VARCHAR(255) UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- Refresh Tokens
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    device_info VARCHAR(500),
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Document Summaries (Problems) with Vector Embedding
CREATE TABLE document_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_url VARCHAR(2048) NOT NULL UNIQUE,
    title VARCHAR(500) NOT NULL,
    keywords JSONB NOT NULL DEFAULT '[]',
    domain_tag VARCHAR(50) NOT NULL,
    trend trend NOT NULL,
    sentiment sentiment NOT NULL,
    posted_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    embedding vector(1536)
);

-- Document Relationships
CREATE TABLE document_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_document_id UUID NOT NULL REFERENCES document_summaries(id) ON DELETE CASCADE,
    target_document_id UUID NOT NULL REFERENCES document_summaries(id) ON DELETE CASCADE,
    relationship_type relationship_type NOT NULL,
    similarity_score FLOAT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Generation Sessions
CREATE TABLE generation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    problem_id UUID NOT NULL,
    status generation_status NOT NULL DEFAULT 'PENDING',
    feedback TEXT,
    error_message TEXT,
    rag_context JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Generated Ideas
CREATE TABLE generated_ideas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES generation_sessions(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    target_audience TEXT NOT NULL,
    differentiators JSONB NOT NULL DEFAULT '[]',
    market_opportunity TEXT NOT NULL,
    implementation_hints TEXT NOT NULL,
    market_signals JSONB DEFAULT '[]',
    confidence_score FLOAT,
    is_bookmarked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Saved Ideas
CREATE TABLE saved_ideas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    idea_id UUID NOT NULL REFERENCES generated_ideas(id) ON DELETE CASCADE,
    notes TEXT,
    saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, idea_id)
);

-- Collection Jobs (for data pipeline)
CREATE TABLE collection_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type job_type NOT NULL,
    status job_status NOT NULL DEFAULT 'PENDING',
    target_start TIMESTAMPTZ,
    target_end TIMESTAMPTZ,
    posts_collected INT NOT NULL DEFAULT 0,
    posts_processed INT NOT NULL DEFAULT 0,
    posts_filtered INT NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Raw Posts (for data pipeline)
CREATE TABLE raw_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_url VARCHAR(2048) NOT NULL UNIQUE,
    content TEXT NOT NULL,
    author_hash VARCHAR(64),
    posted_at TIMESTAMPTZ NOT NULL,
    scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    collection_job_id UUID REFERENCES collection_jobs(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX ix_users_email ON users(email);
CREATE INDEX ix_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX ix_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX ix_document_summaries_domain ON document_summaries(domain_tag);
CREATE INDEX ix_document_summaries_trend ON document_summaries(trend);
CREATE INDEX ix_document_summaries_embedding ON document_summaries
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX ix_generation_sessions_user_id ON generation_sessions(user_id);
CREATE INDEX ix_generation_sessions_problem_id ON generation_sessions(problem_id);
CREATE INDEX ix_generated_ideas_session_id ON generated_ideas(session_id);
CREATE INDEX ix_saved_ideas_user_id ON saved_ideas(user_id);
```

#### 1.4 Vector Search Function

```sql
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 5,
    filter_domain varchar DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    title varchar,
    keywords jsonb,
    domain_tag varchar,
    trend trend,
    sentiment sentiment,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ds.id,
        ds.title,
        ds.keywords,
        ds.domain_tag,
        ds.trend,
        ds.sentiment,
        1 - (ds.embedding <=> query_embedding) as similarity
    FROM document_summaries ds
    WHERE
        ds.embedding IS NOT NULL
        AND 1 - (ds.embedding <=> query_embedding) > match_threshold
        AND (filter_domain IS NULL OR ds.domain_tag = filter_domain)
    ORDER BY ds.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
```

---

### Phase 2: New Dependencies

Add to `frontend/package.json`:

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "jose": "^5.2.0",
    "bcryptjs": "^2.4.3",
    "openai": "^4.28.0"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6"
  }
}
```

---

### Phase 3: Shared Utilities

Create these files in `frontend/src/lib/`:

| File | Description |
|------|-------------|
| `supabase.ts` | Supabase client initialization |
| `jwt.ts` | JWT token creation/verification |
| `password.ts` | Password hashing with bcrypt |
| `vector-search.ts` | pgvector similarity search |
| `ai-agent.ts` | OpenAI integration for idea generation |
| `auth-middleware.ts` | Request authentication helper |

---

### Phase 4: API Route Conversion

Convert FastAPI endpoints to Next.js API Routes:

#### Directory Structure
```
frontend/src/app/api/
├── auth/
│   ├── register/route.ts
│   ├── login/route.ts
│   ├── logout/route.ts
│   ├── refresh/route.ts
│   ├── google/route.ts
│   ├── forgot-password/route.ts
│   └── reset-password/route.ts
├── discovery/
│   ├── problems/route.ts
│   ├── problems/[id]/route.ts
│   └── domains/route.ts
├── ideas/
│   ├── generate/route.ts
│   ├── sessions/route.ts
│   ├── sessions/[id]/route.ts
│   ├── problem/[problemId]/latest/route.ts
│   ├── [ideaId]/save/route.ts
│   ├── [ideaId]/saved-status/route.ts
│   ├── [ideaId]/bookmark/route.ts
│   ├── saved/route.ts
│   ├── saved/[savedId]/route.ts
│   └── bookmarked/route.ts
├── users/
│   └── me/route.ts
└── payment/
    ├── confirm/route.ts
    ├── fail/route.ts
    └── status/[orderId]/route.ts
```

---

### Phase 5: Environment Variables

#### Vercel Dashboard Configuration

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://...

# Authentication
JWT_SECRET_KEY=your-secure-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# AI/LLM
OPENAI_API_KEY=sk-...

# OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com

# Payments
TOSS_PAYMENTS_SECRET_KEY=test_sk_...
TOSS_PAYMENTS_CLIENT_KEY=test_ck_...

# Email (optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=...
SMTP_PASSWORD=...
```

---

### Phase 6: Vercel Deployment

#### Create `frontend/vercel.json`
```json
{
  "framework": "nextjs",
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 60
    }
  }
}
```

#### Deploy Commands
```bash
cd frontend
npm install
vercel --prod
```

---

### Phase 7: Data Pipeline (Separate Service)

The Python data pipeline (scraping, processing) will run as a separate service:

**Files to keep:**
- `src/services/pipeline.py`
- `src/services/dedup.py`
- `src/agents/` directory

**Deployment options:**
- Railway
- Render
- AWS Lambda
- VPS with cron

**Connection:** Same Supabase PostgreSQL database

---

## Data Migration Script

Create `scripts/migrate_to_supabase.py`:

```python
import asyncio
import os
from sqlalchemy import create_engine
from supabase import create_client
import openai

# Configuration
SQLITE_PATH = "data/app.db"
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]

async def migrate():
    # 1. Connect to SQLite
    # 2. Connect to Supabase
    # 3. For each table, read and insert
    # 4. Generate embeddings for document_summaries
    pass

if __name__ == "__main__":
    asyncio.run(migrate())
```

---

## Rollback Plan

If migration fails:
1. Keep FastAPI backend running until fully migrated
2. DNS can quickly switch back to original backend
3. SQLite database remains as backup

---

## Post-Migration Cleanup

After successful migration:
1. Remove Python backend files from main branch
2. Archive `src/` directory
3. Update CI/CD to only build frontend
4. Update README.md with new architecture

---

## Implementation Order

| Step | Task | Files |
|------|------|-------|
| 1 | Supabase project setup | Supabase dashboard |
| 2 | Create database schema | SQL in Supabase |
| 3 | Data migration script | `scripts/migrate_to_supabase.py` |
| 4 | Install new dependencies | `frontend/package.json` |
| 5 | Create shared utilities | `frontend/src/lib/*.ts` |
| 6 | Auth API routes (7) | `frontend/src/app/api/auth/` |
| 7 | Discovery API routes (3) | `frontend/src/app/api/discovery/` |
| 8 | Ideas API routes (10) | `frontend/src/app/api/ideas/` |
| 9 | Users API route (1) | `frontend/src/app/api/users/` |
| 10 | Payment API routes (3) | `frontend/src/app/api/payment/` |
| 11 | Update frontend API client | `frontend/src/lib/api.ts` |
| 12 | Create Vercel config | `frontend/vercel.json` |
| 13 | Deploy to Vercel | CLI |
| 14 | Separate data pipeline | Railway/Render |

---

## Critical Files Reference

| Purpose | Source File (Python) | Target File (TypeScript) |
|---------|---------------------|-------------------------|
| Auth logic | `src/api/routers/auth.py` | `frontend/src/app/api/auth/*/route.ts` |
| JWT handling | `src/auth/jwt.py` | `frontend/src/lib/jwt.ts` |
| Password utils | `src/auth/password.py` | `frontend/src/lib/password.ts` |
| Ideas generation | `src/api/routers/ideas.py` | `frontend/src/app/api/ideas/*/route.ts` |
| RAG service | `src/services/rag_service.py` | `frontend/src/lib/vector-search.ts` |
| AI agent | `src/services/ai_agent.py` | `frontend/src/lib/ai-agent.ts` |
| Discovery | `src/api/routers/discovery.py` | `frontend/src/app/api/discovery/*/route.ts` |
| Payment | `src/api/routers/payment.py` | `frontend/src/app/api/payment/*/route.ts` |
| DB models | `src/models/*.py` | Supabase types in `frontend/src/lib/db.ts` |

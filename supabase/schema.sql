-- ===========================================
-- PPP Database Schema for Supabase
-- Run this in Supabase Dashboard > SQL Editor
-- ===========================================

-- Step 1: Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Create ENUMs
CREATE TYPE auth_provider AS ENUM ('LOCAL', 'GOOGLE');
CREATE TYPE generation_status AS ENUM ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED');
CREATE TYPE trend AS ENUM ('RISING', 'STABLE', 'DECLINING');
CREATE TYPE sentiment AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');
CREATE TYPE relationship_type AS ENUM ('SIMILAR_TOPIC', 'SAME_DOMAIN', 'RELATED_KEYWORDS');
CREATE TYPE job_type AS ENUM ('INITIAL_LOAD', 'INCREMENTAL');
CREATE TYPE job_status AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- Step 3: Create Tables

-- Users table
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

-- Refresh tokens table
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    device_info VARCHAR(500),
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Document summaries (problems) with vector embedding
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

-- Document relationships
CREATE TABLE document_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_document_id UUID NOT NULL REFERENCES document_summaries(id) ON DELETE CASCADE,
    target_document_id UUID NOT NULL REFERENCES document_summaries(id) ON DELETE CASCADE,
    relationship_type relationship_type NOT NULL,
    similarity_score FLOAT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Generation sessions
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

-- Generated ideas
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

-- Saved ideas
CREATE TABLE saved_ideas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    idea_id UUID NOT NULL REFERENCES generated_ideas(id) ON DELETE CASCADE,
    notes TEXT,
    saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, idea_id)
);

-- Collection jobs (for data pipeline)
CREATE TABLE collection_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type job_type NOT NULL,
    status job_status NOT NULL DEFAULT 'PENDING',
    target_start TIMESTAMPTZ,
    target_end TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    posts_collected INT NOT NULL DEFAULT 0,
    posts_processed INT NOT NULL DEFAULT 0,
    posts_filtered INT NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Raw posts (for data pipeline)
CREATE TABLE raw_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_url VARCHAR(2048) NOT NULL UNIQUE,
    content TEXT NOT NULL,
    author_hash VARCHAR(64),
    posted_at TIMESTAMPTZ NOT NULL,
    scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    collection_job_id UUID REFERENCES collection_jobs(id) ON DELETE SET NULL
);

-- Step 4: Create Indexes
CREATE INDEX ix_users_email ON users(email);
CREATE INDEX ix_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX ix_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX ix_document_summaries_domain ON document_summaries(domain_tag);
CREATE INDEX ix_document_summaries_trend ON document_summaries(trend);
CREATE INDEX ix_document_summaries_sentiment ON document_summaries(sentiment);
CREATE INDEX ix_document_summaries_posted_at ON document_summaries(posted_at);
CREATE INDEX ix_document_relationships_source ON document_relationships(source_document_id);
CREATE INDEX ix_generation_sessions_user_id ON generation_sessions(user_id);
CREATE INDEX ix_generation_sessions_problem_id ON generation_sessions(problem_id);
CREATE INDEX ix_generated_ideas_session_id ON generated_ideas(session_id);
CREATE INDEX ix_saved_ideas_user_id ON saved_ideas(user_id);
CREATE INDEX ix_saved_ideas_idea_id ON saved_ideas(idea_id);

-- Step 5: Create pgvector index (run after data is loaded for better performance)
-- Note: IVFFlat index requires some data to exist first
-- CREATE INDEX ix_document_summaries_embedding ON document_summaries
--     USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Step 6: Create vector search function
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

-- Step 7: Enable Row Level Security (RLS) - Optional but recommended
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE generation_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE generated_ideas ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE saved_ideas ENABLE ROW LEVEL SECURITY;

-- Success message
SELECT 'Schema created successfully!' as status;

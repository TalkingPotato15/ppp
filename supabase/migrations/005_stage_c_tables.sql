-- Migration: Add Stage C tables
-- Feature: 005-stage-c-execution
-- Run this in Supabase SQL Editor

-- 1. Create enum for specification status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'spec_status') THEN
        CREATE TYPE spec_status AS ENUM ('generating', 'completed', 'failed');
    END IF;
END$$;

-- 2. Create technical_specifications table
CREATE TABLE IF NOT EXISTS technical_specifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    idea_id UUID NOT NULL REFERENCES generated_ideas(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL DEFAULT 1,
    constraints_snapshot JSONB NOT NULL,
    prd_content JSONB NOT NULL,
    architecture_content JSONB NOT NULL,
    roadmap_content JSONB NOT NULL,
    techstack_content JSONB NOT NULL,
    status spec_status NOT NULL DEFAULT 'generating',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT unique_spec_version UNIQUE (idea_id, version_number),
    CONSTRAINT valid_version_number CHECK (version_number >= 1 AND version_number <= 4)
);

-- 3. Create regeneration_quotas table
CREATE TABLE IF NOT EXISTS regeneration_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    idea_id UUID NOT NULL REFERENCES generated_ideas(id) ON DELETE CASCADE,
    used_count INTEGER NOT NULL DEFAULT 0,
    max_count INTEGER NOT NULL DEFAULT 3,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_idea_quota UNIQUE (user_id, idea_id),
    CONSTRAINT valid_quota_count CHECK (used_count >= 0 AND used_count <= max_count)
);

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_tech_specs_user_id ON technical_specifications(user_id);
CREATE INDEX IF NOT EXISTS idx_tech_specs_idea_id ON technical_specifications(idea_id);
CREATE INDEX IF NOT EXISTS idx_tech_specs_status ON technical_specifications(status);
CREATE INDEX IF NOT EXISTS idx_regen_quotas_user_idea ON regeneration_quotas(user_id, idea_id);

-- 5. Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_regen_quota_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_regen_quota_updated_at ON regeneration_quotas;
CREATE TRIGGER trg_regen_quota_updated_at
    BEFORE UPDATE ON regeneration_quotas
    FOR EACH ROW EXECUTE FUNCTION update_regen_quota_timestamp();

-- Success message
SELECT 'Stage C tables created successfully!' as status;

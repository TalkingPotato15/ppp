-- ===========================================
-- Migration: Payment-Generation Linking
-- Purpose: Link payments to idea generation sessions
-- Date: 2026-01-03
-- ===========================================

-- Step 1: Create payment_sessions table (persistent storage for payments)
CREATE TABLE IF NOT EXISTS payment_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    problem_id UUID NOT NULL,  -- References document_summaries
    order_id VARCHAR(100) NOT NULL UNIQUE,
    payment_key VARCHAR(255),
    amount INT NOT NULL,
    order_name VARCHAR(100) NOT NULL,
    customer_data JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    toss_response JSONB,
    error_code VARCHAR(50),
    error_message TEXT
);

-- Step 2: Add payment_id to generation_sessions
ALTER TABLE generation_sessions
ADD COLUMN IF NOT EXISTS payment_id UUID UNIQUE;

-- Step 3: Add is_deleted to generated_ideas (soft delete)
ALTER TABLE generated_ideas
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS ix_payment_sessions_user_id ON payment_sessions(user_id);
CREATE INDEX IF NOT EXISTS ix_payment_sessions_problem_id ON payment_sessions(problem_id);
CREATE INDEX IF NOT EXISTS ix_payment_sessions_status ON payment_sessions(status);
CREATE INDEX IF NOT EXISTS ix_payment_sessions_is_used ON payment_sessions(is_used) WHERE is_used = FALSE;
CREATE INDEX IF NOT EXISTS ix_generation_sessions_payment_id ON generation_sessions(payment_id);
CREATE INDEX IF NOT EXISTS ix_generated_ideas_is_deleted ON generated_ideas(is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS ix_generated_ideas_is_bookmarked ON generated_ideas(is_bookmarked) WHERE is_bookmarked = TRUE;

-- Step 5: Create helper function to get unused payment
CREATE OR REPLACE FUNCTION get_unused_payment(
    p_user_id UUID,
    p_problem_id UUID
)
RETURNS TABLE (
    id UUID,
    order_id VARCHAR,
    amount INT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ps.id,
        ps.order_id,
        ps.amount,
        ps.created_at
    FROM payment_sessions ps
    WHERE ps.user_id = p_user_id
      AND ps.problem_id = p_problem_id
      AND ps.status = 'SUCCESS'
      AND ps.is_used = FALSE
    ORDER BY ps.created_at DESC
    LIMIT 1;
END;
$$;

-- Step 6: Create helper function to mark payment as used
CREATE OR REPLACE FUNCTION mark_payment_used(
    p_payment_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    rows_updated INT;
BEGIN
    UPDATE payment_sessions
    SET is_used = TRUE,
        used_at = NOW(),
        updated_at = NOW()
    WHERE id = p_payment_id
      AND is_used = FALSE;

    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RETURN rows_updated > 0;
END;
$$;

-- Success message
SELECT 'Migration 001_payment_generation_linking completed!' as status;

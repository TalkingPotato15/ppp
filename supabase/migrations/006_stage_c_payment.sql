-- ===========================================
-- Migration: Stage C Payment Support
-- Purpose: Add idea_id and product_type for Stage C payments
-- Date: 2026-01-04
-- ===========================================

-- Step 1: Add product_type column
ALTER TABLE payment_sessions
ADD COLUMN IF NOT EXISTS product_type VARCHAR(20) DEFAULT 'STAGE_B';

-- Step 2: Add idea_id column (nullable, for Stage C payments)
ALTER TABLE payment_sessions
ADD COLUMN IF NOT EXISTS idea_id UUID;

-- Step 3: Make problem_id nullable (Stage C doesn't need it)
ALTER TABLE payment_sessions
ALTER COLUMN problem_id DROP NOT NULL;

-- Step 4: Create index for idea_id
CREATE INDEX IF NOT EXISTS ix_payment_sessions_idea_id ON payment_sessions(idea_id);
CREATE INDEX IF NOT EXISTS ix_payment_sessions_product_type ON payment_sessions(product_type);

-- Step 5: Create helper function to get unused Stage C payment
CREATE OR REPLACE FUNCTION get_unused_stage_c_payment(
    p_user_id UUID,
    p_idea_id UUID
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
      AND ps.idea_id = p_idea_id
      AND ps.product_type = 'STAGE_C'
      AND ps.status = 'SUCCESS'
      AND ps.is_used = FALSE
    ORDER BY ps.created_at DESC
    LIMIT 1;
END;
$$;

-- Success message
SELECT 'Migration 006_stage_c_payment completed!' as status;

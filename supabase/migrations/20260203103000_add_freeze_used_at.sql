-- Add freeze_used_at column to track when lifeline was actually used
-- This fixes the global cooldown check which was incorrectly using updated_at

ALTER TABLE commitments
ADD COLUMN IF NOT EXISTS freeze_used_at TIMESTAMPTZ DEFAULT NULL;

-- Backfill: For existing rows where is_freeze_used = true, set freeze_used_at to updated_at
-- This is a best-effort approximation for historical data
UPDATE commitments
SET freeze_used_at = updated_at
WHERE is_freeze_used = true AND freeze_used_at IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN commitments.freeze_used_at IS 'Timestamp when lifeline (freeze) was used. Used for 30-day global cooldown check.';

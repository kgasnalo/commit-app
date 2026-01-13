-- Phase 7.4: The Reaper - Add defaulted_at to commitments
-- Tracks when a commitment was marked as defaulted (deadline missed)

-- Add defaulted_at timestamp column
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS defaulted_at TIMESTAMPTZ;

-- Create partial index for finding expired pending commitments efficiently
-- Used by the Reaper cron job to find commitments that need processing
CREATE INDEX IF NOT EXISTS idx_commitments_expired_pending
  ON commitments(deadline, status)
  WHERE status = 'pending';

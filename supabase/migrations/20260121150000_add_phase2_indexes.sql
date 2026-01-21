-- Phase 2C: Additional performance indexes
-- For Reaper cron job and commitment queries

-- ============================================
-- commitments table - deadline optimization
-- ============================================

-- Index for deadline-based queries (used by Reaper, expiring commitments)
CREATE INDEX IF NOT EXISTS idx_commitments_deadline
  ON commitments(deadline);

-- Composite index for Reaper query pattern:
-- "Get all pending commitments past deadline"
CREATE INDEX IF NOT EXISTS idx_commitments_user_status_deadline
  ON commitments(user_id, status, deadline);

-- Index for updated_at ordering (used by Library, History screens)
CREATE INDEX IF NOT EXISTS idx_commitments_updated_at
  ON commitments(updated_at DESC);

-- ============================================
-- penalty_charges table indexes
-- ============================================

-- Index for user-based queries (used by Admin Dashboard)
CREATE INDEX IF NOT EXISTS idx_penalty_charges_user_id
  ON penalty_charges(user_id);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_penalty_charges_charge_status
  ON penalty_charges(charge_status);

-- Composite index for commitment lookups
CREATE INDEX IF NOT EXISTS idx_penalty_charges_commitment_id
  ON penalty_charges(commitment_id);

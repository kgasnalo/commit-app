-- Phase 7.4: The Reaper - Penalty Charges Table
-- Tracks all penalty charge attempts for defaulted commitments
--
-- Design Rationale:
-- - Separate table (not fields on commitments) for audit trail, idempotency, and analytics
-- - UNIQUE(commitment_id) ensures one charge record per commitment
-- - charge_status tracks the lifecycle: pending -> processing -> succeeded/failed/requires_action

CREATE TABLE penalty_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commitment_id UUID NOT NULL REFERENCES commitments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Charge details
  amount INTEGER NOT NULL,  -- Amount in smallest currency unit (e.g., yen for JPY)
  currency TEXT NOT NULL DEFAULT 'JPY',

  -- Stripe tracking
  stripe_payment_intent_id TEXT,
  stripe_customer_id TEXT,
  stripe_payment_method_id TEXT,

  -- Status tracking
  charge_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (charge_status IN ('pending', 'processing', 'succeeded', 'failed', 'requires_action')),
  failure_reason TEXT,
  failure_code TEXT,

  -- Retry tracking
  attempt_count INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one charge record per commitment (idempotency)
  UNIQUE(commitment_id)
);

-- Indexes for common queries
CREATE INDEX idx_penalty_charges_user_id ON penalty_charges(user_id);
CREATE INDEX idx_penalty_charges_status ON penalty_charges(charge_status);
CREATE INDEX idx_penalty_charges_commitment ON penalty_charges(commitment_id);

-- Index for retry queries (find failed charges that need retry)
CREATE INDEX idx_penalty_charges_retry
  ON penalty_charges(next_retry_at)
  WHERE charge_status = 'failed' AND attempt_count < 3;

-- Enable Row Level Security
ALTER TABLE penalty_charges ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own charges
CREATE POLICY "Users can view own penalty charges"
  ON penalty_charges FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Service role can manage all charges (for Edge Functions)
CREATE POLICY "Service role can manage all penalty charges"
  ON penalty_charges FOR ALL
  TO service_role
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_penalty_charges_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_penalty_charges_updated_at
  BEFORE UPDATE ON penalty_charges
  FOR EACH ROW
  EXECUTE FUNCTION update_penalty_charges_updated_at();

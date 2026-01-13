-- Phase 7.7: Admin Dashboard Support
-- 1. Add 'refunded' to penalty_charges status
-- 2. Create Audit Logs

-- 1. Modify penalty_charges constraint
ALTER TABLE penalty_charges DROP CONSTRAINT IF EXISTS penalty_charges_charge_status_check;

ALTER TABLE penalty_charges 
ADD CONSTRAINT penalty_charges_charge_status_check 
CHECK (charge_status IN ('pending', 'processing', 'succeeded', 'failed', 'requires_action', 'refunded'));

-- 2. Create Admin Audit Logs
CREATE TABLE admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id), -- Nullable if we want to track system actions, but for admin actions should be set
  admin_email TEXT NOT NULL, -- Snapshot of email at time of action
  action_type TEXT NOT NULL, -- 'REFUND', 'MARK_COMPLETE', 'VIEW_DETAILS'
  target_resource_table TEXT NOT NULL, -- 'commitments', 'penalty_charges'
  target_resource_id UUID NOT NULL,
  details JSONB, -- Previous state, new state, reason, etc.
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only Service Role can Insert/Select (Admin Dashboard via Edge Function)
CREATE POLICY "Service Role can manage audit logs"
  ON admin_audit_logs
  FOR ALL
  TO service_role
  USING (true);

-- No public access
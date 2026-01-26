-- Phase 9.3: Security Audit - Remove PII from admin_audit_logs
-- GDPR compliance: Email addresses should not be stored in audit logs
-- Use admin_user_id to JOIN with users table when email is needed

-- Remove the admin_email column (it stored email addresses - PII violation)
ALTER TABLE admin_audit_logs DROP COLUMN IF EXISTS admin_email;

-- Add index on admin_user_id for efficient lookups (if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_audit_logs' AND column_name = 'admin_user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_user_id
      ON admin_audit_logs(admin_user_id);
  END IF;
END $$;

-- Add index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at
  ON admin_audit_logs(created_at);

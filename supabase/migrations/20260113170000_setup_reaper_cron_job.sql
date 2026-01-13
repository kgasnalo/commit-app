-- Phase 7.4: The Reaper - pg_cron Job Setup
-- This migration sets up the automated deadline enforcer cron job

-- Step 1: Enable pg_cron extension (requires it to be enabled in Dashboard first)
-- Note: pg_cron must be enabled via Supabase Dashboard > Database > Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Step 2: Create Vault secrets for secure credential storage
-- These secrets are used by the cron job to authenticate with the Edge Function
SELECT vault.create_secret(
  'https://rnksvjjcsnwlquaynduu.supabase.co',
  'supabase_url'
);

SELECT vault.create_secret(
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJua3N2ampjc253bHF1YXluZHV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjYzMzQ5MywiZXhwIjoyMDgyMjA5NDkzfQ.N5_N1zSyXBZRa88AvspAe5PT9Eu63l8TxHv7EPfXNHE',
  'service_role_key'
);

-- Step 3: Schedule the hourly Reaper job
-- Runs every hour at :00 to process expired commitments
SELECT cron.schedule(
  'reaper-process-expired-commitments',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url')
           || '/functions/v1/process-expired-commitments',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object(
      'triggered_at', NOW()::text,
      'source', 'pg_cron_reaper'
    )
  ) AS request_id;
  $$
);

-- Step 4: Schedule the retry job for failed charges
-- Runs every 4 hours to retry failed payment attempts
SELECT cron.schedule(
  'reaper-retry-failed-charges',
  '0 */4 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url')
           || '/functions/v1/process-expired-commitments',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object(
      'triggered_at', NOW()::text,
      'source', 'pg_cron_reaper_retry',
      'retry_mode', true
    )
  ) AS request_id;
  $$
);

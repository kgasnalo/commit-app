-- Phase 7.4: Update cron job to use CRON_SECRET instead of SERVICE_ROLE_KEY
-- This provides a more reliable authentication method

-- Delete old service_role_key secret and add cron_secret
DO $$
BEGIN
  -- Try to delete old secret if it exists
  PERFORM vault.delete_secret('service_role_key');
EXCEPTION WHEN OTHERS THEN
  -- Ignore if not exists
  NULL;
END $$;

-- Create new secret with CRON_SECRET
SELECT vault.create_secret(
  'reaper-secret-2026-commit-app',
  'cron_secret'
);

-- Unschedule old jobs if they exist
SELECT cron.unschedule('reaper-process-expired-commitments');
SELECT cron.unschedule('reaper-retry-failed-charges');

-- Re-schedule with CRON_SECRET
SELECT cron.schedule(
  'reaper-process-expired-commitments',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url')
           || '/functions/v1/process-expired-commitments',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := jsonb_build_object(
      'triggered_at', NOW()::text,
      'source', 'pg_cron_reaper'
    )
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'reaper-retry-failed-charges',
  '0 */4 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url')
           || '/functions/v1/process-expired-commitments',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := jsonb_build_object(
      'triggered_at', NOW()::text,
      'source', 'pg_cron_reaper_retry',
      'retry_mode', true
    )
  ) AS request_id;
  $$
);

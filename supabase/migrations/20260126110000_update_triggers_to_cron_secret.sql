-- Phase 9.3: Security Audit - Use CRON_SECRET for DB trigger authentication
-- Using dedicated CRON_SECRET instead of SERVICE_ROLE_KEY for system-to-system calls
-- This follows the security best practice of least privilege

-- First, we need to store CRON_SECRET in vault
-- Run this manually in SQL editor:
-- SELECT vault.create_secret('YOUR_CRON_SECRET_HERE', 'cron_secret');

-- ========================================
-- Updated Trigger Function: Notify on Announcement Publish
-- ========================================
CREATE OR REPLACE FUNCTION notify_announcement_published()
RETURNS TRIGGER AS $$
DECLARE
  v_supabase_url TEXT;
  v_cron_secret TEXT;
  v_title TEXT;
  v_body TEXT;
BEGIN
  -- Only fire when published_at changes from NULL to non-NULL
  IF OLD.published_at IS NULL AND NEW.published_at IS NOT NULL THEN
    -- Get secrets from Vault (using cron_secret instead of service_role_key)
    SELECT decrypted_secret INTO v_supabase_url
    FROM vault.decrypted_secrets WHERE name = 'supabase_url';

    SELECT decrypted_secret INTO v_cron_secret
    FROM vault.decrypted_secrets WHERE name = 'cron_secret';

    -- Fallback to service_role_key if cron_secret is not set
    IF v_cron_secret IS NULL THEN
      SELECT decrypted_secret INTO v_cron_secret
      FROM vault.decrypted_secrets WHERE name = 'service_role_key';
    END IF;

    -- Prepare notification content
    v_title := '📢 ' || NEW.title;
    v_body := LEFT(NEW.body, 100);
    IF LENGTH(NEW.body) > 100 THEN
      v_body := v_body || '...';
    END IF;

    -- Send push notification via Edge Function
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_cron_secret
      ),
      body := jsonb_build_object(
        'broadcast', true,
        'title', v_title,
        'body', v_body,
        'data', jsonb_build_object(
          'type', 'announcement',
          'announcement_id', NEW.id
        )
      )
    );

    RAISE NOTICE 'Push notification triggered for announcement: %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- Updated Trigger Function: Notify on Donation Posted
-- ========================================
CREATE OR REPLACE FUNCTION notify_donation_posted()
RETURNS TRIGGER AS $$
DECLARE
  v_supabase_url TEXT;
  v_cron_secret TEXT;
  v_title TEXT;
  v_body TEXT;
  v_amount_formatted TEXT;
BEGIN
  -- Get secrets from Vault (using cron_secret instead of service_role_key)
  SELECT decrypted_secret INTO v_supabase_url
  FROM vault.decrypted_secrets WHERE name = 'supabase_url';

  SELECT decrypted_secret INTO v_cron_secret
  FROM vault.decrypted_secrets WHERE name = 'cron_secret';

  -- Fallback to service_role_key if cron_secret is not set
  IF v_cron_secret IS NULL THEN
    SELECT decrypted_secret INTO v_cron_secret
    FROM vault.decrypted_secrets WHERE name = 'service_role_key';
  END IF;

  -- Format amount based on currency
  IF NEW.currency = 'JPY' THEN
    v_amount_formatted := '¥' || TO_CHAR(NEW.amount, 'FM999,999,999');
  ELSE
    v_amount_formatted := NEW.currency || ' ' || TO_CHAR(NEW.amount / 100.0, 'FM999,999,999.00');
  END IF;

  -- Prepare notification content
  v_title := '❤️ 寄付報告';
  v_body := NEW.quarter || ': ' || v_amount_formatted || ' を ' || NEW.recipient_name || ' に寄付しました';

  -- Send push notification via Edge Function
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_cron_secret
    ),
    body := jsonb_build_object(
      'broadcast', true,
      'title', v_title,
      'body', v_body,
      'data', jsonb_build_object(
        'type', 'donation',
        'donation_id', NEW.id
      )
    )
  );

  RAISE NOTICE 'Push notification triggered for donation: %', NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- Comments
-- ========================================
COMMENT ON FUNCTION notify_announcement_published() IS
  'Sends push notification to all users when an announcement is published. Uses CRON_SECRET for authentication with fallback to SERVICE_ROLE_KEY.';

COMMENT ON FUNCTION notify_donation_posted() IS
  'Sends push notification to all users when a new donation report is posted. Uses CRON_SECRET for authentication with fallback to SERVICE_ROLE_KEY.';

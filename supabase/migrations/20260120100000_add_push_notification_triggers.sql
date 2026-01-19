-- Phase 8.5: Push Notification Triggers for Announcements and Donations
-- This migration creates database triggers that send push notifications
-- when new announcements are published or new donations are posted.

-- Enable pg_net extension for HTTP requests from database triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ========================================
-- Trigger Function: Notify on Announcement Publish
-- ========================================
-- Fires when published_at changes from NULL to non-NULL (announcement published)
CREATE OR REPLACE FUNCTION notify_announcement_published()
RETURNS TRIGGER AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_role_key TEXT;
  v_title TEXT;
  v_body TEXT;
BEGIN
  -- Only fire when published_at changes from NULL to non-NULL
  IF OLD.published_at IS NULL AND NEW.published_at IS NOT NULL THEN
    -- Get secrets from Vault
    SELECT decrypted_secret INTO v_supabase_url
    FROM vault.decrypted_secrets WHERE name = 'supabase_url';

    SELECT decrypted_secret INTO v_service_role_key
    FROM vault.decrypted_secrets WHERE name = 'service_role_key';

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
        'Authorization', 'Bearer ' || v_service_role_key
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

-- Create trigger on announcements table
DROP TRIGGER IF EXISTS trigger_announcement_published ON announcements;
CREATE TRIGGER trigger_announcement_published
  AFTER UPDATE ON announcements
  FOR EACH ROW
  EXECUTE FUNCTION notify_announcement_published();

-- ========================================
-- Trigger Function: Notify on Donation Posted
-- ========================================
-- Fires when a new donation record is inserted
CREATE OR REPLACE FUNCTION notify_donation_posted()
RETURNS TRIGGER AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_role_key TEXT;
  v_title TEXT;
  v_body TEXT;
  v_amount_formatted TEXT;
BEGIN
  -- Get secrets from Vault
  SELECT decrypted_secret INTO v_supabase_url
  FROM vault.decrypted_secrets WHERE name = 'supabase_url';

  SELECT decrypted_secret INTO v_service_role_key
  FROM vault.decrypted_secrets WHERE name = 'service_role_key';

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
      'Authorization', 'Bearer ' || v_service_role_key
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

-- Create trigger on donations table
DROP TRIGGER IF EXISTS trigger_donation_posted ON donations;
CREATE TRIGGER trigger_donation_posted
  AFTER INSERT ON donations
  FOR EACH ROW
  EXECUTE FUNCTION notify_donation_posted();

-- ========================================
-- Comments
-- ========================================
COMMENT ON FUNCTION notify_announcement_published() IS
  'Sends push notification to all users when an announcement is published (published_at changes from NULL to non-NULL)';

COMMENT ON FUNCTION notify_donation_posted() IS
  'Sends push notification to all users when a new donation report is posted';

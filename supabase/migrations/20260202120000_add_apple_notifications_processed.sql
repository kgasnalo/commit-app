-- CRITICAL-2: Apple IAP Webhook冪等性用テーブル
-- 同じnotificationUUIDを持つ通知を重複処理しないためのテーブル

CREATE TABLE IF NOT EXISTS apple_notifications_processed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_uuid TEXT NOT NULL UNIQUE,
  notification_type TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 高速検索のためのインデックス
CREATE INDEX IF NOT EXISTS idx_apple_notifications_uuid ON apple_notifications_processed(notification_uuid);
CREATE INDEX IF NOT EXISTS idx_apple_notifications_user ON apple_notifications_processed(user_id);
CREATE INDEX IF NOT EXISTS idx_apple_notifications_processed_at ON apple_notifications_processed(processed_at);

-- RLSを有効化（service_role以外のアクセスを禁止）
ALTER TABLE apple_notifications_processed ENABLE ROW LEVEL SECURITY;

-- service_roleのみフルアクセス（Edge Functionから使用）
-- 注意: service_roleはRLSをバイパスするため、明示的なポリシーは不要

-- 古いレコードを自動削除するための関数（90日以上前のレコードを削除）
CREATE OR REPLACE FUNCTION cleanup_old_apple_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM apple_notifications_processed
  WHERE processed_at < NOW() - INTERVAL '90 days';
END;
$$;

-- コメント
COMMENT ON TABLE apple_notifications_processed IS 'Apple IAP Webhook通知の処理記録（冪等性保証）';
COMMENT ON COLUMN apple_notifications_processed.notification_uuid IS 'AppleからのnotificationUUID（重複検知に使用）';
COMMENT ON COLUMN apple_notifications_processed.notification_type IS '通知タイプ（SUBSCRIBED, DID_RENEW等）';
COMMENT ON COLUMN apple_notifications_processed.user_id IS '対象ユーザー（見つからない場合はNULL）';
COMMENT ON COLUMN apple_notifications_processed.processed_at IS '処理完了時刻';

-- X自動投稿システム - pg_cron ジョブ設定
--
-- スケジュール:
-- - EN投稿生成: 12:00 UTC (21:00 JST) - 翌日分を生成
-- - JA投稿生成: 20:00 UTC (05:00 JST) - 当日分を生成
-- - 投稿実行: 毎10分 - ready状態の投稿を実行
-- - 画像生成: 毎15分の5分/20分/35分/50分 - pending状態の画像を生成

-- ============================================================
-- Step 1: EN投稿生成ジョブ (21:00 JST / 12:00 UTC)
-- ============================================================
-- 翌日のEN投稿を夜に一括生成
SELECT cron.schedule(
  'x-generate-en-posts',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url')
           || '/functions/v1/generate-x-posts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object(
      'language', 'en',
      'count', 6
    )
  ) AS request_id;
  $$
);

-- ============================================================
-- Step 2: JA投稿生成ジョブ (05:00 JST / 20:00 UTC)
-- ============================================================
-- 当日のJA投稿を朝に生成
SELECT cron.schedule(
  'x-generate-ja-posts',
  '0 20 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url')
           || '/functions/v1/generate-x-posts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object(
      'language', 'ja',
      'count', 1
    )
  ) AS request_id;
  $$
);

-- ============================================================
-- Step 3: 投稿実行ジョブ (毎10分)
-- ============================================================
-- scheduled_at を過ぎた ready 状態の投稿を X に投稿
SELECT cron.schedule(
  'x-post-scheduled',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url')
           || '/functions/v1/post-to-x',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object(
      'batch_size', 5
    )
  ) AS request_id;
  $$
);

-- ============================================================
-- Step 4: 画像生成ジョブ (毎15分)
-- ============================================================
-- pending 状態で media_type='ai_image' の投稿の画像を生成
SELECT cron.schedule(
  'x-generate-images',
  '5,20,35,50 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url')
           || '/functions/v1/generate-post-image',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object(
      'batch_size', 3
    )
  ) AS request_id;
  $$
);

-- ============================================================
-- Verify Jobs
-- ============================================================
-- ジョブが正しく登録されたことを確認するためのクエリ
-- SELECT * FROM cron.job WHERE jobname LIKE 'x-%';

COMMENT ON EXTENSION pg_cron IS 'X自動投稿システム用cronジョブ (4ジョブ)';

# /manage-x-queue

X投稿キューを管理するスキル。

## 使用方法

```
/manage-x-queue [list|cancel|reschedule|retry|status]
```

## コマンド

### list - キュー一覧表示

```sql
-- 全体の状態確認
SELECT status, COUNT(*)
FROM scheduled_posts
GROUP BY status;

-- 今後24時間の予定投稿
SELECT id, language, scheduled_at, status,
       LEFT(content_en, 50) AS content_preview
FROM scheduled_posts
WHERE scheduled_at > NOW()
  AND scheduled_at < NOW() + INTERVAL '24 hours'
ORDER BY scheduled_at;

-- 失敗した投稿
SELECT id, language, last_error, attempt_count, scheduled_at
FROM scheduled_posts
WHERE status = 'failed'
ORDER BY created_at DESC LIMIT 10;
```

### cancel - 投稿キャンセル

```sql
-- 特定の投稿をキャンセル
UPDATE scheduled_posts
SET status = 'failed',
    last_error = 'Manually cancelled'
WHERE id = '<POST_ID>';

-- 今日の未投稿をすべてキャンセル
UPDATE scheduled_posts
SET status = 'failed',
    last_error = 'Batch cancelled'
WHERE status IN ('pending', 'ready')
  AND scheduled_at::date = CURRENT_DATE;
```

### reschedule - 投稿リスケジュール

```sql
-- 特定の投稿を1時間後に変更
UPDATE scheduled_posts
SET scheduled_at = NOW() + INTERVAL '1 hour'
WHERE id = '<POST_ID>';

-- ready状態の投稿を明日の同時刻に移動
UPDATE scheduled_posts
SET scheduled_at = scheduled_at + INTERVAL '1 day'
WHERE status = 'ready'
  AND scheduled_at < NOW();
```

### retry - 失敗した投稿をリトライ

```sql
-- 特定の投稿をリトライ
UPDATE scheduled_posts
SET status = 'ready',
    attempt_count = 0,
    last_error = NULL,
    scheduled_at = NOW() + INTERVAL '5 minutes'
WHERE id = '<POST_ID>';

-- 全ての失敗投稿をリトライ (attempt_count < 3のみ)
UPDATE scheduled_posts
SET status = 'ready',
    last_error = NULL,
    scheduled_at = NOW() + INTERVAL '10 minutes'
WHERE status = 'failed'
  AND attempt_count < 3;
```

### status - 詳細ステータス確認

```sql
-- 投稿の詳細ログ
SELECT
  sp.id,
  sp.content_en,
  sp.scheduled_at,
  sp.status,
  sp.x_post_id,
  pgl.action,
  pgl.details,
  pgl.created_at AS log_time
FROM scheduled_posts sp
LEFT JOIN post_generation_logs pgl ON sp.id = pgl.scheduled_post_id
WHERE sp.id = '<POST_ID>'
ORDER BY pgl.created_at DESC;

-- 今日のアクティビティサマリー
SELECT
  action,
  COUNT(*) AS count,
  MAX(created_at) AS latest
FROM post_generation_logs
WHERE created_at > CURRENT_DATE
GROUP BY action
ORDER BY count DESC;
```

## ステータス一覧

| ステータス | 説明 |
|-----------|------|
| `pending` | 生成済み、画像生成待ち |
| `generating_image` | AI画像生成中 |
| `ready` | 投稿準備完了 |
| `processing` | 投稿処理中 |
| `posted` | 投稿完了 |
| `failed` | 投稿失敗 (3回リトライ後) |

## テンプレート使用状況

```sql
-- テンプレート別使用回数
SELECT name, category, use_count, last_used_at
FROM post_templates
WHERE is_active = true
ORDER BY use_count DESC;

-- 最近使われていないテンプレート
SELECT name, category, last_used_at
FROM post_templates
WHERE is_active = true
ORDER BY last_used_at ASC NULLS FIRST
LIMIT 5;
```

## cron ジョブ状況確認

```sql
-- 登録されているcronジョブ
SELECT jobname, schedule, command
FROM cron.job
WHERE jobname LIKE 'x-%';

-- 最近のジョブ実行履歴
SELECT jobname, start_time, end_time, status
FROM cron.job_run_details
WHERE jobname LIKE 'x-%'
ORDER BY start_time DESC
LIMIT 20;
```

## 緊急停止

全ての自動投稿を停止する場合:

```sql
-- cronジョブを一時停止
SELECT cron.unschedule('x-post-scheduled');
SELECT cron.unschedule('x-generate-en-posts');
SELECT cron.unschedule('x-generate-ja-posts');
SELECT cron.unschedule('x-generate-images');

-- 再開する場合は migration を再実行
```

## 関連スキル

- `/generate-x-post` - 手動投稿生成

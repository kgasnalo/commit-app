# Handoff: Session 2026-01-13

## Current Goal
**Phase 7.5: Row Level Security (RLS) Hardening**

Phase 7.4 "The Reaper" 完了。自動デッドライン強制執行システムが毎時稼働中。

---

## Current Critical Status

### Phase 7.4: "The Reaper" ✅ COMPLETE
| Component | Status | Notes |
|-----------|--------|-------|
| `penalty_charges` table | ✅ | 課金履歴・リトライ追跡、UNIQUE(commitment_id) |
| `commitments.defaulted_at` | ✅ | 期限切れ時刻記録 |
| `process-expired-commitments` | ✅ | Stripe off-session課金、Push通知送信 |
| `pg_cron` jobs | ✅ | 毎時 :00 + 4時間毎リトライ |
| Vault secrets | ✅ | `supabase_url`, `cron_secret` |
| `CRON_SECRET` | ✅ | Edge Function認証用 |

### Test Result
```json
{"success":true,"mode":"normal","stats":{"processed":6,"charged":0,"failed":6,"skipped":0,"errors":[]}}
```
6件の期限切れコミットメントを検出（支払い方法未登録のため課金は全て `failed`）

---

## What Didn't Work / Lessons Learned

### 1. SERVICE_ROLE_KEY timingSafeEqual 比較失敗
**Problem:** Edge Function 内で `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` と Authorization ヘッダーの比較が一致しない。

**Root Cause:** Supabase が自動注入する SERVICE_ROLE_KEY と Dashboard から取得したキーの比較で、何らかの理由で timingSafeEqual が false を返す。

**Solution:** 専用の `CRON_SECRET` を作成し、Supabase secrets と Vault の両方に保存。cron job は Vault から取得した `cron_secret` を使用。
```bash
supabase secrets set CRON_SECRET=reaper-secret-2026-commit-app
```

### 2. Supabase CLI に SQL 実行コマンドがない
**Problem:** `supabase db execute --sql "..."` のようなコマンドが存在しない。

**Solution:** マイグレーションファイルを作成して `supabase db push` で実行。
```bash
# マイグレーションファイル作成 → push
supabase db push
```

### 3. pg_cron から Edge Function を呼ぶ認証
**Problem:** cron job 内で SERVICE_ROLE_KEY を直接参照できない。

**Solution:** Vault に secrets を保存し、`vault.decrypted_secrets` ビューから動的取得。
```sql
SELECT net.http_post(
  url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/...',
  headers := jsonb_build_object(
    'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
  ),
  ...
);
```

---

## Immediate Next Steps

### Phase 7.5: Row Level Security (RLS) Hardening
1. `commitments` テーブルの DELETE 禁止ポリシー
2. 期限切れ後の `status = 'completed'` UPDATE 禁止
3. `penalty_charges` の監査用ポリシー確認

### Phase 7.6: Server-side Validation (Optional)
- Google Books API で総ページ数を検証
- pledge_amount の上限チェック

---

## Key File Locations

### The Reaper (Phase 7.4)
| Feature | File |
|---------|------|
| Charge Storage | `supabase/migrations/20260113160000_create_penalty_charges.sql` |
| Defaulted Tracking | `supabase/migrations/20260113160001_add_defaulted_at.sql` |
| Cron Setup | `supabase/migrations/20260113170000_setup_reaper_cron_job.sql` |
| Cron Secret Fix | `supabase/migrations/20260113170001_update_cron_secret.sql` |
| Edge Function | `supabase/functions/process-expired-commitments/index.ts` |
| Types | `src/types/database.types.ts` |
| i18n | `src/i18n/locales/{ja,en,ko}.json` → `reaper` section |

### Manual Test Command
```bash
curl -X POST https://rnksvjjcsnwlquaynduu.supabase.co/functions/v1/process-expired-commitments \
  -H "Authorization: Bearer reaper-secret-2026-commit-app" \
  -H "Content-Type: application/json" \
  -d '{"source": "manual_test"}'
```

---

## Supabase Status

### Database Tables
`users`, `books`, `commitments`, `verification_logs`, `tags`, `book_tags`, `reading_sessions`, `expo_push_tokens`, `penalty_charges`

### Edge Functions
`use-lifeline`, `isbn-lookup`, `delete-account`, `send-push-notification`, `process-expired-commitments`

### Cron Jobs (Active)
| Job Name | Schedule | Purpose |
|----------|----------|---------|
| `reaper-process-expired-commitments` | `0 * * * *` | 毎時、期限切れ検出・課金 |
| `reaper-retry-failed-charges` | `0 */4 * * *` | 4時間毎、失敗課金リトライ |

### Vault Secrets
| Name | Purpose |
|------|---------|
| `supabase_url` | プロジェクトURL |
| `cron_secret` | cron→Edge Function認証 |

### Supabase Secrets (Edge Functions)
| Name | Purpose |
|------|---------|
| `STRIPE_SECRET_KEY` | Stripe API認証 |
| `CRON_SECRET` | cron認証受け入れ |

---

## Files Modified This Session

| File | Change |
|------|--------|
| `supabase/migrations/20260113160000_create_penalty_charges.sql` | NEW |
| `supabase/migrations/20260113160001_add_defaulted_at.sql` | NEW |
| `supabase/migrations/20260113160002_enable_cron_extensions.sql` | NEW |
| `supabase/migrations/20260113170000_setup_reaper_cron_job.sql` | NEW |
| `supabase/migrations/20260113170001_update_cron_secret.sql` | NEW |
| `supabase/functions/process-expired-commitments/index.ts` | NEW |
| `src/types/database.types.ts` | penalty_charges型、defaulted_at追加 |
| `src/i18n/locales/{ja,en,ko}.json` | reaper通知メッセージ追加 |
| `ROADMAP.md` | Phase 7.4 [x] |

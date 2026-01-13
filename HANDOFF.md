# Handoff: Session 2026-01-13

## Current Goal
**Phase 7.6: Server-side Validation (Optional)** or **Phase 8: Reliability & Ops**

Phase 7.5 RLS Hardening 完了。バックエンドセキュリティ基盤が整備されました。

---

## Current Critical Status

### Phase 7.5: RLS Hardening ✅ COMPLETE
| Component | Status | Notes |
|-----------|--------|-------|
| DELETE 禁止 | ✅ | commitments に DELETE ポリシーなし |
| UPDATE 制限 | ✅ | `deadline > NOW()` かつ `status='pending'` のみ |
| completed 限定 | ✅ | WITH CHECK で `status='completed'` のみ許可 |
| penalty_charges RLS | ✅ | SELECT のみ、INSERT/UPDATE/DELETE は service_role のみ |

### Phase 7.4: "The Reaper" ✅ COMPLETE
| Component | Status | Notes |
|-----------|--------|-------|
| `penalty_charges` table | ✅ | 課金履歴・リトライ追跡、UNIQUE(commitment_id) |
| `commitments.defaulted_at` | ✅ | 期限切れ時刻記録 |
| `process-expired-commitments` | ✅ | Stripe off-session課金、Push通知送信 |
| `pg_cron` jobs | ✅ | 毎時 :00 + 4時間毎リトライ |
| Vault secrets | ✅ | `supabase_url`, `cron_secret` |
| `CRON_SECRET` | ✅ | Edge Function認証用 |

### Phase 7.3: Push Notifications ✅ COMPLETE
| Component | Status |
|-----------|--------|
| `expo_push_tokens` table | ✅ |
| `send-push-notification` Edge Function | ✅ |
| `NotificationService.ts` | ✅ |

---

## What Didn't Work / Lessons Learned

### 1. SERVICE_ROLE_KEY timingSafeEqual 比較失敗 (Phase 7.4)
**Problem:** Edge Function 内で `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` と Authorization ヘッダーの比較が一致しない。

**Solution:** 専用の `CRON_SECRET` を作成し、Supabase secrets と Vault の両方に保存。
```bash
supabase secrets set CRON_SECRET=reaper-secret-2026-commit-app
```

### 2. Supabase CLI に SQL 実行コマンドがない
**Solution:** マイグレーションファイルを作成して `supabase db push` で実行。

### 3. pg_cron から Edge Function を呼ぶ認証
**Solution:** Vault に secrets を保存し、`vault.decrypted_secrets` ビューから動的取得。

---

## Immediate Next Steps

### Option A: Phase 7.6 - Server-side Validation (Optional)
- Google Books API で総ページ数を検証
- pledge_amount の上限チェック

### Option B: Phase 7.7 - Internal Admin Dashboard (Ops)
- Retool/Admin ビューで Support 用ダッシュボード
- 手動 Refund/Complete 機能

### Option C: Phase 8 - Reliability & Ops
- 8.1 Sentry 統合 (Crash Monitoring)
- 8.2 CI/CD Pipeline (GitHub Actions)
- 8.3 Product Analytics
- 8.4 Remote Config & Force Update
- 8.5 Maintenance Mode

---

## Key File Locations

### RLS Hardening (Phase 7.5)
| Feature | File |
|---------|------|
| Commitments RLS | `supabase/migrations/20260113180000_harden_commitments_rls.sql` |

### The Reaper (Phase 7.4)
| Feature | File |
|---------|------|
| Charge Storage | `supabase/migrations/20260113160000_create_penalty_charges.sql` |
| Defaulted Tracking | `supabase/migrations/20260113160001_add_defaulted_at.sql` |
| Cron Setup | `supabase/migrations/20260113170000_setup_reaper_cron_job.sql` |
| Cron Secret Fix | `supabase/migrations/20260113170001_update_cron_secret.sql` |
| Edge Function | `supabase/functions/process-expired-commitments/index.ts` |

### Push Notifications (Phase 7.3)
| Feature | File |
|---------|------|
| Token Storage | `supabase/migrations/20260113150000_create_expo_push_tokens.sql` |
| Edge Function | `supabase/functions/send-push-notification/index.ts` |
| Client Service | `src/lib/NotificationService.ts` |

### Manual Test Commands
```bash
# Test The Reaper
curl -X POST https://rnksvjjcsnwlquaynduu.supabase.co/functions/v1/process-expired-commitments \
  -H "Authorization: Bearer reaper-secret-2026-commit-app" \
  -H "Content-Type: application/json" \
  -d '{"source": "manual_test"}'

# Test Push Notification (requires SERVICE_ROLE_KEY)
curl -X POST https://rnksvjjcsnwlquaynduu.supabase.co/functions/v1/send-push-notification \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "<USER_ID>", "title": "Test", "body": "Test message"}'
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

## Git Status
- Branch: `main`
- Commits ahead of origin: **5**
- Ready to push: `git push origin main`

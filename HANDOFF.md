# Handoff: Session 2026-01-13

## Current Goal
**Phase 8: Reliability & Ops**

Phase 7 完了! Admin Dashboard が稼働中。次は Phase 8 へ。

---

## Current Critical Status

### Phase 7.7: Internal Admin Dashboard ✅ COMPLETE
| Component | Status | Notes |
|-----------|--------|-------|
| Admin Dashboard Page | ✅ | `/admin/dashboard` (Web Portal) |
| `admin-actions` Edge Function | ✅ | Refund & Complete アクション |
| Middleware Protection | ✅ | Email ベースの Admin 認証 |
| `admin_audit_logs` Table | ✅ | 監査ログ記録 |
| `charge_status = 'refunded'` | ✅ | 返金ステータス追加 |

### Phase 7.6: Server-side Validation ✅ COMPLETE
| Component | Status | Notes |
|-----------|--------|-------|
| `create-commitment` Edge Function | ✅ | 金額・期限・ページ数のバリデーション |
| Google Books API 検証 | ✅ | ページ数が本の総ページ数+10以下か確認（soft fail） |
| 金額上限チェック | ✅ | JPY: 50-50000, USD: 1-350, EUR: 1-300, GBP: 1-250, KRW: 500-500000 |
| 期限バリデーション | ✅ | 24時間以上先のみ許可 |
| RLS INSERT 禁止 | ✅ | 認証ユーザーの直接INSERTをブロック |

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

### Phase 7.3: Push Notifications ✅ COMPLETE
| Component | Status |
|-----------|--------|
| `expo_push_tokens` table | ✅ |
| `send-push-notification` Edge Function | ✅ |
| `NotificationService.ts` | ✅ |

---

## IMPORTANT: Set ADMIN_EMAILS

Admin Dashboard を使用するには、環境変数を設定してください:

```bash
# Supabase Edge Functions
supabase secrets set ADMIN_EMAILS=your-email@example.com

# Vercel (Web Portal)
echo "your-email@example.com" | npx vercel env add ADMIN_EMAILS production
npx vercel --prod  # Redeploy to pick up new vars
```

---

## Immediate Next Steps: Phase 8

### 8.1 Sentry 統合 (Crash Monitoring)
- App + Edge Functions のエラー監視

### 8.2 CI/CD Pipeline (GitHub Actions)
- main マージで自動デプロイ

### 8.3 Product Analytics (PostHog/Mixpanel)
- コミットメント完了率・チャーン追跡

### 8.4 Remote Config & Force Update
- 強制アップデートモーダル

### 8.5 Maintenance Mode
- グローバルメンテナンスモード

---

## Key File Locations

### Internal Admin Dashboard (Phase 7.7)
| Feature | File |
|---------|------|
| Dashboard Page | `commit-app-web/src/app/admin/dashboard/page.tsx` |
| Client Component | `commit-app-web/src/app/admin/dashboard/AdminDashboardClient.tsx` |
| Middleware | `commit-app-web/src/middleware.ts` |
| Edge Function | `supabase/functions/admin-actions/index.ts` |
| DB Migration | `supabase/migrations/20260114100000_admin_dashboard_support.sql` |

### Server-side Validation (Phase 7.6)
| Feature | File |
|---------|------|
| Edge Function | `supabase/functions/create-commitment/index.ts` |
| RLS Migration | `supabase/migrations/20260114000000_restrict_commitment_insert.sql` |
| Client Update | `src/screens/CreateCommitmentScreen.tsx` |
| i18n Errors | `src/i18n/locales/*.json` (errors.validation.*) |

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
| Edge Function | `supabase/functions/process-expired-commitments/index.ts` |

### Push Notifications (Phase 7.3)
| Feature | File |
|---------|------|
| Token Storage | `supabase/migrations/20260113150000_create_expo_push_tokens.sql` |
| Edge Function | `supabase/functions/send-push-notification/index.ts` |
| Client Service | `src/lib/NotificationService.ts` |

### Manual Test Commands
```bash
# Test admin-actions (requires ADMIN JWT)
curl -X POST https://rnksvjjcsnwlquaynduu.supabase.co/functions/v1/admin-actions \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"action": "complete", "commitment_id": "<ID>", "reason": "Test"}'

# Test create-commitment (requires USER JWT)
curl -X POST https://rnksvjjcsnwlquaynduu.supabase.co/functions/v1/create-commitment \
  -H "Authorization: Bearer <USER_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "google_books_id": "abc123",
    "book_title": "Test Book",
    "book_author": "Author",
    "book_cover_url": null,
    "deadline": "2026-01-20T00:00:00Z",
    "pledge_amount": 1000,
    "currency": "JPY",
    "target_pages": 50
  }'

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
`users`, `books`, `commitments`, `verification_logs`, `tags`, `book_tags`, `reading_sessions`, `expo_push_tokens`, `penalty_charges`, `admin_audit_logs`

### Edge Functions
`use-lifeline`, `isbn-lookup`, `delete-account`, `send-push-notification`, `process-expired-commitments`, `create-commitment`, `admin-actions`

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
| `GOOGLE_BOOKS_API_KEY` | Google Books API (create-commitment用) |
| `ADMIN_EMAILS` | Admin Dashboard アクセス許可リスト |

---

## Git Status
- Branch: `main`
- Latest commit: Phase 7.7 Admin Dashboard
- Ready to push: `git push origin main`

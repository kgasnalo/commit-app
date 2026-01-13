# Handoff: Session 2026-01-13

## Current Goal
**Phase 8: Reliability & Ops**

Phase 8.1 Sentry Integration 完了（監査修正含む）。次は Phase 8.2 CI/CD Pipeline へ。

---

## Current Critical Status

### Phase 8.1: Sentry Integration ✅ COMPLETE (Audit Remediation Done)

**監査修正 (2026-01-13):**
| Issue | Fix | Status |
|-------|-----|--------|
| Fake Metrics | `incrementMetric` → `logBusinessEvent` (captureMessage) | ✅ |
| Coverage Gaps | 全7 Edge Functions に Sentry 追加 | ✅ |
| Sampling Rate | `tracesSampleRate: 1.0` → `0.1` (10%) | ✅ |
| PII Logging | `user.email` → `user.id` のみ | ✅ |

#### Mobile App
| Component | Status | Notes |
|-----------|--------|-------|
| `@sentry/react-native` SDK | ✅ | Installed via `npx expo install` |
| Sentry Initialization | ✅ | `App.js` - **10% tracesSampleRate** |
| Error Logger | ✅ | `src/utils/errorLogger.ts` - captureException |
| User Context Tracking | ✅ | `AppNavigator.tsx` - sets on auth change |
| Metrics Service | ✅ | `src/lib/MetricsService.ts` - critical actions |

#### Web Portal
| Component | Status | Notes |
|-----------|--------|-------|
| `@sentry/nextjs` SDK | ✅ | Full Next.js integration |
| Client Config | ✅ | `sentry.client.config.ts` - **10% sampling** |
| Server Config | ✅ | `sentry.server.config.ts` - **10% sampling** |
| Edge Config | ✅ | `sentry.edge.config.ts` - **10% sampling** |
| Global Error | ✅ | `src/app/global-error.tsx` - Error boundary |

#### Edge Functions (ALL 7 COVERED)
| Function | Sentry | logBusinessEvent | Notes |
|----------|--------|------------------|-------|
| `create-commitment` | ✅ | `commitment_created` | 金額・期限・ページ検証 |
| `admin-actions` | ✅ | `admin_refund_success`, `admin_mark_complete_success` | PII削除済み |
| `delete-account` | ✅ | `account_deleted` | Apple要件 |
| `use-lifeline` | ✅ | `lifeline_used` | 緊急フリーズ |
| `isbn-lookup` | ✅ | - | バーコードスキャン |
| `send-push-notification` | ✅ | `push_notification_batch` | システム専用 |
| `process-expired-commitments` | ✅ | `reaper_run_complete` | The Reaper |

### Previous Phases ✅
- Phase 7.7: Internal Admin Dashboard
- Phase 7.6: Server-side Validation
- Phase 7.5: RLS Hardening
- Phase 7.4: "The Reaper" (Automated Penalty Collection)
- Phase 7.3: Push Notifications
- Phase 7.2: Deep Linking
- Phase 7.1: Web Payment Portal

---

## Immediate Next Steps: Phase 8.2-8.5

### 8.2 CI/CD Pipeline (GitHub Actions) ← NEXT
- main マージで自動デプロイ (EAS Build + Edge Functions)
- Type check & lint on PR

### 8.3 Product Analytics (PostHog/Mixpanel)
- コミットメント完了率・チャーン追跡

### 8.4 Remote Config & Force Update
- 強制アップデートモーダル

### 8.5 Maintenance Mode
- グローバルメンテナンスモード

---

## IMPORTANT: Environment Setup

### ADMIN_EMAILS (Admin Dashboard)
```bash
# Supabase Edge Functions
supabase secrets set ADMIN_EMAILS=your-email@example.com

# Vercel (Web Portal)
echo "your-email@example.com" | npx vercel env add ADMIN_EMAILS production
npx vercel --prod
```

### SENTRY_DSN
```bash
# Mobile App (.env)
EXPO_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# Edge Functions
supabase secrets set SENTRY_DSN_EDGE=https://xxx@xxx.ingest.sentry.io/xxx

# Web Portal (Vercel)
echo "https://xxx@xxx.ingest.sentry.io/xxx" | npx vercel env add NEXT_PUBLIC_SENTRY_DSN production
```

---

## Key File Locations

### Sentry Integration
| Platform | Files |
|----------|-------|
| Mobile | `App.js`, `src/utils/errorLogger.ts`, `src/lib/MetricsService.ts` |
| Web | `sentry.*.config.ts`, `src/app/global-error.tsx` |
| Edge | `supabase/functions/_shared/sentry.ts` |

### Admin Dashboard
| Feature | File |
|---------|------|
| Dashboard Page | `commit-app-web/src/app/admin/dashboard/page.tsx` |
| Edge Function | `supabase/functions/admin-actions/index.ts` |

---

## Supabase Status

### Edge Functions (7 total, all with Sentry)
`use-lifeline`, `isbn-lookup`, `delete-account`, `send-push-notification`, `process-expired-commitments`, `create-commitment`, `admin-actions`

### Cron Jobs (Active)
| Job Name | Schedule | Purpose |
|----------|----------|---------|
| `reaper-process-expired-commitments` | `0 * * * *` | 毎時、期限切れ検出・課金 |
| `reaper-retry-failed-charges` | `0 */4 * * *` | 4時間毎、失敗課金リトライ |

### Secrets
| Name | Purpose |
|------|---------|
| `STRIPE_SECRET_KEY` | Stripe API認証 |
| `CRON_SECRET` | cron認証 |
| `GOOGLE_BOOKS_API_KEY` | Google Books API |
| `ADMIN_EMAILS` | Admin アクセス許可 |
| `SENTRY_DSN_EDGE` | Sentry (Edge Functions) |

---

## Git Status
- Branch: `main`
- Latest commit: `32843bb7` - Phase 8.1 Sentry audit remediation
- All changes pushed to `origin/main`

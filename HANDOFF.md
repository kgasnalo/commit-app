# Handoff: Session 2026-01-20 (午後)

## Current Goal
**SERVICE_ROLE_KEY ローテーション完了**

---

## Current Critical Status

### ✅ Completed This Session

| Task | Status | Details |
|------|--------|---------|
| **Edge Functions シークレット** | ✅ 自動更新 | Dashboard でローテーション時に自動反映 |
| **Vercel 環境変数** | ✅ 更新完了 | `npx vercel env add` で設定 |
| **Vercel 再デプロイ** | ✅ 完了 | https://commit-app-web.vercel.app |

---

## What Didn't Work (Lessons Learned)

### 1. `supabase secrets set SUPABASE_SERVICE_ROLE_KEY` は使えない
**Problem:** `supabase secrets set SUPABASE_SERVICE_ROLE_KEY='...'` を実行したところエラー

**Error:**
```
Env name cannot start with SUPABASE_, skipping: SUPABASE_SERVICE_ROLE_KEY
No arguments found.
```

**Root Cause:**
- `SUPABASE_` プレフィックスのシークレットは Supabase が自動管理
- Dashboard でキーをローテーションすると Edge Functions に自動反映される
- 手動設定は不要（というより不可能）

**Auto-Managed Secrets:**
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_DB_URL`

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                SERVICE_ROLE_KEY ローテーション               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Supabase Dashboard                                        │
│   └── API Keys → service_role → Regenerate                  │
│           ↓                                                 │
│   Edge Functions (自動反映)                                  │
│           ↓                                                 │
│   ┌─────────────────────────────────────────────────────┐  │
│   │ Vercel (手動更新が必要)                              │  │
│   │   echo "KEY" | npx vercel env add VAR production    │  │
│   │   npx vercel --prod --yes                           │  │
│   └─────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Git Status

**Uncommitted Files:**
```
M src/types/database.types.ts
M supabase/functions/admin-actions/index.ts
M supabase/functions/use-lifeline/index.ts
?? supabase/migrations/20260119200000_add_users_role_not_null_constraint.sql
?? supabase/migrations/20260119210000_rotate_cron_secret.sql
```

---

## Immediate Next Steps

### 🚀 Recommended Actions

1. **未コミットファイルの確認・コミット**
   - 新しいマイグレーションファイルの内容を確認
   - 必要に応じてコミット

2. **動作検証**
   - Edge Functions が正常動作するか確認
   - Web Portal (Admin Dashboard) が正常動作するか確認

3. **Phase 7.9 (Apple IAP)**: ストア申請準備

---

## Testing Checklist

### SERVICE_ROLE_KEY ローテーション検証
- [x] `supabase secrets list` で SUPABASE_SERVICE_ROLE_KEY 確認
- [x] `npx vercel env ls` で Vercel 環境変数確認
- [ ] Edge Function 動作確認 (例: `create-commitment`)
- [ ] Admin Dashboard 動作確認 (例: refund/complete)

---

## Previous Session Summary (午前)

**お知らせ・寄付のプッシュ通知 & バッジ表示を実装**
- DB Triggers (`notify_announcement_published`, `notify_donation_posted`)
- UnreadService / UnreadContext
- SettingsTab バッジ表示
- コミット済み: `feat: add push notifications and badge for announcements/donations`

---

## Critical Architecture Rule

```
┌─────────────────────────────────────────────────────────────┐
│                    COMMIT App                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   サブスクリプション              ペナルティ (寄付)          │
│   ┌─────────────────┐          ┌─────────────────┐         │
│   │ Apple IAP       │          │ Stripe          │         │
│   │ Google Play     │          │ (Web Portal)    │         │
│   │ Billing         │          │                 │         │
│   └────────┬────────┘          └────────┬────────┘         │
│            │                            │                  │
│            ▼                            ▼                  │
│   ストアアプリで解約            カード登録 & 課金           │
│   (設定 > サブスクリプション)    (/billing ページ)          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**絶対にWeb Portalでサブスクリプション解約を実装しないこと！**

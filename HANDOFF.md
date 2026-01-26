# Handoff: Session 2026-01-26 (Edge Function Retry Logic)

## Current Goal
**Edge Function WORKER_ERROR 対策としてクライアントサイドリトライロジックを実装完了。**

---

## Current Critical Status

### 今セッションで実装した内容

| 内容 | ファイル | 説明 |
|------|----------|------|
| リトライユーティリティ作成 | `src/lib/supabaseHelpers.ts` | WORKER_ERROR時に最大3回リトライ (exponential backoff) |
| Edge Function呼び出し更新 | 8ファイル | 全ての `supabase.functions.invoke` を `invokeFunctionWithRetry` に置換 |

### 更新したファイル一覧

```
src/lib/supabaseHelpers.ts (新規作成)
src/screens/onboarding/OnboardingScreen13_Paywall.tsx (create-commitment)
src/screens/CreateCommitmentScreen.tsx (create-commitment)
src/screens/CommitmentDetailScreen.tsx (use-lifeline)
src/screens/SettingsScreen.tsx (delete-account)
src/screens/JobRankingScreen.tsx (job-recommendations)
src/hooks/useBookSearch.ts (isbn-lookup)
src/components/BarcodeScannerModal.tsx (isbn-lookup)
src/components/JobRecommendations.tsx (job-recommendations)
```

### Sentry SDK 状況

```
状態: 一時的に無効化
ファイル: supabase/functions/_shared/sentry.ts
理由: https://deno.land/x/sentry@8.42.0/index.mjs がモジュールレベルでクラッシュ
影響: エラーはconsole.logに出力（Supabase Dashboard Logsで確認可能）
TODO: Sentry が Deno Edge Runtime 互換SDKをリリース次第、再有効化
```

### デプロイ状況

```
Edge Functions (全7個再デプロイ済み):
  ✅ create-commitment (--no-verify-jwt)
  ✅ admin-actions
  ✅ delete-account
  ✅ isbn-lookup
  ✅ process-expired-commitments
  ✅ send-push-notification
  ✅ use-lifeline
```

---

## What Didn't Work (Previous Sessions)

### 1. Sentry Deno SDK が Edge Functions でクラッシュ

```typescript
// 問題: モジュールレベルのインポートがWORKER_ERRORを引き起こす
import * as Sentry from "https://deno.land/x/sentry@8.42.0/index.mjs";

// 原因: Sentry SDK内部でDeno Edge Runtime非対応のAPIを使用
// 症状: Edge Functionが `{ "code": 500, "message": "WORKER_ERROR" }` を返す

// 解決: インポートを削除し、全関数をno-opスタブに置換
```

### 2. Cold Start による間欠的 WORKER_ERROR

```
症状: Edge Functionが1-2回目の呼び出しでWORKER_ERRORを返し、3回目で成功
原因: Supabase Edge Functions (Deno Deploy) のCold Start問題
解決: クライアントサイドでリトライロジックを実装 (invokeFunctionWithRetry)
```

---

## Immediate Next Steps

### 1. 動作確認 (推奨)
- [ ] アプリを完全終了 → 再起動でCold Start再現
- [ ] オンボーディング → コミットメント作成フロー確認
- [ ] コンソールで `[create-commitment] Retry 1/3 after WORKER_ERROR` を確認

### 2. 残作業 (任意)

**CRON_SECRET をVaultに保存** (DBトリガーで使用する場合):
```sql
-- Supabase Dashboard > SQL Editor
SELECT vault.create_secret('YOUR_CRON_SECRET_HERE', 'cron_secret');
```

---

## Remaining SHOWSTOPPERs

### Apple IAP / Google Play Billing (ROADMAP 7.9)
- `OnboardingScreen13_Paywall.tsx` は価格表示UIのみ存在
- 購入処理なし - `subscription_status: 'active'` をDB直接セット
- `react-native-iap` / `expo-in-app-purchases` 未インストール
- **審査100%リジェクト** (Apple Guideline 3.1.1違反)

### Stripe 本番キー (.env)
- 現在: `pk_test_*` (テストモード)
- 本番ビルド前に `pk_live_*` に差し替え必須

---

## Previous Sessions Summary

**Edge Function Retry Logic (2026-01-26 現セッション):**
- クライアントサイドリトライロジック実装 (WORKER_ERROR対策)

**Sentry WORKER_ERROR Fix (2026-01-26):**
- Sentry Deno SDKを無効化してEdge Function WORKER_ERROR解消

**Security Audit Phase 3 (2026-01-26):**
- CRITICAL 4件 + HIGH 7件のセキュリティ修正を実装・デプロイ

**Security Audit Phase 2 (2026-01-25):**
- タイミング攻撃対策、エラーハンドリング、情報漏洩防止

**Security Audit Phase 1 (2026-01-25):**
- Sentry設定、認証バイパス、JSON.parse、API検証

**Username Uniqueness (2026-01-24):**
- DB UNIQUE制約 + クライアントリアルタイムバリデーション

**Pre-Release Audit Fixes (2026-01-23):**
- moti削除、Paywall i18n、韓国語locale、権限英語化、PII除去

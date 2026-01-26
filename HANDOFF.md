# Handoff: Session 2026-01-25 (Edge Function WORKER_ERROR Debug)

## Current Goal
**オンボーディングフローでコミットメント作成を成功させる。Edge Function の WORKER_ERROR を切り分け中。**

---

## Current Critical Status

### 問題の経緯

| 時系列 | 問題 | 対応 | 結果 |
|--------|------|------|------|
| 前セッション | `target_pages: 0` で送信されていた | `target_pages: 224` に修正 | 成功 |
| 今セッション | Edge Function が `WORKER_ERROR` でクラッシュ | Sentry SDK を一時無効化 | **テスト待ち** |

### 現在の状態

```
OnboardingScreen13 → create-commitment Edge Function
                           ↓
                    WORKER_ERROR (Deno runtime crash)
                           ↓
                    原因: Sentry SDK インポートエラーの可能性
                           ↓
                    対応: Sentry コードをコメントアウト
```

### 修正したファイル

**`supabase/functions/create-commitment/index.ts`**
- Line 3-4: `import { initSentry, ... }` をコメントアウト
- Line 7: `initSentry('create-commitment')` をコメントアウト
- Line 167: `addBreadcrumb('Auth failed'...)` をコメントアウト
- Line 172: `addBreadcrumb('User authenticated'...)` をコメントアウト
- Line 347-353: `logBusinessEvent(...)` をコメントアウト
- Line 366-369: `captureException(...)` をコメントアウト

**デプロイ済み:** `supabase functions deploy create-commitment --no-verify-jwt`

---

## What Didn't Work (This Session)

### Sentry SDK インポートエラー (推定)

```typescript
// 問題のインポート (supabase/functions/_shared/sentry.ts)
import * as Sentry from 'https://deno.land/x/sentry@8.42.0/index.mjs'
```

- `WORKER_ERROR` は Deno ランタイムのクラッシュを示す
- モジュールレベルで `initSentry()` が即座に呼ばれる設計
- URL が無効またはバージョン非互換の可能性

**教訓:** Edge Function で外部モジュール（特に監視系SDK）を使う場合、インポートエラーでランタイム全体がクラッシュする。本番では try-catch でラップするか、動的インポートを検討。

---

## Immediate Next Steps

### 1. テスト実行 (最優先)
1. アプリでオンボーディング Screen13 を開く
2. 「SLIDE TO COMMIT」をスライド
3. **期待結果:** コミットメント作成成功、シネマティック演出が表示される
4. Supabase Dashboard でログ確認: `[create-commitment] Success`

### 2. 結果に応じた対応

**成功した場合:**
- Sentry SDK のインポート URL を修正 (npm 版に変更等)
- 修正後、Sentry を再有効化してデプロイ

**失敗した場合:**
- Supabase Dashboard → Edge Functions → Logs で詳細エラー確認
- 他の原因を調査

### 3. Sentry 再有効化 (成功後)
```typescript
// 修正案: npm 版 Sentry を使用
import * as Sentry from 'npm:@sentry/node@latest'
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

**Edge Function Debug (2026-01-25 現セッション):**
- WORKER_ERROR 切り分けのため Sentry を一時無効化

**Username Uniqueness (2026-01-24):**
- DB UNIQUE制約 + クライアントリアルタイムバリデーション

**Pre-Release Audit Fixes (2026-01-23):**
- moti削除、Paywall i18n、韓国語locale、権限英語化、PII除去、RECORD_AUDIO削除

**D.6 Legacy Library置換 (2026-01-23):**
- react-native-confetti-cannon → 純Reanimated ConfettiEffect

**技術的負債修正 (2026-01-23):**
- Context Memoization (5 Providers), Async Safety (2ファイル), God Component分割

**GO_BACK完全修正 (2026-01-23):**
- 3つの根本原因すべてに対処

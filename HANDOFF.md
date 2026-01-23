# Handoff: Session 2026-01-24 (Username Uniqueness Constraint)

## Current Goal
**ランキング機能に向けたユーザー名一意性制約の実装完了。DB層＋クライアント層のバリデーションが稼働中。**

---

## Current Critical Status

### 完了した実装サマリー

| # | ファイル | 変更内容 |
|---|----------|---------|
| 1 | `supabase/migrations/20260123100000_...` | UNIQUE INDEX (case-insensitive) + CHECK制約 + RPC関数 |
| 2 | `src/utils/usernameValidator.ts` | フォーマット検証 + DB重複チェック関数 (新規) |
| 3 | `OnboardingScreen6_Account.tsx` | リアルタイムバリデーションUI (debounce 500ms, 赤/緑border) |
| 4 | `ProfileScreen.tsx` | ユーザー名変更時のフォーマット＋重複チェック |
| 5 | `AuthScreen.tsx` | username NOT NULL対応 (fallback: `user_` + id先頭8文字) |
| 6 | `database.types.ts` | username: `string|null` → `string` + RPC型追加 |
| 7 | `src/i18n/locales/{ja,en,ko}.json` | `errors.username.*` 5キー追加 + note変更 |

### 検証状況
- [x] TypeCheck (`npx tsc --noEmit`) パス - エラー0件
- [x] マイグレーション適用済み (`supabase db push` 成功)
- [x] git push完了 (`19e29b57`)
- [ ] シミュレーターでの動作確認

---

## What Didn't Work (This Session)

### database.types.ts の NOT NULL変更による連鎖エラー
- `username`を`string | null` → `string`に変更した結果、**3ファイル5箇所**でTypeScriptエラー発生
- **AuthScreen.tsx** (3箇所): insert時に`username`フィールド未指定 → fallback値追加
- **OnboardingScreen6**: `syncUserToDatabase`の`displayName`パラメータがnull許容 → fallback追加
- **usernameValidator.ts**: `supabase.rpc('check_username_available')`が型認識されない → `Functions`セクションに型追加

**教訓**: DB型変更時は`grep "\.from('users').*\.(insert|upsert)"` で全呼び出し元を確認すること

---

## ⚠️ 残存SHOWSTOPPER

### Apple IAP / Google Play Billing (ROADMAP 7.9)
- `OnboardingScreen13_Paywall.tsx` は価格表示UIのみ存在
- 購入処理なし - `subscription_status: 'active'` をDB直接セット
- `react-native-iap` / `expo-in-app-purchases` 未インストール
- **審査100%リジェクト** (Apple Guideline 3.1.1違反)

### Stripe本番キー (.env)
- 現在: `pk_test_*` (テストモード)
- 本番ビルド前に `pk_live_*` に差し替え必須

---

## Immediate Next Steps

### 1. シミュレーター動作確認
- OnboardingScreen6: 2文字入力→エラー、`user@name`→不正文字、既存名→重複エラー、有効名→緑border
- ProfileScreen: 同様のバリデーション動作

### 2. ランキング機能の残タスク
- LeaderboardScreen の実データ接続
- ランキング集計ロジック（Edge Function or DB View）

### 3. Apple IAP実装 (SHOWSTOPPER)
1. `npx expo install react-native-iap`
2. App Store Connect でサブスク商品登録
3. 購入フロー実装 + レシート検証

---

## Previous Sessions Summary

**Username Uniqueness (2026-01-24 現セッション):**
- DB UNIQUE制約 + クライアントリアルタイムバリデーション

**Pre-Release Audit Fixes (2026-01-23):**
- moti削除、Paywall i18n、韓国語locale、権限英語化、PII除去、RECORD_AUDIO削除

**D.6 Legacy Library置換 (2026-01-23):**
- react-native-confetti-cannon → 純Reanimated ConfettiEffect

**技術的負債修正 (2026-01-23):**
- Context Memoization (5 Providers), Async Safety (2ファイル), God Component分割

**GO_BACK完全修正 (2026-01-23):**
- 3つの根本原因すべてに対処

**UI/UXデザイン改善 (2026-01-22):**
- CommitmentCard表紙サムネイル追加、MonkMode Finexaスタイル背景

**職種別ランキング (2026-01-22):**
- Phase 1-3: モバイル + Web Portal管理画面完成

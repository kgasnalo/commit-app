# Handoff: Session 2026-01-17

## Current Goal
**Web Portal Billing Page完成** - カード登録UIの改善とカード削除機能の実装完了。

---

## Current Critical Status

### Resolved This Session

| Issue | Status | Fix |
|-------|--------|-----|
| **Billing Page "Internal Server Error"** | ✅ Resolved | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`をVercelに追加 |
| **カード入力フィールドが見づらい** | ✅ Resolved | 個別フィールドに分離（番号/有効期限/CVC） |
| **カード削除機能がない** | ✅ Resolved | 削除API + 確認モーダル実装 |

---

## What Worked (Solutions Applied)

### 1. Vercel環境変数の追加
- **Problem:** `.env.local`はVercel本番環境にデプロイされない
- **Fix:** `npx vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production`
- **Learning:** Vercel本番では必ずCLIで環境変数を設定すること

### 2. Stripe Elementsの分離
- **Problem:** `CardElement`（オールインワン）では何を入力しているか判別しにくい
- **Fix:** `CardNumberElement`, `CardExpiryElement`, `CardCvcElement`に分離
- **Benefit:** 各フィールドにラベル付き、カードブランドアイコン表示

### 3. カード削除機能
- **API:** `POST /api/stripe/delete-payment-method`
- **UI:** 海外SaaS風の確認モーダル（警告アイコン + 説明文）
- **Stripe:** `stripe.paymentMethods.detach()` でカード解除

---

## Key Files Modified This Session

| Category | Files |
|----------|-------|
| **Web Billing API** | `src/app/api/stripe/delete-payment-method/route.ts` (new) |
| **Web Billing Page** | `src/app/billing/page.tsx` |
| **Web Card Form** | `src/components/billing/CardSetupForm.tsx` |
| **Web i18n** | `src/i18n/locales/{ja,en,ko}.json` |

---

## Git Status

### Mobile App (commit-app)
- Branch: `main`
- Last Commit: `56f8095e` (fix: improve onboarding screen copy for better readability)
- Status: Pushed to origin

### Web Portal (commit-app-web)
- Branch: `main`
- Last Commit: `b90dbab` (feat: improve billing page UI with separate card fields and delete functionality)
- Status: Pushed to origin
- Deployed: https://commit-app-web.vercel.app

---

## Vercel Environment Variables (commit-app-web)

| Variable | Status |
|----------|--------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ 設定済み |
| `STRIPE_SECRET_KEY` | ✅ 設定済み |
| `ADMIN_EMAILS` | ✅ 設定済み |
| `NEXT_PUBLIC_APP_SCHEME` | ✅ 設定済み |
| `NEXT_PUBLIC_APP_URL` | ✅ 設定済み |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ 設定済み |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ 設定済み |

---

## Immediate Next Steps

1. **Mobile Dashboard Banner** (7.8続き)
   - カード未登録時のバナー表示
   - `payment_method_registered`フラグの管理

2. **Stripe Webhook設定** (optional)
   - `payment_method.attached`イベントでフラグ自動更新
   - Webhookなしでも手動リフレッシュで対応可能

3. **E2Eテスト**
   - マジックリンクログイン → カード登録 → カード削除 の一連フロー確認

# Handoff: Session 2026-01-12

## Current Goal
**Phase 7.1: Web Payment Portal - COMPLETED ✅**

Web Payment Portal (`commit-app-web`) が作成されました。Vercelへのデプロイ準備完了。

---

## Completed This Session

| Task | Status | Details |
|------|--------|---------|
| **7.1.1** Next.js初期化 | ✅ | `/Users/kg_xxx/commit-app-web` に新規リポジトリ作成 |
| **7.1.2** Supabase Client | ✅ | SSR対応クライアント (`@supabase/ssr`) |
| **7.1.3** Auth Flow | ✅ | Magic Link + Callback (Suspense対応) |
| **7.1.4** DB Migration | ✅ | `stripe_payment_method_id`, `card_last_four`, `card_brand` 追加 |
| **7.1.5** Stripe API | ✅ | SetupIntent作成 + PaymentMethod保存 |
| **7.1.6** Billing UI | ✅ | CardSetupForm with Stripe Elements |
| **7.1.7** Legal Pages | ✅ | Terms, Privacy, Tokushoho |
| **7.1.8** Landing Page | ✅ | Titan Design System適用 |

---

## Web Portal Structure

**Location:** `/Users/kg_xxx/commit-app-web`

```
commit-app-web/
├── src/
│   ├── app/
│   │   ├── (auth)/login/page.tsx      # Magic Link入力
│   │   ├── (auth)/callback/page.tsx   # Auth callback
│   │   ├── billing/page.tsx           # カード登録 (Protected)
│   │   ├── billing/success/page.tsx   # 完了ページ
│   │   ├── terms/page.tsx             # 利用規約
│   │   ├── privacy/page.tsx           # プライバシーポリシー
│   │   ├── tokushoho/page.tsx         # 特商法表記
│   │   └── api/stripe/
│   │       ├── create-setup-intent/   # POST: SetupIntent作成
│   │       └── save-payment-method/   # POST: PM保存
│   ├── components/billing/
│   │   └── CardSetupForm.tsx          # Stripe Elements
│   ├── lib/
│   │   ├── supabase/client.ts         # Browser client
│   │   ├── supabase/server.ts         # Server client
│   │   └── stripe/server.ts           # Stripe SDK
│   └── middleware.ts                  # Auth protection
└── .env.local                         # 環境変数 (要設定)
```

---

## Environment Setup Required

### Web Portal (.env.local)
```bash
# .env.local の以下を実際の値に置き換え:
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY_HERE
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=YOUR_STRIPE_PUBLISHABLE_KEY_HERE
STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET_KEY_HERE
```

モバイルアプリの `.env` から以下をコピー:
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

**Stripe Secret Key** はStripe Dashboardから取得 (モバイルには存在しない)

---

## Web Portal URLs (Vercelデプロイ後)

| URL | Purpose | Status |
|-----|---------|--------|
| `https://commit-app.vercel.app/` | Landing | ✅ Created |
| `https://commit-app.vercel.app/billing` | Payment management | ✅ Created |
| `https://commit-app.vercel.app/terms` | Terms of Service | ✅ Created |
| `https://commit-app.vercel.app/privacy` | Privacy Policy | ✅ Created |
| `https://commit-app.vercel.app/tokushoho` | 特商法表記 | ✅ Created |

---

## Database Changes

### New Columns in `users` Table
```sql
stripe_payment_method_id TEXT    -- Stripe PaymentMethod ID
card_last_four TEXT              -- カード下4桁 (表示用)
card_brand TEXT                  -- カードブランド (visa, mastercard等)
```

Migration: `supabase/migrations/20260113_add_payment_method_fields.sql`

---

## Stripe SetupIntent Flow

```
1. User visits /billing
2. API creates Stripe Customer (if not exists)
3. API creates SetupIntent (usage: 'off_session')
4. User enters card via Stripe Elements
5. stripe.confirmCardSetup()
6. API saves PaymentMethod ID to DB
7. Redirect to /billing/success → Deep Link back to app
```

**Critical:** `usage: 'off_session'` enables future penalty charges without user presence.

---

## Vercel Deploy Steps

```bash
cd /Users/kg_xxx/commit-app-web

# 1. Initialize git (if not done)
git init
git add .
git commit -m "Initial commit: Phase 7.1 Web Payment Portal"

# 2. Create GitHub repo and push
gh repo create commit-app-web --private --source=. --push

# 3. Connect to Vercel
vercel

# 4. Set environment variables in Vercel Dashboard
# Project Settings > Environment Variables
```

---

## Immediate Next Steps

1. **環境変数設定**: `.env.local` に実際の値を設定
2. **ローカルテスト**: `npm run dev` で動作確認
3. **Vercelデプロイ**: 上記手順でデプロイ
4. **Phase 7.2**: Deep Linking & Magic Link Handoff
5. **Phase 7.4**: "The Reaper" (自動ペナルティ課金)

---

## Key File Locations

### Mobile App (commit-app)
| Feature | Files |
|---------|-------|
| **Database Types** | `src/types/database.types.ts` (updated) |
| **Settings (Legal Links)** | `src/screens/SettingsScreen.tsx` |
| **Supabase Migration** | `supabase/migrations/20260113_add_payment_method_fields.sql` |

### Web Portal (commit-app-web)
| Feature | Files |
|---------|-------|
| **Stripe API** | `src/app/api/stripe/*/route.ts` |
| **Auth Flow** | `src/app/(auth)/*/page.tsx` |
| **Billing UI** | `src/components/billing/CardSetupForm.tsx` |
| **Legal Pages** | `src/app/terms/`, `privacy/`, `tokushoho/` |

---

## Supabase
- **Project Ref:** `rnksvjjcsnwlquaynduu`
- **Migration Applied:** `20260113_add_payment_method_fields.sql`

---

## Files Modified This Session

### Mobile App (commit-app)
| File | Change |
|------|--------|
| `src/types/database.types.ts` | Added payment method fields |
| `supabase/migrations/20260113_add_payment_method_fields.sql` | **CREATED** |

### Web Portal (commit-app-web) - NEW REPOSITORY
| File | Description |
|------|-------------|
| `src/app/page.tsx` | Landing page with Titan design |
| `src/app/(auth)/login/page.tsx` | Magic Link login |
| `src/app/(auth)/callback/page.tsx` | Auth callback handler |
| `src/app/billing/page.tsx` | Card registration page |
| `src/app/billing/success/page.tsx` | Success confirmation |
| `src/app/terms/page.tsx` | Terms of Service |
| `src/app/privacy/page.tsx` | Privacy Policy |
| `src/app/tokushoho/page.tsx` | Japanese e-commerce disclosure |
| `src/app/api/stripe/create-setup-intent/route.ts` | SetupIntent API |
| `src/app/api/stripe/save-payment-method/route.ts` | Save PM API |
| `src/components/billing/CardSetupForm.tsx` | Stripe Elements form |
| `src/lib/supabase/client.ts` | Browser Supabase client |
| `src/lib/supabase/server.ts` | Server Supabase client |
| `src/lib/stripe/server.ts` | Stripe SDK init |
| `src/middleware.ts` | Auth middleware |
| `src/types/database.types.ts` | Shared DB types |

# Handoff: Session 2026-01-19

## Current Goal
**Web Portal モバイルUI最適化完了** - 寄付バナーとフッターのレスポンシブ改善

---

## Current Critical Status

### ✅ Completed This Session

| Task | Status | Details |
|------|--------|---------|
| **寄付報告バナー モバイルUI** | ✅ 完了 | モバイル: 縦積み、デスクトップ: 横並び維持 |
| **フッターリンク一文化** | ✅ 完了 | `利用規約・プライバシー・特商法` 形式 |
| **Vercel デプロイ** | ✅ 完了 | https://commit-app-web.vercel.app |

### 寄付バナー レスポンシブ構造

**モバイル (`<md`):**
```
[アイコン48px] [タイトル]        [→]
[説明文（フル幅、アイコン分インデント）    ]
```

**デスクトップ (`≥md`):**
```
[アイコン64px] [タイトル + 説明] [ボタン→]
```

### フッター構造

**変更前:** `gap-6` でリンク間に大きな間隔（モバイルで折り返し問題）
**変更後:** 区切り文字「・」で一文に連結 (`利用規約・プライバシー・特商法`)

---

## Key Files Modified This Session

| Category | Files | Status |
|----------|-------|--------|
| **Web Portal** | `commit-app-web/src/app/page.tsx` | ✅ 更新済み |

---

## Git Status

### Web Portal (commit-app-web)
- 変更あり（未コミット）: `src/app/page.tsx`
- デプロイ済み: https://commit-app-web.vercel.app

---

## Immediate Next Steps

### 🚀 Phase 7.8: Payment Method Registration Flow (残タスク)

- [x] Dashboard Banner (モバイルアプリ) - カード未登録時に常時表示 ✅
- [ ] Stripe Webhook (`payment_method.attached`) - optional
- [ ] `payment_method_registered` フラグ管理

### 🚀 Phase 7.9: Apple IAP / Google Play Billing

1. **調査 & 設計**
   - `react-native-iap` または `expo-in-app-purchases` の選定
   - Apple App Store Connect でサブスクリプション商品設定
   - Google Play Console で定期購入商品設定

2. **Onboarding Paywall更新**
   - `OnboardingScreen13_Paywall.tsx` をIAP対応に変更

3. **Webhook実装**
   - Apple Server-to-Server Notifications
   - Google Real-time Developer Notifications

---

## Critical Architecture Rule

```
┌─────────────────────────────────────────────────────────┐
│                    COMMIT App                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   サブスクリプション              ペナルティ (寄付)      │
│   ┌─────────────────┐          ┌─────────────────┐     │
│   │ Apple IAP       │          │ Stripe          │     │
│   │ Google Play     │          │ (Web Portal)    │     │
│   │ Billing         │          │                 │     │
│   └────────┬────────┘          └────────┬────────┘     │
│            │                            │              │
│            ▼                            ▼              │
│   ストアアプリで解約            カード登録 & 課金       │
│   (設定 > サブスクリプション)    (/billing ページ)      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**絶対にWeb Portalでサブスクリプション解約を実装しないこと！**

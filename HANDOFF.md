# Handoff: Session 2026-02-02 (Sandbox IAP Testing Complete!)

## Current Goal
**✅ Build #64: Sandbox課金テスト成功、Appleログイン追加**

---

## Current Critical Status

### 🎉 Sandbox IAP テスト成功

**Build #64 で以下を確認:**
- Google Sign-In ✅
- Apple Sign-In ✅
- IAP課金フロー ✅（Sandbox環境）
- ダッシュボード遷移 ✅

### ビルド状況

| Build | 状態 | 内容 |
|-------|------|------|
| #61 | ✅ | Google Sign-In修正 |
| #62 | ✅ | APPLE_APP_SHARED_SECRET設定前 |
| #63 | ✅ | アカウント作成画面レイアウト修正 |
| #64 | ✅ | ポーリング最適化 + Appleログイン追加 |

---

## What We Fixed Today

### 1. APPLE_APP_SHARED_SECRET（CRITICAL）

**問題**: IAP購入後、subscription_statusがactiveに更新されず、画面遷移しない

**原因**: `verify-iap-receipt` Edge FunctionがAppleレシート検証に必要な共有シークレットが未設定

**修正**:
```bash
supabase secrets set APPLE_APP_SHARED_SECRET=55cbc0d892194a1094ab20dff8f8ff4d
supabase functions deploy verify-iap-receipt --no-verify-jwt
```

### 2. ポーリング最適化

**問題**: サブスク購入後、課金画面で1分近く待たされる

**原因**: purchaseListenerの成功を待たずに、1秒ごと×30回のDBポーリングを続行

**修正** (`OnboardingScreen13_Paywall.tsx`):
```typescript
// useRefでフラグ管理
const iapVerifiedRef = useRef(false);

// purchaseListenerの成功コールバックでフラグを立てる
setPurchaseListener(async (productId, transactionId) => {
  iapVerifiedRef.current = true;  // ← 追加
}, onError);

// ポーリングでフラグをチェック（500msに短縮）
while (attempts < maxAttempts) {
  await new Promise(resolve => setTimeout(resolve, 500));
  if (iapVerifiedRef.current) return true;  // ← 早期終了
  // ...DB check
}
```

### 3. Appleログイン追加 (AuthScreen)

**問題**: ログイン画面にGoogleログインしかなかった

**修正**: `AuthScreen.tsx`にAppleログインボタン追加（iOSのみ表示）

### 4. アカウント作成画面レイアウト修正

**問題**: パスワードフィールドと「アカウントを作成」ボタンが重なっていた

**修正**: `OnboardingScreen6_Account.tsx`でフォームを`ScrollView`でラップ

---

## Sandbox課金テストの学び

### $表記問題（正常な動作）
- **アプリ表示**: $19.99 / $2.99（Sandbox環境ではUSD表記になることがある）
- **実際の課金**: ¥3,000 / ¥480（Appleが自動的に日本円に変換）
- **本番環境**: 日本のApp Storeでは¥表記になる

### 2種類のアカウントの使い分け
| 用途 | アカウント | タイミング |
|------|-----------|----------|
| アプリ登録 | 普通のGoogle/Apple | オンボーディング時 |
| 課金テスト | Sandboxアカウント | 購入ボタン押下後 |

### Sandboxアカウント確認方法
iPhoneの「設定」アプリ → 一番下にスクロール → 「SANDBOXアカウント」項目が出現

---

## Immediate Next Steps

### ✅ 完了した項目
- [x] APPLE_APP_SHARED_SECRET設定
- [x] verify-iap-receipt Edge Function再デプロイ
- [x] Sandbox課金テスト成功
- [x] ポーリング最適化
- [x] Appleログイン追加
- [x] Build #64 TestFlight提出

### 次のタスク
- [ ] Build #64のTestFlight動作確認
- [ ] ポーリング最適化の効果確認（待ち時間短縮）
- [ ] App Store Connect Webhook URL設定（サブスク状態自動更新）
- [ ] 本番リリース前のStripeキー差し替え

---

## Remaining SHOWSTOPPERs

### App Store Connect Webhook URL設定（推奨）
サブスクリプション状態の自動更新用：
```
URL: https://rnksvjjcsnwlquaynduu.supabase.co/functions/v1/apple-iap-webhook
```
設定場所: App Store Connect → アプリ → App Store → App情報 → サーバー通知URL

### Stripe 本番キー (.env)
- 現在: `pk_test_*` (テストモード)
- 本番ビルド前に `pk_live_*` に差し替え必須

---

## Previous Sessions Summary

**Sandbox IAP Testing Complete (2026-02-02 現セッション):**
- APPLE_APP_SHARED_SECRET設定でレシート検証成功
- ポーリング最適化（1分→数秒に短縮）
- Appleログイン追加（AuthScreen）
- アカウント作成画面レイアウト修正

**Google Sign-In Fix Complete (2026-02-02 earlier):**
- iOS Client ID のタイポ修正 (`ogejlon...` → `ogejion...`)
- Build #61 で Google Sign-In 動作確認成功

**MonkMode Sound Fix (2026-01-28):**
- SoundManagerシングルトンのisMuted残留バグを修正

**UserStatus Cache Strategy (2026-01-27):**
- AsyncStorageキャッシュでDB障害時のフォールバック実装

**TestFlight Black Screen Fix (2026-01-27):**
- expo-splash-screen制御追加、env.tsクラッシュ防止

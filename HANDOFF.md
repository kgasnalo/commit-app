# Handoff: Session 2026-01-17

## Current Goal
**UI改善セッション完了** - テキスト改行問題、パスワードバリデーション強化、アーカイブ画面のテキスト視認性改善

---

## Current Critical Status

### Resolved This Session

| Issue | Status | Fix |
|-------|--------|-----|
| **オンボーディング見出しの改行問題** | ✅ Resolved | `adjustsFontSizeToFit` + 動的 `numberOfLines` |
| **パスワードが1文字でも登録可能** | ✅ Resolved | 8文字以上 + 英数字必須に強化 |
| **Screen7のデータが表示されない** | ✅ Resolved | AsyncStorageからのフォールバック読み込み追加 |
| **OnboardingScreen3が英語のまま** | ✅ Resolved | i18nキー追加 (3言語同期) |
| **HeroBillboardのテキスト視認性** | ✅ Resolved | 多層アプローチ (背景+ボールド+シャドウ) |
| **VerificationSuccessModalの改行** | ✅ Resolved | fontSize/paddingの調整 |

---

## What Worked (Solutions Applied)

### 1. テキスト改行問題 (adjustsFontSizeToFit)
- **Problem:** 日本語見出し「読まなかった1冊は...」で「つ」だけ改行される
- **Attempted:** フォントサイズ縮小 (32→30→28) - 効果なし
- **Fix:** `adjustsFontSizeToFit` + 動的 `numberOfLines={title.split('\n').length}`
- **Learning:** `numberOfLines` は固定値ではなく、テキスト内の実際の改行数から計算すること

### 2. OAuth後のデータ消失問題
- **Problem:** Screen7でtsundokuCount等が常にデフォルト値 (3000, 5, 10)
- **Cause:** OAuth認証でナビゲーションスタックが完全置換され、route.paramsが消失
- **Fix:** AsyncStorageからのフォールバック読み込み追加
- **Pattern:** OAuth前にAsyncStorageに保存 → OAuth後に読み込み

### 3. 画像上テキストの視認性 (HeroBillboard)
- **Problem:** 明るい表紙画像で白テキストが見えない
- **Fix:** Netflix/Spotify風の多層アプローチ:
  - グラデーションオーバーレイ強化 (0.35→0.6)
  - テキストバックドロップ追加 (黒グラデ背景)
  - フォント太さ増加 (100→600)
  - 黒シャドウ追加 (`rgba(0,0,0,1)`)
- **Files Modified:**
  - `HeroBillboard.tsx`: タイトル/著者/日付スタイル
  - `AutomotiveMetrics.tsx`: ラベル/値スタイル

### 4. パスワードバリデーション強化
- **Problem:** 1文字のパスワードでも登録可能
- **Fix:**
  - 最低8文字に変更
  - 英字 + 数字の両方必須
- **i18n Keys Added:** `password_too_short`, `password_requirements`

---

## Key Files Modified This Session

| Category | Files |
|----------|-------|
| **Onboarding Layout** | `src/components/onboarding/OnboardingLayout.tsx` |
| **Onboarding Screens** | `OnboardingScreen3_BookSelect.tsx`, `OnboardingScreen6_Account.tsx`, `OnboardingScreen7_OpportunityCost.tsx` |
| **Hall of Fame** | `src/components/hall-of-fame/HeroBillboard.tsx`, `AutomotiveMetrics.tsx` |
| **Modals** | `src/components/VerificationSuccessModal.tsx` |
| **i18n** | `src/i18n/locales/{ja,en,ko}.json` |

---

## Git Status

### Mobile App (commit-app)
- Branch: `main`
- Last Commit: `9ac9b8c3` (docs: update HANDOFF, CLAUDE.md, and ROADMAP for billing UI session)
- Status: Clean, pushed to origin

---

## Key Patterns Learned

### 1. Dynamic numberOfLines for adjustsFontSizeToFit
```typescript
// GOOD - respects explicit \n in translation strings
<Text
  adjustsFontSizeToFit
  numberOfLines={title.split('\n').length}
>
  {title}
</Text>
```

### 2. Text Visibility on Dynamic Backgrounds
```typescript
// Multi-layer approach for guaranteed readability
// Layer 1: Darkened overlay on image
coverImageOverlay: { backgroundColor: 'rgba(8, 6, 4, 0.45)' }

// Layer 2: Text backdrop gradient
<LinearGradient
  colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.4)', 'transparent']}
/>

// Layer 3: Bold text with black shadow
title: {
  fontWeight: '600',
  color: '#FFFFFF',
  textShadowColor: 'rgba(0, 0, 0, 1)',
  textShadowOffset: { width: 0, height: 2 },
  textShadowRadius: 12,
}
```

### 3. OAuth Data Persistence Pattern
```typescript
// Before OAuth (in Screen6)
await AsyncStorage.setItem('onboardingData', JSON.stringify({
  selectedBook, deadline, pledgeAmount, currency, tsundokuCount
}));

// After OAuth (in Screen7)
const onboardingData = await AsyncStorage.getItem('onboardingData');
const data = JSON.parse(onboardingData);
// Use data.tsundokuCount, etc.
```

---

## Immediate Next Steps

1. **Mobile Dashboard Banner** (7.8続き)
   - カード未登録時のバナー表示
   - `payment_method_registered`フラグの管理

2. **Stripe Webhook設定** (optional)
   - `payment_method.attached`イベントでフラグ自動更新

3. **E2Eテスト**
   - オンボーディング完全フロー確認
   - アーカイブ画面での視認性確認

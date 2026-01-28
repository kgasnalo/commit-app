# Handoff: Session 2026-01-28 (MonkMode Sound Fix)

## Current Goal
**MonkModeActiveScreenで環境音が鳴らないバグを修正完了。SoundManagerシングルトンの`isMuted`残留が原因。**

---

## Current Critical Status

### 今セッションで実装した内容

| 変更 | 内容 | ファイル |
|------|------|----------|
| `cleanup()`でisMutedリセット | OnboardingAtmosphere unmount時にミュート状態もリセット | `src/lib/audio.ts` L508 |
| MonkMode初期化時にミュート解除 | `initialize()`後、再生前に`setMuted(false)`を呼出 | `src/screens/monkmode/MonkModeActiveScreen.tsx` L94 |

### バグの根本原因

```
フロー:
  1. OnboardingAtmosphereContext: SoundManager.setMuted(true) → isMuted = true
  2. Onboarding完了 → cleanup() → isInitialized = false（isMutedはそのまま）
  3. MonkModeActiveScreen → initialize() → playMonkModeSound()
     → L368 if (this.isMuted) return; → 即return → 無音

修正:
  - cleanup()で isMuted = false にリセット
  - MonkModeActiveScreen側でも明示的に setMuted(false) を呼出（安全策）
```

### 前セッションからの未変更事項

| 項目 | 状態 |
|------|------|
| UserStatusキャッシュ戦略 | 実装済み（Build #5には未反映） |
| Edge Function WORKER_ERROR対策 | リトライロジック実装済み |
| Sentry Deno SDK | 一時無効化中 |
| TestFlight Build #5 | Apple処理待ち |

---

## What Didn't Work

### 1. 前回の遅延ロードガード追加（効果なし）
```
症状: MonkModeActiveScreenで環境音が鳴らない
試行: playMonkModeSound / previewMonkModeSound に遅延ロードガード追加
結果: 効果なし。問題はリソースロードではなくisMutedフラグの残留だった
教訓: シングルトンの状態残留は、cleanup()でリセットされる状態と
      されない状態を全てチェックすること
```

### 2. withTimeoutフォールバックがキャッシュをバイパス (前セッション)
```
解決済み: withTimeout呼び出し前にgetCachedUserStatus()を実行し、
         その結果をフォールバック値として渡す
```

---

## Immediate Next Steps

### 1. TestFlight 検証 (最優先)
- [ ] Build #5のTestFlightインストール＆基本動作確認
- [ ] オンボーディング → Screen13コミットメント作成成功を確認
- [ ] MonkMode環境音が鳴ることを確認（Build #5には今回修正未反映）

### 2. 次回ビルド (今回修正 + UserStatusキャッシュ反映)
- [ ] `eas build --profile production --platform ios`
- [ ] `eas submit --platform ios --non-interactive`

### 3. トラブルシューティング
- Edge Function再デプロイ: `supabase functions deploy create-commitment --no-verify-jwt`
- Metroキャッシュクリア: `npx expo start --clear`

---

## Remaining SHOWSTOPPERs

### Apple IAP / Google Play Billing (ROADMAP 7.9)
- `OnboardingScreen13_Paywall.tsx` は価格表示UIのみ
- 購入処理なし - `subscription_status: 'active'` をDB直接セット
- **審査100%リジェクト** (Apple Guideline 3.1.1違反)

### Stripe 本番キー (.env)
- 現在: `pk_test_*` (テストモード)
- 本番ビルド前に `pk_live_*` に差し替え必須

---

## Previous Sessions Summary

**MonkMode Sound Fix (2026-01-28 現セッション):**
- SoundManagerシングルトンのisMuted残留バグを修正

**UserStatus Cache Strategy (2026-01-27):**
- AsyncStorageキャッシュでDB障害時のフォールバック実装

**Screen13 500 Error Fix (2026-01-27):**
- Edge Function再デプロイ + Metroキャッシュクリアで500エラー解消

**TestFlight Black Screen Fix (2026-01-27):**
- expo-splash-screen制御追加、env.tsクラッシュ防止、eas.json ascAppId設定

**Edge Function Retry Logic (2026-01-26):**
- クライアントサイドリトライロジック実装 (WORKER_ERROR対策)

**Security Audit Phase 1-3 (2026-01-25~26):**
- CRITICAL 4件 + HIGH 7件のセキュリティ修正

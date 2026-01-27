# Handoff: Session 2026-01-27 (Screen13 500 Error Fix)

## Current Goal
**Screen13 (Paywall) の create-commitment Edge Function 500エラーを解消。TestFlightビルド#5のApple処理待ち継続中。**

---

## Current Critical Status

### 今セッションで修正した内容

| 原因 | 修正 | 状態 |
|------|------|------|
| create-commitment Edge Functionが3回連続WORKER_ERROR | Edge Function再デプロイ (`--no-verify-jwt`) | ✅ 解消 |
| Metroキャッシュが古いコードを配信（削除済みログメッセージが表示） | `npx expo start --clear` で再起動 | ✅ 解消 |

### 前セッションの修正（適用済み・変更なし）

| 原因 | 修正 | ファイル |
|------|------|----------|
| `SplashScreen.hideAsync()` 未実装 → 黒splash永久表示 | `preventAutoHideAsync` + 認証完了後 `hideAsync` 追加 | `App.js`, `AppNavigator.tsx` |
| `env.ts` が必須変数欠落時にErrorBoundary前でthrow | try-catchでフォールバック値を返すよう修正 | `src/config/env.ts` |
| `eas.json` に `ascAppId` 未設定 | `6758319830` を設定 | `eas.json` |

### ビルド&サブミット状況

```
ビルド:
  ✅ Build #5 (4495c45c) - production profile
  App Version: 1.0.0, Build Number: 5

サブミット:
  ✅ Apple App Store Connectにアップロード済み
  Submission ID: 980998db-cc42-4236-a7ec-d7ceb8b85418
  TestFlight URL: https://appstoreconnect.apple.com/apps/6758319830/testflight/ios
  状態: Apple処理待ち
```

### Sentry SDK 状況 (変更なし)

```
状態: 一時的に無効化
ファイル: supabase/functions/_shared/sentry.ts
理由: Sentry Deno SDKがEdge Runtimeでクラッシュ
TODO: 互換SDKリリース次第、再有効化
```

---

## What Didn't Work

### 1. Edge Function WORKER_ERROR (3回連続失敗)
```
症状: Screen13でスライド → create-commitment呼び出し → 500 WORKER_ERROR × 3回
原因: Edge Functionのデプロイ不良 + Deno Deploy Cold Start
解決: supabase functions deploy create-commitment --no-verify-jwt
教訓: リトライロジック(invokeFunctionWithRetry)は正常動作していたが、
     Edge Function自体が壊れていたため3回とも失敗した。
     コード修正だけでなく、Edge Functionの再デプロイが必要な場合がある。
```

### 2. Metroバンドラーのキャッシュ残り
```
症状: コードから削除済みのログ「Could not parse error body as JSON」が出力される
原因: Metroが古いバンドルをキャッシュしていた
解決: npx expo start --clear
教訓: コード変更後に「変更前の挙動」が再現する場合、まずMetroキャッシュを疑う。
```

### 3. expo-splash-screen の hideAsync() 未呼び出し (前セッション)
```
症状: TestFlightで起動すると黒画面のまま固まる
原因: SplashScreen.hideAsync() がどこにも呼ばれていなかった
解決: App.jsでpreventAutoHideAsync、AppNavigatorの認証完了後にhideAsync
```

### 4. Sentry Deno SDK (前セッションから)
```
症状: Edge FunctionがWORKER_ERRORを返す
原因: Sentry SDKがDeno Edge Runtime非対応
解決: no-opスタブに置換、全Edge Functionを再デプロイ
```

---

## Screen13フロー分析結果

### 現在の課金→コミットメント作成フロー
```
ユーザーが「Slide to Commit」スライド
  ↓
create-commitment Edge Function呼び出し (リトライ3回付き)
  ├─ ✅ 成功 → CinematicCommitReveal表示 → subscription_status='active'更新 → MainTabs
  └─ ❌ 失敗 → Alert表示 → スライダー再アクティブ化 → ユーザー再試行可能
```

### IAP未実装のため現時点では安全
- 実際の課金処理（Apple IAP）は未実装
- `subscription_status: 'active'` はDB直接更新（コミットメント作成成功後のみ）
- 失敗時: 課金なし + コミットメントなし = 一貫性保持

### IAP実装時に必要な対策 (将来のTODO)
1. 課金成功をAsyncStorageに永続化 → create-commitment失敗時の再送機構
2. サーバーサイドWebhookでレシート検証 → コミットメント作成をサーバー保証
3. Alertに明示的な再試行ボタン追加

---

## Immediate Next Steps

### 1. TestFlight 検証 (最優先)
- [ ] Appleの処理完了メールを待つ
- [ ] TestFlightでビルド#5をインストール
- [ ] 起動 → 黒画面でないことを確認
- [ ] オンボーディングフロー → Screen13でコミットメント作成成功を確認

### 2. Screen13エラーが再発する場合
- Edge Function再デプロイ: `supabase functions deploy create-commitment --no-verify-jwt`
- Metroキャッシュクリア: `npx expo start --clear`
- Edge Functionログ確認: Supabase Dashboard > Functions > create-commitment > Logs

---

## Remaining SHOWSTOPPERs

### Apple IAP / Google Play Billing (ROADMAP 7.9)
- `OnboardingScreen13_Paywall.tsx` は価格表示UIのみ
- 購入処理なし - `subscription_status: 'active'` をDB直接セット
- `react-native-iap` / `expo-in-app-purchases` 未インストール
- **審査100%リジェクト** (Apple Guideline 3.1.1違反)

### Stripe 本番キー (.env)
- 現在: `pk_test_*` (テストモード)
- 本番ビルド前に `pk_live_*` に差し替え必須

---

## Previous Sessions Summary

**Screen13 500 Error Fix (2026-01-27 現セッション):**
- Edge Function再デプロイ + Metroキャッシュクリアで500エラー解消

**TestFlight Black Screen Fix (2026-01-27):**
- expo-splash-screen制御追加、env.tsクラッシュ防止、eas.json ascAppId設定

**Edge Function Retry Logic (2026-01-26):**
- クライアントサイドリトライロジック実装 (WORKER_ERROR対策)

**Sentry WORKER_ERROR Fix (2026-01-26):**
- Sentry Deno SDKを無効化してEdge Function WORKER_ERROR解消

**Security Audit Phase 1-3 (2026-01-25~26):**
- CRITICAL 4件 + HIGH 7件のセキュリティ修正

**Username Uniqueness (2026-01-24):**
- DB UNIQUE制約 + クライアントリアルタイムバリデーション

**Pre-Release Audit Fixes (2026-01-23):**
- moti削除、Paywall i18n、韓国語locale、権限英語化、PII除去

# Handoff: Session 2026-01-27 (UserStatus Cache Strategy)

## Current Goal
**DB読み込み失敗時にAsyncStorageキャッシュでフォールバックする仕組みを実装完了。TestFlightビルド#5のApple処理待ち継続中。**

---

## Current Critical Status

### 今セッションで実装した内容

| 変更 | 内容 | ファイル |
|------|------|----------|
| UserStatusキャッシュ戦略 | DB成功時にAsyncStorageへ書き込み、タイムアウト/エラー時にキャッシュ読み込み | `AppNavigator.tsx` |
| withTimeoutフォールバック修正 | 3箇所の`withTimeout`ラッパーのフォールバック値をキャッシュベースに変更 | `AppNavigator.tsx` |
| onboardingDataベース判定の削除 | `isLikelyNewUser`ロジックを削除、キャッシュ有無で判定に統一 | `AppNavigator.tsx` |
| Realtimeハンドラのキャッシュ更新 | DB変更がリアルタイムでキャッシュにも反映 | `AppNavigator.tsx` |

### 設計上の重要ポイント

```
キャッシュフロー:
  DB成功 → setCachedUserStatus() → AsyncStorage書き込み
  Realtime更新 → setCachedUserStatus() → AsyncStorage書き込み

フォールバックフロー (3層):
  1. checkUserStatus内部: タイムアウト/エラー/catch → getCachedUserStatus()
  2. withTimeout外部: initializeAuth/onAuthStateChange/refreshListener → getCachedUserStatus()
  3. 最終フォールバック: キャッシュなし → {false, false} (安全側=Onboarding)

キー: userStatus_{userId} (ユーザーごとに分離)
```

### 発見した致命的バグと修正

```
問題: checkUserStatus内部にキャッシュフォールバックを入れても、
      外側のwithTimeoutが先にタイムアウトするとキャッシュが読まれない。

      initializeAuth: 外側8s < 内部最大13.5s → 外側が先にタイムアウト
      → ハードコード {false, false} が返る → 既存ユーザーがOnboardingに戻される

解決: 3箇所のwithTimeoutフォールバック値を事前にgetCachedUserStatus()で取得し、
      キャッシュがあればそれをフォールバック値として渡すよう変更。
```

### 前セッションの修正（適用済み・変更なし）

| 原因 | 修正 | ファイル |
|------|------|----------|
| create-commitment Edge FunctionがWORKER_ERROR | Edge Function再デプロイ (`--no-verify-jwt`) | Edge Function |
| `SplashScreen.hideAsync()` 未実装 → 黒splash永久表示 | `preventAutoHideAsync` + 認証完了後 `hideAsync` 追加 | `App.js`, `AppNavigator.tsx` |
| `env.ts` が必須変数欠落時にthrow | try-catchでフォールバック値を返すよう修正 | `src/config/env.ts` |
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
  注意: UserStatusキャッシュはBuild #5に含まれていない（次回ビルドで反映）
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

### 1. withTimeoutフォールバックがキャッシュをバイパス (今セッション)
```
症状: UserStatusキャッシュを実装したのに、外側のwithTimeoutが
      先にタイムアウトするとキャッシュが使われない
原因: withTimeout(checkUserStatus(), 8s, {false,false}) の構造上、
      checkUserStatus内部リトライ(最大13.5s)が完了する前に外側が切れ、
      ハードコードされた{false,false}がフォールバックとして使われる
解決: withTimeout呼び出し前にgetCachedUserStatus()を実行し、
      その結果をフォールバック値として渡す
教訓: withTimeoutでラップする関数が内部にフォールバック機構を持つ場合、
      外側のタイムアウトが内部機構を無効化しないか必ず確認する。
      「タイムアウトの入れ子」は外側が常に勝つ。
```

### 2. onboardingDataベースの新規/既存ユーザー判定の脆弱性 (今セッション削除)
```
症状: 既存ユーザーでもonboardingDataが残っているケースがあり得る
      (AsyncStorageクリア漏れ等)
原因: isLikelyNewUserの判定がonboardingDataの有無のみに依存
解決: キャッシュベースのフォールバックに統一。
      キャッシュあり=過去にDB成功した既存ユーザー、
      キャッシュなし=新規ユーザーまたはアプリ再インストール
```

### 3. Edge Function WORKER_ERROR (前セッション)
```
解決済み: supabase functions deploy create-commitment --no-verify-jwt
```

### 4. Metroバンドラーのキャッシュ残り (前セッション)
```
解決済み: npx expo start --clear
```

---

## Immediate Next Steps

### 1. TestFlight 検証 (最優先)
- [ ] Appleの処理完了メールを待つ
- [ ] TestFlightでビルド#5をインストール
- [ ] 起動 → 黒画面でないことを確認
- [ ] オンボーディングフロー → Screen13でコミットメント作成成功を確認
- [ ] 注意: Build #5にはUserStatusキャッシュは含まれていない

### 2. 次回ビルド (UserStatusキャッシュ反映)
- [ ] Build #5の検証完了後、キャッシュ込みのBuild #6を作成
- [ ] `eas build --profile production --platform ios`
- [ ] `eas submit --platform ios --non-interactive`

### 3. Screen13エラーが再発する場合
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

**UserStatus Cache Strategy (2026-01-27 現セッション):**
- AsyncStorageキャッシュでDB障害時のフォールバック実装
- withTimeoutフォールバックのキャッシュバイパス問題を発見・修正

**Screen13 500 Error Fix (2026-01-27):**
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

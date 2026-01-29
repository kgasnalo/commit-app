# スプラッシュ画面フリーズ デバッグ記録

## 問題概要
- **発生バージョン:** Build #6〜#21 (TestFlight)
- **症状:** スプラッシュ画面で永久停止
- **環境:** iOS実機 (TestFlight + ローカルReleaseビルド)
- **ユーザー報告:** 「COMMIT」ロゴ + スモークエフェクト表示のまま固まる（"SYSTEM INITIALIZING..."テキストなし）

---

## 試行履歴

### 試行 #1: expo-dev-client除外
- **日時:** 2026-01-28
- **仮説:** dev-clientが本番に含まれているのが原因
- **実施内容:**
  - `eas.json`: `developmentClient: false`
  - `package.json`: devDependenciesに移動
- **結果:** ❌ 効果なし（同じフリーズ）
- **学び:** dev-clientは原因ではなかったが、正しい構成修正ではある

### 試行 #2: preventAutoHideAsync() + 10秒セーフティタイマー追加
- **日時:** 2026-01-28
- **仮説:**
  - `SplashScreen.preventAutoHideAsync()`が呼ばれていない
  - セーフティタイマーがProviderチェーン深部（5層目）にのみ存在し、Provider途中でクラッシュすると無効
- **実施内容:**
  - `App.js`にモジュールレベルで`SplashScreen.preventAutoHideAsync()`追加
  - `App.js`にモジュールレベル10秒セーフティタイマー追加
- **結果:** ❌ 効果なし（同じフリーズ）
- **学び:**
  - 10秒タイマーも発火していない可能性が高い
  - **JSコード自体が実行されていない**可能性を強く示唆
  - ネイティブレイヤー（prebuild/Xcode設定）に問題がある可能性

### 試行 #3: Xcodeログで真の原因特定 ✅ **解決**
- **日時:** 2026-01-29
- **検証方法:** Xcodeコンソールでエラーログを確認
- **発見したエラー:**
  ```
  エラー 10:24:06.926274 COMMIT [runtime not ready]: Error: supabaseUrl is required.
  エラー 10:24:06.926373 COMMIT Unhandled JS Exception: supabaseUrl is required.
  ```
- **根本原因特定:** 環境変数未設定によるSupabase初期化エラー
- **結果:** ✅ **原因特定・修正完了・アプリ起動成功**

---

## 検証チェックリスト

### ローカルDebugビルド (2026-01-29) ✅
- [x] prebuild成功 (`rm -rf ios && npx expo prebuild --clean`)
- [x] ビルド成功 (`npx expo run:ios --device <UDID>`)
- [x] 実機インストール成功 (`xcrun devicectl device install app`)
- [x] スプラッシュが正常に消える
- [x] アプリが正常表示（Onboarding）

### TestFlight (EAS枠復活後 - 2026-02-01以降)
- [ ] EASビルド成功
- [ ] TestFlight配信成功
- [ ] スプラッシュが10秒以内に消える
- [ ] アプリが正常表示

---

## 調査で判明した事実

### 技術的発見

#### 1. preventAutoHideAsync()未呼出
- CLAUDE.mdには記載あり、実際のApp.jsには存在しなかった
- コミット`682cf580`で追加されたが、その後消失した可能性

#### 2. セーフティタイマーの位置問題
- 5秒タイマーはNavigationContent内（Provider 5層目）
- Provider途中でクラッシュするとタイマー自体が実行されない

#### 3. ユーザー画面の分析
- **表示:** 「COMMIT」ロゴ + スモークエフェクト
- **非表示:** "SYSTEM INITIALIZING..."テキスト
- **結論:** ネイティブスプラッシュ（Storyboard）のまま停止
- **推測:** JSが実行されていない or Reactツリー未マウント

### Provider階層構造
```
App.js
  └── AppNavigator
        └── LanguageProvider
              └── OfflineProvider
                    └── AppNavigatorInner
                          └── NavigationContainer
                                └── AnalyticsProvider
                                      └── UnreadProvider
                                            └── NavigationContent ← 5秒タイマー（ここ）
```

**問題:** 上位6層のどこかでエラー発生 → NavigationContentに到達しない → タイマー発火しない

---

## 🎯 根本原因（2026-01-29 特定）

### エラーチェーン詳細

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. EASビルドで環境変数が未設定（EAS Secretsが未登録 or 読み込み失敗）    │
│    ↓                                                                    │
│ 2. env.ts: EXPO_PUBLIC_SUPABASE_URL が空                                │
│    → getRequiredEnv() がエラーをスロー                                  │
│    → try-catch で ENV_INIT_ERROR に格納                                 │
│    → SUPABASE_URL = '' (空文字列フォールバック)                          │
│    ↓                                                                    │
│ 3. supabase.ts (8行目): createClient('', '') を即座に実行               │
│    → Supabase SDK が "supabaseUrl is required" エラーをスロー           │
│    → このエラーは try-catch されていない（モジュールレベル実行）          │
│    ↓                                                                    │
│ 4. JSランタイムがフリーズ                                                │
│    → 後続のコードが一切実行されない                                      │
│    → App.jsの10秒タイマーも到達しない                                    │
│    ↓                                                                    │
│ 5. SplashScreen.hideAsync() 未実行 → 永久フリーズ                        │
└─────────────────────────────────────────────────────────────────────────┘
```

### なぜ試行#1, #2が効果なかったか

| 試行 | なぜ効果なし |
|------|-------------|
| #1 dev-client除外 | 原因はdev-clientではなく環境変数問題 |
| #2 10秒タイマー | supabase.tsのimport時点でクラッシュするため、App.jsのタイマーに到達しない |

### キーポイント
- **モジュールレベルのcreateClient()呼び出し**が問題
- import文の評価時点でエラーが発生
- try-catchで囲んでも、import時のエラーはキャッチできない
- **解決策:** createClient()を関数内に移動し、条件付きで実行

---

## ✅ 最終的な解決策（2026-01-29 実装）

### 修正ファイル一覧

| ファイル | 修正内容 |
|----------|----------|
| `src/lib/supabase.ts` | 防御的初期化、`isSupabaseInitialized()`追加 |
| `src/navigation/AppNavigator.tsx` | 初期化チェック追加、セーフティタイマー短縮 |

### 修正1: supabase.ts の防御的初期化

**Before (問題のコード):**
```typescript
// モジュールレベルで即座に実行 → 空文字列でクラッシュ
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {...});
```

**After (修正後):**
```typescript
import { SUPABASE_URL, SUPABASE_ANON_KEY, ENV_INIT_ERROR } from '../config/env';

/**
 * 空の認証情報をチェックしてからcreateClientを呼ぶ
 */
function createSafeClient(): SupabaseClient<Database> | null {
  // 環境変数エラーまたは空の認証情報 → nullを返す
  if (ENV_INIT_ERROR || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('[Supabase] Cannot initialize: missing credentials', {
      hasEnvError: !!ENV_INIT_ERROR,
      hasUrl: !!SUPABASE_URL,
      hasKey: !!SUPABASE_ANON_KEY,
    });
    return null;
  }

  // 認証情報が存在する場合のみcreateClient実行
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

const supabaseClient = createSafeClient();

// TypeScript型互換性のためnon-nullキャスト（実行時はnullの可能性あり）
export const supabase = supabaseClient as SupabaseClient<Database>;

// 初期化チェック用ヘルパー
export const isSupabaseInitialized = (): boolean => supabaseClient !== null;
```

### 修正2: AppNavigator.tsx の初期化チェック

**重要:** `initializeAuth()` 関数内だけでなく、**全ての** `supabase` 呼び出しを保護する必要がある（全9箇所）。

```typescript
import { supabase, AUTH_REFRESH_EVENT, isSupabaseInitialized } from '../lib/supabase';

// ===== 1. checkUserStatus内のチェック (Build #35で追加) =====
async function checkUserStatus(userId: string, retryCount = 0): Promise<UserStatus> {
  if (!isSupabaseInitialized()) {
    if (__DEV__) console.warn('📊 checkUserStatus: Supabase not initialized, returning default');
    return defaultStatus;
  }
  // supabase.auth.getSession(), supabase.from()を使用...
}

// ===== 2. createUserRecordFromOnboardingData内のチェック (Build #35で追加) =====
async function createUserRecordFromOnboardingData(session: Session): Promise<void> {
  if (!isSupabaseInitialized()) {
    if (__DEV__) console.warn('🔗 createUserRecord: Supabase not initialized, skipping');
    return;
  }
  // supabase.from('users').upsert()を使用...
}

// ===== 3. handleDeepLink内のチェック (Build #35で追加) =====
async function handleDeepLink(url: string | null) {
  // ...token validation...
  if (!isSupabaseInitialized()) {
    if (__DEV__) console.warn('🔗 Deep Link: Supabase not initialized, cannot set session');
    return;
  }
  // supabase.auth.setSession()を使用...
}

// ===== 4. initializeAuth内のチェック =====
async function initializeAuth() {
  if (ENV_INIT_ERROR) {
    console.error('🚀 initializeAuth: ENV_INIT_ERROR detected:', ENV_INIT_ERROR);
    captureError(new Error(`ENV_INIT_ERROR: ${ENV_INIT_ERROR}`), { location: 'AppNavigator.initializeAuth' });
    if (isMounted) setAuthState({ status: 'unauthenticated' });
    return;
  }

  if (!isSupabaseInitialized()) {
    console.error('🚀 initializeAuth: Supabase client not initialized');
    captureError(new Error('Supabase client not initialized'), { location: 'AppNavigator.initializeAuth' });
    if (isMounted) setAuthState({ status: 'unauthenticated' });
    return;
  }
  // supabase.auth.getSession()を使用...
}

// ===== 5. onAuthStateChange呼び出しの保護 =====
let authSubscription: { unsubscribe: () => void } | null = null;

if (!isSupabaseInitialized()) {
  if (__DEV__) console.warn('⚠️ Auth: Skipping onAuthStateChange (Supabase not initialized)');
} else {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(...);
  authSubscription = subscription;
}

// ===== 6. setupRealtimeSubscription内の二重チェック =====
async function setupRealtimeSubscription() {
  if (!isSupabaseInitialized()) {
    if (__DEV__) console.warn('⚠️ setupRealtimeSubscription: Supabase not initialized');
    return;
  }
  // supabase.auth.getSession(), supabase.channel()を使用...
}

// ===== 7. setupRealtimeSubscription呼び出しの保護 =====
if (isSupabaseInitialized()) {
  setupRealtimeSubscription();
}

// ===== 8. refreshListener内の保護 =====
const refreshListener = DeviceEventEmitter.addListener(AUTH_REFRESH_EVENT, async () => {
  if (!isSupabaseInitialized()) {
    if (__DEV__) console.warn('⚠️ Auth Refresh: Skipping (Supabase not initialized)');
    return;
  }
  // supabase.auth.getSession()を使用...
});

// ===== 9. クリーンアップ時のnullチェック =====
return () => {
  authSubscription?.unsubscribe(); // オプショナルチェイニング必須
  // ...
};
```

### 修正3: セーフティタイマー短縮

```typescript
// Safety: force hide splash after 5s even if auth never resolves
useEffect(() => {
  const safetyTimer = setTimeout(() => {
    SplashScreen.hideAsync();
    if (authState.status === 'loading') {
      console.warn('[AppNavigator] Safety timer: forcing unauthenticated after 5s');
      setAuthState({ status: 'unauthenticated' });
    }
  }, 5000);  // 15秒 → 5秒に短縮
  return () => clearTimeout(safetyTimer);
}, []);
```

---

## コード構造分析

### App.js（現在）
```javascript
// モジュールレベル
import * as SplashScreen from 'expo-splash-screen';
SplashScreen.preventAutoHideAsync();

// 10秒セーフティタイマー
setTimeout(() => {
  SplashScreen.hideAsync().catch(() => {});
}, 10000);

function App() {
  return <AppNavigator />;
}
```

### AppNavigator内のhideAsync呼び出し
```javascript
// NavigationContent内
useEffect(() => {
  if (authState.status !== 'loading') {
    SplashScreen.hideAsync();
  }
}, [authState.status]);
```

---

## 修正履歴

| Build | 日付 | 修正内容 | 結果 |
|-------|------|----------|------|
| #6〜#21 | 〜2026-01-27 | (様々な修正) | ❌ フリーズ |
| #22 | 2026-01-28 | dev-client除外 + preventAutoHideAsync + 10秒タイマー | ❌ 効果なし |
| #25 | 2026-01-29 | 防御的supabase初期化 + isSupabaseInitialized() + セーフティタイマー5秒 | ✅ ローカル成功 |
| #35 | 2026-01-29 | onAuthStateChange/setupRealtimeSubscription/refreshListenerにisSupabaseInitialized()チェック追加 | 🔄 検証中 |

### コミット履歴
- `d1e2e386` - fix: prevent splash freeze when Supabase credentials missing
- `e5b79b9a` - docs: add splash freeze troubleshooting and EAS/local build checklists

---

## 仮説リスト（検証結果）

### 検証済み（却下）
- [x] **仮説A:** preventAutoHideAsync未呼出 + タイマー位置が深すぎ → ❌ 10秒タイマーも効果なし
- [x] **仮説B:** JSバンドルがロードされていない → ❌ JSは実行されていたがimport時にクラッシュ
- [x] **仮説C:** ネイティブモジュール初期化でクラッシュ → ❌ Supabase SDKが原因
- [x] **仮説D:** Sentryのネイティブ初期化ブロック → ❌ 無関係
- [x] **仮説E:** prebuildで生成されたXcode設定の問題 → ❌ 無関係
- [x] **仮説F:** EASビルドとローカルビルドの差異 → △ 環境変数の読み込み方法が異なる

### ✅ 真の原因
- **仮説G:** 環境変数未設定 + supabase.tsのモジュールレベルcreateClient()呼び出し
  - EASビルドでSecrets未設定 or 読み込み失敗
  - `createClient('', '')` がエラースロー
  - モジュールimport時点でJSランタイムがフリーズ

---

## ✅ 解決済み - ビルド手順

### EAS Build vs EAS Local Build の比較

| 方法 | コマンド | EAS枠消費 | ビルド場所 | 用途 |
|------|----------|-----------|------------|------|
| **EAS Build** | `eas build --profile production` | **する (30回/月)** | Expoクラウド | 手軽にビルド |
| **EAS Local Build** | `./build-eas-local.sh` | **しない** | ローカルマシン | 枠節約、高速 |

#### EAS月間ビルド枠について
- **無料プラン:** 30ビルド/月
- **上限到達時:** `./build-eas-local.sh` を使用（枠消費しない）
- **枠リセット:** 毎月1日
- **確認方法:** [EAS Dashboard](https://expo.dev/) でビルド履歴を確認

#### build-eas-local.sh の仕組み
```bash
#!/bin/bash
# 1. .env から環境変数を読み込み
set -a && source .env && set +a

# 2. eas build --local を実行
# → EASサーバーを使わずローカルマシンでビルド
# → 生成されるIPAはEAS Buildと同等
eas build --profile production --platform ios --local
```

---

### TestFlight配信の完全手順

#### 方法1: EAS Local Build → TestFlight（推奨・枠消費なし）

```bash
# Step 1: ローカルでビルド（EAS枠消費しない）
./build-eas-local.sh
# → 成功すると build-XXXX.ipa が生成される

# Step 2: TestFlightに配信
eas submit --platform ios --path ./build-*.ipa
# または最新のIPAを自動検出
eas submit --platform ios --latest

# Step 3: TestFlightアプリで更新を確認
# → App Store Connect で処理完了後、TestFlightに配信される（通常5〜30分）
```

#### 方法2: EAS Build → TestFlight（枠消費あり）

```bash
# Step 1: クラウドでビルド（EAS枠消費）
eas build --profile production --platform ios

# Step 2: TestFlightに配信（自動でlatest選択）
eas submit --platform ios

# または特定のビルドIDを指定
eas submit --platform ios --id <BUILD_ID>
```

#### eas submit が失敗する場合

```bash
# ascAppId が設定されていない場合
# eas.json に追加:
{
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "6758319830"
      }
    }
  }
}

# Apple ID認証エラーの場合
# → App Store Connect API Key を使用
eas credentials
```

---

### ローカル実機ビルド手順（成功した手順）

```bash
# 1. クリーンprebuild（必須）
rm -rf ios && npx expo prebuild --clean

# 2. .xcode.env.local パッチ（環境変数読み込み用）
cat >> ios/.xcode.env.local << 'PATCH'
# Load .env for Xcode direct builds
if [ -f "$PROJECT_DIR/../../.env" ]; then
  set -a
  source "$PROJECT_DIR/../../.env"
  set +a
fi
PATCH

# 3. 接続デバイス確認
xcrun xctrace list devices 2>&1 | grep iPhone
# 出力例: iPhone (26.2) (00008120-001C29E12684201E)

# 4. ビルド実行
npx expo run:ios --device <UDID>

# 5. インストールが止まった場合の手動インストール
xcrun devicectl device install app --device <UDID> \
  ~/Library/Developer/Xcode/DerivedData/COMMIT-*/Build/Products/Debug-iphoneos/COMMIT.app

# 6. アプリ起動
xcrun devicectl device process launch --device <UDID> com.kgxxx.commitapp

# 7. dev server起動（別ターミナル）
npx expo start
```

**重要:** PCとiPhoneが**同じWi-Fi**に接続されていること。

### EASビルド手順

```bash
# 1. EAS Secrets確認
eas secret:list

# 2. 必須シークレット（未設定なら追加）
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "<value>"
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<value>"
eas secret:create --name EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY --value "<value>"
eas secret:create --name EXPO_PUBLIC_GOOGLE_API_KEY --value "<value>"
eas secret:create --name EXPO_PUBLIC_SENTRY_DSN --value "<value>"
eas secret:create --name EXPO_PUBLIC_POSTHOG_API_KEY --value "<value>"
eas secret:create --name EXPO_PUBLIC_POSTHOG_HOST --value "<value>"

# 3. ビルド実行
eas build --profile production --platform ios

# 4. TestFlight配信
eas submit --platform ios
```

---

## 参考リンク

- [expo-splash-screen ドキュメント](https://docs.expo.dev/versions/latest/sdk/splash-screen/)
- [CLAUDE.md - expo-splash-screen hideAsync() Required](../CLAUDE.md)
- [CLAUDE.md - Troubleshooting セクション](../CLAUDE.md#troubleshooting-スプラッシュ画面フリーズ)
- コミット `682cf580`: preventAutoHideAsync追加
- コミット `d1e2e386`: 防御的supabase初期化
- コミット `e5b79b9a`: トラブルシューティングドキュメント追加

---

## よくあるエラーと解決策

| エラー | 原因 | 解決策 |
|--------|------|--------|
| `supabaseUrl is required` | 環境変数未設定 | EAS Secrets設定 or `.env` 確認 |
| `Cannot read property 'auth' of null` | supabase=nullで.auth呼び出し | 全てのsupabase呼び出しを`isSupabaseInitialized()`で保護 |
| `safeareacontextJSI-generated.cpp not found` | Codegenキャッシュ破損 | `rm -rf ios && npx expo prebuild --clean` |
| `No devices are booted` | シミュレータ未起動 | `xcrun simctl boot "iPhone 17 Pro"` |
| `Invalid device or device pair` | デバイス名不正 | `xcrun simctl list devices` で確認 |
| `The item is not a valid bundle` | ビルド不完全 | DerivedData削除後、再ビルド |
| 月間ビルド上限到達 | EAS無料プラン制限 | 月初リセット待ち or プランアップグレード |
| `Connecting to: iPhone` で止まる | devicectl接続問題 | 手動インストール `xcrun devicectl device install app` |

---

## 教訓と再発防止策

### 技術的教訓

1. **モジュールレベルの副作用に注意**
   - `createClient()`のような外部サービス初期化はモジュールレベルで実行しない
   - 関数内に移動し、条件付きで実行する

2. **環境変数の防御的処理**
   - 環境変数が空の場合のフォールバックを考慮
   - 空文字列で外部SDKを初期化しない

3. **エラーハンドリングの階層**
   - try-catchはimport時のエラーをキャッチできない
   - 関数内でエラーを発生させ、呼び出し側でハンドリング

4. **⚠️ nullableクライアントの全呼び出し箇所を保護 (Build #35教訓)**
   - `supabase` が `null` になる可能性がある場合、**全ての**呼び出し箇所で `isSupabaseInitialized()` チェックが必要
   - 特に `useEffect` 内の複数箇所に注意（`initializeAuth()` 内だけでは不十分）
   - **保護必須箇所（全9箇所）:**

     | 箇所 | 使用メソッド | 行番号 |
     |------|-------------|--------|
     | `checkUserStatus` 内 | `supabase.auth.getSession()`, `supabase.from()` | L302 |
     | `createUserRecordFromOnboardingData` 内 | `supabase.from().upsert()` | L403 |
     | `handleDeepLink` 内 | `supabase.auth.setSession()` | L566 |
     | `initializeAuth` 内 | `supabase.auth.getSession()` | L615 |
     | `onAuthStateChange` 呼び出し | `supabase.auth.onAuthStateChange()` | L672 |
     | `setupRealtimeSubscription` 内 | `supabase.auth.getSession()`, `supabase.channel()` | L774 |
     | `setupRealtimeSubscription` 呼び出し | (関数呼び出し) | L822 |
     | `refreshListener` 内 | `supabase.auth.getSession()` | L828 |
     | クリーンアップ関数 | `authSubscription?.unsubscribe()` | L862 |

   - クリーンアップ関数では `?.` オプショナルチェイニングを使用

### プロセス的教訓

1. **Xcodeログの早期確認**
   - 仮説を立てる前にまずログを確認
   - エラーメッセージが根本原因を示していることが多い

2. **EAS Secretsの事前確認**
   - ビルド前に `eas secret:list` で確認
   - 必須シークレットのチェックリストを維持

3. **ローカルとEASの環境差異**
   - ローカルは`.env`から読み込み
   - EASはSecrets or `eas.json`のenv設定から読み込み
   - 両環境で同じ変数が設定されていることを確認

---

## 更新履歴

| 日付 | 更新内容 |
|------|----------|
| 2026-01-28 | 初版作成、試行#1〜#2記録 |
| 2026-01-28 | 試行#2結果記録（❌効果なし）、次回アクション更新 |
| 2026-01-29 | ✅ **解決** - 試行#3で根本原因特定、コード修正実装、ローカルビルド成功 |
| 2026-01-29 | 詳細な解決策、ビルド手順、教訓を追加 |
| 2026-01-29 | Build #35: `Cannot read property 'auth' of null` 修正 - 全9箇所のsupabase呼び出しを保護 |
| 2026-01-29 | EAS Build vs EAS Local Build 比較、TestFlight配信手順を追加 |

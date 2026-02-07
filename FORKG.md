# FORKG: COMMIT App Development Chronicle

> **積読（tsundoku）を資産に変える** — 1ヶ月83ビルドの開発記録と血で書かれたルール

このドキュメントは、COMMIT アプリの開発を通じて得た知識と教訓を、次のエンジニアへ伝えるために書かれた。技術的な決定の「なぜ」と、血で書かれたルールの「なぜダメだったか」を記録する。

---

## 第1章: プロローグ — 積読が資産に変わる瞬間

### アプリの哲学

買った本が本棚で眠っている。誰もが経験するこの現象を、日本語では「積読（つんどく）」と呼ぶ。

COMMIT は、行動経済学の「損失回避」を武器にする。人は1万円を得る喜びより、1万円を失う痛みの方が2倍強く感じる（プロスペクト理論）。この心理を逆手に取り、**「読まなかったら課金される」** というペナルティシステムで読書を習慣化する。

```
┌─────────────────────────────────────────────────────────────┐
│  ユーザーの約束: 「1週間で50ページ読む。失敗したら¥1,000」    │
│                                                             │
│  [成功] → ¥0 (お金は動かない) + 達成感                      │
│  [失敗] → ¥1,000 が自動課金 → Room to Read へ寄付          │
│                                                             │
│  損失回避バイアスが働き、「読まないともったいない」と感じる   │
│  失敗しても子どもたちの教育に貢献できる「意味のある失敗」    │
└─────────────────────────────────────────────────────────────┘
```

**アナロジー**: COMMITは「読書習慣のパーソナルトレーナー」だ。ただし怒鳴る代わりに、静かにあなたの財布を取る。失敗のペナルティが第三世界の子どもの教育に変わるという仕掛けが、単なる罰金アプリとは違う「意味のある失敗」を生み出している。

### 開発タイムライン

- **開発期間**: 2026年1月6日 〜 2026年2月4日（約1ヶ月）
- **総ビルド数**: 83回
- **コードベース**: TypeScript + React Native (Expo SDK 54)
- **バックエンド**: Supabase (PostgreSQL + Edge Functions + Auth)
- **最終結果**: App Store 審査提出完了 (Build #83)

1ヶ月で83ビルド。平均すると1日2.7回のビルドを回したことになる。その多くは:

| ビルド範囲 | 内容 | 消費したビルド数 |
|-----------|------|-----------------|
| #42〜#61 | Google Sign-In との格闘 | 20回 |
| #62〜#65 | Apple IAP の検証 | 4回 |
| #75〜#78 | セキュリティ修正 | 4回 |
| #79〜#83 | iPad対応修正 & 提出 | 5回 |

---

## 第2章: アーキテクチャ全体像 — 宇宙船の設計図

### 三層構造

```
┌──────────────────────────────────────────────────────────────┐
│                     ユーザーのiPhone                          │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  React Native App (Expo SDK 54)                         │ │
│  │  - TypeScript                                           │ │
│  │  - React Navigation v7 (Stack + Bottom Tabs)            │ │
│  │  - react-native-reanimated v4 (アニメーション)           │ │
│  │  - expo-in-app-purchases (Apple IAP)                    │ │
│  │  - @react-native-google-signin (ネイティブ認証)          │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                      Supabase                                 │
│  ┌───────────────┐  ┌───────────────┐  ┌──────────────────┐ │
│  │  PostgreSQL   │  │ Edge Functions │  │ Realtime         │ │
│  │  + RLS        │  │ (Deno Deploy)  │  │ Subscriptions    │ │
│  └───────────────┘  └───────────────┘  └──────────────────┘ │
│                                                               │
│  Edge Functions (7本):                                        │
│  - create-commitment (コミットメント作成)                      │
│  - process-expired-commitments (The Reaper - 自動ペナルティ)  │
│  - verify-iap-receipt (Apple IAP検証)                        │
│  - apple-iap-webhook (Apple Server Notifications)            │
│  - use-lifeline (緊急延長 - Lifelineシステム)                 │
│  - admin-actions (管理者操作 - 返金/手動完了)                  │
│  - send-push-notification (プッシュ通知)                      │
│  - isbn-lookup (ISBN検索プロキシ)                             │
│  - job-recommendations (職種別推薦)                           │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                 Web Portal (Next.js on Vercel)                │
│  URL: https://commit-app-web.vercel.app                       │
│  - Stripe決済（ペナルティ用カード登録）                        │
│  - 管理ダッシュボード（/admin/dashboard）                      │
│  - 法的ページ（利用規約、プライバシーポリシー、特商法）          │
└──────────────────────────────────────────────────────────────┘
```

### 二重決済システム — App Store Guidelinesとの闘い

このアプリには**2つの決済システム**が共存する。この設計は Apple の審査を通すために必須だった。

```
┌────────────────────────────────────────────────────────────────┐
│ サブスクリプション（月額/年額課金）                              │
│ ────────────────────────────────────────────────────────────── │
│ 実装: Apple IAP (In-App Purchase)                              │
│ パッケージ: expo-in-app-purchases                               │
│ 解約: App Store設定から (設定 > Apple ID > サブスクリプション)  │
│ 理由: App Store Guidelines 3.1.1                               │
│       「デジタルコンテンツへのアクセスはIAP必須」                │
├────────────────────────────────────────────────────────────────┤
│ ペナルティ（読書失敗時の寄付課金）                              │
│ ────────────────────────────────────────────────────────────── │
│ 実装: Stripe via Web Portal                                    │
│ 理由: 物理的な行為（読書）に紐づく課金はIAP対象外               │
│       App Store Guidelines 3.1.3(e) Physical Goods Exception   │
│ 用途: カード登録、ペナルティ自動課金、カード管理                 │
└────────────────────────────────────────────────────────────────┘
```

**教訓**: App Store Guidelinesは弁護士のように読め。「デジタルコンテンツ」と「物理的行為へのインセンティブ」の境界線は曖昧だが、審査チームに説明できる論理的根拠を用意しておくこと。審査メモに「Stripe課金はペナルティ（寄付）専用でありサブスク機能はIAPで実装している」と明記した。

---

## 第3章: 認証の迷宮 — 20ビルドのGoogle Sign-In戦記

### OAuth PKCE → ネイティブ認証への大転換

最初、Google Sign-Inは Web OAuth (PKCE Flow) で実装した。ブラウザが開き、Googleでログインし、アプリに戻る流れだ。

**問題発生**: `flow_state_not_found` エラー。

PKCEフローでは、認証開始時に生成した `state` パラメータを、コールバック時に検証する。しかし React Native のブラウザ遷移でこの状態が消失することがあった。

```typescript
// BAD: Web OAuth - state management issues in React Native
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: 'commitapp://',
    skipBrowserRedirect: false,
  },
});
// Error: flow_state_not_found (intermittent, 30% of attempts)
```

**解決策**: ネイティブ Google SDK + Supabase `signInWithIdToken`

```typescript
// GOOD: Native SDK - no browser, no state management issues
import { GoogleSignin, statusCodes, isErrorWithCode } from '@react-native-google-signin/google-signin';

// 初期化 (App起動時に一度だけ)
GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,   // Supabase IDトークン検証用
  iosClientId: GOOGLE_IOS_CLIENT_ID,   // iOS認証用
  offlineAccess: true,
});

// 認証実行
const signInResult = await GoogleSignin.signIn();
const idToken = signInResult.data?.idToken;
if (!idToken) throw new Error('idToken not received');

// Supabaseセッション確立
const { data, error } = await supabase.auth.signInWithIdToken({
  provider: 'google',
  token: idToken,
});

// ユーザーキャンセルのハンドリング
if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) {
  return; // 何もしない
}
```

### iOS Client ID タイポ事件 — Build #42〜#61

ネイティブSDKに移行後も、`invalid_client` エラーが続いた。

20回のビルドを費やした後、原因が判明。

```
❌ EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=268...lon.apps.googleusercontent.com (誤り)
✅ EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=268...ion.apps.googleusercontent.com (正解)
```

**1文字**。`lon` と `ion`。

EAS Secrets に登録した `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` の値に、コピペ時のタイポがあった。

**ビルド履歴**:
| Build | 状態 | 試行内容 |
|-------|------|----------|
| #42-56 | ❌ | OAuth設定、リダイレクト、スコープ等を何度も変更 |
| #57-60 | ❌ | 環境変数修正済み「のはず」だがエラー継続 |
| #61 | ✅ | 文字単位で比較してタイポ発見 → 即解決 |

**教訓**:
1. 環境変数は**必ず**検証スクリプトで確認する
2. OAuth関連のIDは、登録後に実際にAPIを叩いて動作確認する
3. 「設定は正しいはず」という思い込みが最大の敵
4. **文字数が同じでも、1文字違うだけで完全に動かない**

```bash
# 今後は必ずこれを実行
echo $EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID | wc -c  # 文字数確認
echo $EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID | grep "ion.apps"  # 正しいパターン確認
```

### Deep Link Handler の並列実行レース

OAuth認証後、アプリに戻る際に Deep Link が発火する。問題は、`handleDeepLink` と `onAuthStateChange` が**並列で実行される**こと。

```typescript
// BAD: Race condition - user record may not exist yet
async function handleDeepLink(url) {
  await exchangeCodeForSession(code);
  await createUserRecord(session); // May not complete before auth state updates!
}

// onAuthStateChange fires simultaneously
// → App enters authenticated state before user record exists
// → Dashboard crashes trying to fetch non-existent user
```

**解決策**: ユーザーレコード作成は `onAuthStateChange` 内で行う。

```typescript
// GOOD: Sequential in auth listener (blocking)
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN') {
    // This BLOCKS until complete
    await createUserRecordFromOnboardingData(session);
    const isSubscribed = await checkSubscriptionStatus(session.user.id);
    setAuthState({ status: 'authenticated', session, isSubscribed });
  }
});
```

### URL Polyfill の位置問題

React NativeにはネイティブのURLクラスがない。`react-native-url-polyfill`を入れても、**インポート位置を間違えると動かない**:

```javascript
// index.js - アプリのエントリーポイント
// これが最初のインポートでなければならない！
import 'react-native-url-polyfill/auto';

import { registerRootComponent } from 'expo';
import App from './App';
```

AppNavigator.tsxでインポートしても手遅れ。Deep Linkハンドラが`new URL()`を呼ぶ前にポリフィルが読み込まれていないから。

---

## 第4章: Edge Functions — 「The Reaper」とその仲間たち

### なぜ直接INSERTではなくEdge Functionなのか

最初、コミットメント作成は単純な `supabase.from('commitments').insert()` だった。

**問題**:
1. RLS (Row Level Security) がユーザー認証状態に依存
2. オンボーディング中、認証状態が不安定な瞬間がある
3. クライアントサイドバリデーションは改ざん可能
4. 複合操作（book upsert + commitment insert）のトランザクション保証がない

**解決策**: Edge Function で `service_role` キーを使い、サーバーサイドで検証。

```typescript
// create-commitment Edge Function
// - 金額の範囲チェック (JPY: 50-50000, USD: 1-350)
// - 期限の妥当性チェック (24時間以上先)
// - ページ数の検証 (本の総ページ数を超えない)
// - RLSをバイパスして確実にINSERT
// - book upsert + commitment insert をアトミックに実行

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Phase 1: Book upsert
const { data: book } = await supabaseAdmin
  .from('books')
  .upsert({ google_books_id, title, author, cover_url, total_pages })
  .select()
  .single();

// Phase 2: Commitment insert
await supabaseAdmin.from('commitments').insert({
  user_id: user.id,
  book_id: book.id,
  target_pages,
  deadline,
  pledge_amount,
  currency,
});
```

### WORKER_ERROR Cold Start対策

Supabase Edge Functions は Deno Deploy で動作する。Cold Start（コンテナが眠っている状態からの起動）時に、`WORKER_ERROR` が返ることがある。

```json
{"code": 500, "message": "WORKER_ERROR"}
```

これはインフラの問題であり、関数コードのバグではない。

**解決策**: クライアント側でリトライロジックを実装。

```typescript
// src/lib/supabaseHelpers.ts
export async function invokeFunctionWithRetry<T>(
  functionName: string,
  body: object,
  maxRetries = 3
): Promise<{ data: T | null; error: Error | null }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const { data, error } = await supabase.functions.invoke<T>(functionName, { body });

    if (!error) return { data, error: null };

    // WORKER_ERROR の場合のみリトライ
    if (isWorkerError(error) && attempt < maxRetries) {
      if (__DEV__) console.log(`[${functionName}] Retry ${attempt}/${maxRetries}`);
      await new Promise(r => setTimeout(r, 1000 * attempt)); // Exponential backoff
      continue;
    }

    return { data: null, error };
  }
  return { data: null, error: new Error('Max retries exceeded') };
}
```

**アナロジー**: Edge Functionは「寒い地下室の自動販売機」だ。電源を入れっぱなしにするとコストがかかるので、使われていないときは省エネモードに入る。最初のお客さんは、マシンが起動するまで待つ必要がある。

### The Reaper — 自動ペナルティ徴収

`process-expired-commitments` は、期限切れコミットメントを検出し、自動でStripe課金を行う「死神」。

```
pg_cron (毎時実行)
    │
    ▼
process-expired-commitments Edge Function
    │
    ├─ 1. SELECT * FROM commitments WHERE status='pending' AND deadline < NOW()
    │
    ├─ 2. UPDATE status = 'defaulted', defaulted_at = NOW()
    │      (楽観的ロック: status='pending' AND is_freeze_used=false)
    │
    ├─ 3. INSERT INTO penalty_charges (冪等性チェック: UNIQUE constraint)
    │
    ├─ 4. stripe.paymentIntents.create({
    │        idempotencyKey: `penalty_${chargeId}`  ← CRITICAL: 二重課金防止
    │      })
    │
    ├─ 5. UPDATE penalty_charges SET charge_status = 'succeeded' | 'failed'
    │
    └─ 6. send-push-notification to user
```

**血で書かれたルール**: Stripe の `idempotencyKey` は**必須**。ネットワークタイムアウトで関数が再実行された場合、同じ `chargeId` に対して二重課金が発生する。

```typescript
// GOOD: Idempotency key prevents double charges
const paymentIntent = await stripe.paymentIntents.create(
  {
    amount: toStripeAmount(pledgeAmount, currency), // 通貨単位変換も忘れずに
    currency: currency.toLowerCase(),
    customer: customerId,
    payment_method: paymentMethodId,
    off_session: true,
    confirm: true,
    metadata: {
      commitment_id: commitmentId,
      penalty_charge_id: chargeId,
      type: 'penalty_charge',
    },
  },
  {
    idempotencyKey: `penalty_${chargeId}`, // CRITICAL!
  }
);
```

### Stripe Zero-Decimal Currency 問題

Stripe は「最小通貨単位」で金額を扱う。USD は「セント」、JPY は「円」。

```typescript
// BAD: $20 を送ったつもりが $0.20 になる (99%の損失!)
amount: pledgeAmount, // pledgeAmount = 20 → $0.20

// GOOD: 通貨に応じて変換
const ZERO_DECIMAL_CURRENCIES = ['JPY', 'KRW', 'VND', /* etc */];

function toStripeAmount(amount: number, currency: string): number {
  if (ZERO_DECIMAL_CURRENCIES.includes(currency.toUpperCase())) {
    return Math.round(amount); // ¥1000 → 1000
  }
  return Math.round(amount * 100); // $20 → 2000 cents
}
```

---

## 第5章: オンボーディング劇場 — 15画面のシネマティック体験

### 三幕構成の設計思想

映画のように、オンボーディングを3幕で構成した。

```
┌─────────────────────────────────────────────────────────────────┐
│ Act 1: The Awakening (画面0-6)                                  │
│ - 積読の重さを視覚化（「何冊積んでる？」ホイールピッカー）        │
│ - 職種選択（推薦システム用）                                     │
│ - 最後に本を読んだのはいつ？                                     │
│ - 本の選択（Google Books検索 or 手動入力）                       │
│ - 期限設定                                                       │
│ - ペナルティ金額設定（ハプティックフィードバック付きスライダー）  │
│ - アカウント作成（Google/Apple/Email）                          │
├─────────────────────────────────────────────────────────────────┤
│ Act 2: The Crisis (画面7-11)                                    │
│ - 機会費用の可視化（「この本を読まないことで失う時間」）         │
│ - 統計データ（「積読を解消した人の92%は〜」）                    │
│ - システム説明（How It Works）                                  │
│ - 社会的証明（メディア掲載）                                    │
│ - ユーザーの声（テスティモニアル）                              │
├─────────────────────────────────────────────────────────────────┤
│ Act 3: The Covenant (画面12-14)                                 │
│ - カスタムプラン確認                                            │
│ - Paywall（Apple IAP）                                          │
│ - Warp Transition → ダッシュボードへ                            │
└─────────────────────────────────────────────────────────────────┘
```

### Reanimated v4 の落とし穴

#### withRepeat(-1) のクリーンアップ必須

無限ループアニメーションは、コンポーネントのアンマウント時に `cancelAnimation()` を呼ばないと、メモリリークとナビゲーションエラーを引き起こす。

```typescript
// BAD: Animation persists after unmount
useEffect(() => {
  x.value = withRepeat(withSequence(...), -1, true);
  y.value = withRepeat(withSequence(...), -1, true);
}, []);
// Component unmounts → animations keep running
// → "GO_BACK not handled" error
// → App becomes unresponsive

// GOOD: Cleanup cancels animations
useEffect(() => {
  x.value = withRepeat(withSequence(...), -1, true);
  y.value = withRepeat(withSequence(...), -1, true);

  return () => {
    cancelAnimation(x);
    cancelAnimation(y);
  };
}, []);
```

**影響を受けたファイル**:
- `LivingBackground.tsx` (AnimatedOrb x, y)
- `PulsatingVignette.tsx` (pulseValue)
- `WarpSpeedTransition.tsx` (6つのSharedValue)

#### withDelay の信頼性問題

複雑なアニメーションシーケンスで `withDelay` が発火しないことがある。

```typescript
// UNRELIABLE:
opacity.value = withDelay(1000, withTiming(1, { duration: 800 }));

// RELIABLE:
setTimeout(() => {
  opacity.value = withTiming(1, { duration: 800 });
}, 1000);
```

#### .value をレンダー中に読むな

```typescript
// BAD: "[Reanimated] Reading from 'value' during component render" 警告
const colors = [color.value, 'transparent']; // JSX render内

// GOOD: useDerivedValueでラップ
const colors = useDerivedValue(() => [color.value, 'transparent']);
```

### スプラッシュ画面永久フリーズ事件

TestFlight ビルドで、スプラッシュ画面から先に進まない不具合が発生。

**原因の連鎖**:
```
環境変数未設定 (EAS Secrets漏れ)
    ↓
env.ts で空文字列フォールバック
    ↓
supabase.ts で createClient('', '') 実行
    ↓
"supabaseUrl is required" エラー（未ハンドル）
    ↓
JSランタイムフリーズ
    ↓
SplashScreen.hideAsync() 未実行
    ↓
永久フリーズ
```

**解決策**: 多層防御

```typescript
// 1. supabase.ts: 防御的初期化
function createSafeClient(): SupabaseClient<Database> | null {
  if (ENV_INIT_ERROR || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('[Supabase] Cannot initialize: missing credentials');
    return null;
  }
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {...});
}

export const isSupabaseInitialized = (): boolean => supabaseClient !== null;

// 2. AppNavigator: 初期化チェック
if (!isSupabaseInitialized()) {
  setAuthState({ status: 'unauthenticated' });
  return;
}

// 3. セーフティタイマー（8秒）
useEffect(() => {
  const safetyTimer = setTimeout(() => {
    SplashScreen.hideAsync();
    if (authStateRef.current.status === 'loading') {
      setAuthState({ status: 'unauthenticated' });
    }
  }, 8000);
  return () => clearTimeout(safetyTimer);
}, []);
```

**教訓**: 「絶対に起こらない」と思うことこそ、防御コードを書け。

---

## 第6章: Titan Design System — ダークラグジュアリーの美学

### カラーパレット

「センチュリオンブラック」— AMEXのブラックカード、メルセデスのMBUXインターフェースをインスピレーションに。

```typescript
// src/theme/titan.ts
export const titanColors = {
  background: {
    primary: '#0D0B09',   // 暖かみのあるオブシディアン
    secondary: '#141210', // 暖かみのあるダーク
    card: '#1A1714',      // カード背景
    glass: 'rgba(255, 255, 255, 0.03)',
  },
  accent: {
    primary: '#FF6B35',   // メインオレンジ（情熱、行動、Room to Readカラー）
    secondary: '#FF8F5C', // 明るいオレンジ
    success: '#34C759',   // グリーン（達成）
  },
  text: {
    primary: '#FAFAFA',
    secondary: '#9A9590', // 暖色系グレー
    muted: '#5C5550',
  },
  signal: {
    danger: '#FF6B6B',
    warning: '#FF9500',
  },
};
```

### Glassmorphism実装パターン

```typescript
// Glassmorphism card
const styles = StyleSheet.create({
  glassmorphismCard: {
    backgroundColor: 'rgba(26, 23, 20, 0.8)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    // Shadow for depth
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },

  // Piano Black button with orange glow
  pianoBlackButton: {
    backgroundColor: '#1A1714',
    borderRadius: 32,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
});
```

### i18n 3言語レイアウト問題

日本語、英語、韓国語で文字数が大きく異なる。

```
日本語: 「読み終えた」    (5文字)
英語:   "Completed"      (9文字)
韓国語: "완료됨"         (3文字)
```

**教訓**: 英語（最長）でレイアウトをテストせよ。

```typescript
// BAD: 日本語で完璧に見えても英語で崩れる
<Text numberOfLines={2} adjustsFontSizeToFit>
  {i18n.t('title')}
</Text>

// GOOD: 動的に行数を計算
<Text
  numberOfLines={title.split('\n').length}
  adjustsFontSizeToFit
>
  {title}
</Text>
```

### 3層テキスト可視性パターン

本の表紙の上にテキストを置くと、画像の明るさによって見えなくなる。解決策は3層の防御:

```typescript
// Layer 1: 画像を暗くするオーバーレイ
coverImageOverlay: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: 'rgba(8, 6, 4, 0.45)', // 45%の暗さ
}

// Layer 2: テキストの背後にグラデーション
<LinearGradient
  colors={[
    'transparent',
    'rgba(0, 0, 0, 0.4)',
    'rgba(0, 0, 0, 0.6)',
    'rgba(0, 0, 0, 0.4)',
    'transparent',
  ]}
  locations={[0, 0.2, 0.5, 0.8, 1]}
/>

// Layer 3: テキストに黒い影
title: {
  fontWeight: '600',        // Bold, not ultra-thin
  color: '#FFFFFF',
  textShadowColor: 'rgba(0, 0, 0, 1)', // Solid black shadow
  textShadowOffset: { width: 0, height: 2 },
  textShadowRadius: 12,
}
```

---

## 第7章: Apple IAP 実装 — ストアの門番を越えて

### expo-in-app-purchases の選択

`react-native-iap` と `expo-in-app-purchases` の2択。Expo Managed Workflow との親和性から後者を選択。

```typescript
// src/lib/IAPService.ts
import * as InAppPurchases from 'expo-in-app-purchases';

export const IAP_PRODUCT_IDS = {
  YEARLY: 'com.kgxxx.commitapp.premium.yearly',
  MONTHLY: 'com.kgxxx.commitapp.premium.monthly',
};

export async function initializeIAP(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  await InAppPurchases.connectAsync();
  return true;
}

export async function getProducts(): Promise<IAPProduct[]> {
  const { results, responseCode } = await InAppPurchases.getProductsAsync([
    IAP_PRODUCT_IDS.YEARLY,
    IAP_PRODUCT_IDS.MONTHLY,
  ]);
  // Network issue対策: リトライロジックを含む
  // ...
}
```

### APPLE_APP_SHARED_SECRET 事件

**症状**: IAP購入後、`subscription_status` が更新されず、ダッシュボードに遷移しない。

**原因**: `verify-iap-receipt` Edge Function が Apple のサーバーでレシート検証する際、`APPLE_APP_SHARED_SECRET` が必要だった。Supabase Secrets への登録が漏れていた。

```typescript
// verify-iap-receipt Edge Function
const verifyResponse = await fetch(
  isProduction
    ? 'https://buy.itunes.apple.com/verifyReceipt'
    : 'https://sandbox.itunes.apple.com/verifyReceipt',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      'receipt-data': receiptData,
      'password': APPLE_APP_SHARED_SECRET, // CRITICAL: これがないと常にstatus 21004
      'exclude-old-transactions': true,
    }),
  }
);
```

**解決**:
```bash
supabase secrets set APPLE_APP_SHARED_SECRET=your_shared_secret_here
supabase functions deploy verify-iap-receipt --no-verify-jwt
```

### Sandbox テストの罠

#### 価格表示の不一致
Sandbox環境では、Appleが**USD表記**で価格を返すことがある。

```
期待: ¥3,000
実際: $19.99 (Sandbox)
本番: ¥3,000 (Production)
```

パニックにならないこと。本番環境では現地通貨で表示される。

#### 再購入タイムアウトは正常
既にサブスク済みのユーザーが同じ商品を再購入しようとすると:
1. Appleが「既に購入済み」として処理
2. 新しいトランザクションが発生しない
3. `purchaseListener` が発火しない
4. ポーリングがタイムアウト → エラーダイアログ表示

**これはバグではなく正常な動作**。アプリを再起動すれば `subscription_status=active` を検出してダッシュボードに遷移する。

### Apple Server Notifications (Webhook)

購読状態の変更（更新、キャンセル、期限切れ）を検出するため、Webhook を実装。

```typescript
// apple-iap-webhook Edge Function

// CRITICAL-1: JWS署名検証
function verifyJWS(signedPayload: string): boolean {
  // x5c 証明書チェーンを使って署名を検証
  // Apple Root CA → Intermediate → Leaf の順で検証
}

// CRITICAL-2: 冪等性チェック
const { data: existing } = await supabaseAdmin
  .from('apple_notifications_processed')
  .select('notification_uuid')
  .eq('notification_uuid', notificationUUID)
  .maybeSingle();

if (existing) {
  return new Response('Already processed', { status: 200 });
}
```

---

## 第8章: セキュリティ監査 — 本番前夜の総点検

### CRITICAL修正一覧

App Store 提出前に発見・修正した重大な脆弱性。

| ID | 問題 | 修正内容 | コミット |
|----|------|----------|----------|
| CRITICAL-1 | apple-iap-webhook JWS署名検証なし | x5c証明書チェーンで署名検証実装 | `aebddbe8` |
| CRITICAL-2 | Webhook冪等性なし | `apple_notifications_processed` テーブル + notificationUUID重複チェック | `aebddbe8` |
| CRITICAL-3 | Stripeの idempotencyKey なし | `penalty_${chargeId}` を追加 | S.4 |
| CRITICAL-4 | Edge Function の JSON parse 未ハンドル | try-catch 追加、400 INVALID_REQUEST 返却 | AUDIT.1 |
| CRITICAL-5 | 環境変数の空文字列チェックなし | null/empty 検証、500 CONFIGURATION_ERROR 返却 | AUDIT.2 |
| CRITICAL-6 | subscription_status二重更新 | handleWarpComplete は onboarding_completed のみ更新 | `aebddbe8` |

### タイミング攻撃対策

認証トークンの比較には、タイミング攻撃を防ぐ `timingSafeEqual` を使用。

```typescript
// process-expired-commitments Edge Function
function timingSafeEqual(a: string, b: string): boolean {
  // SECURITY: Reject empty tokens immediately
  if (!a || !b) return false;

  // XOR lengths first - if different, result will be non-zero
  let result = a.length ^ b.length;
  const minLength = Math.min(a.length, b.length);
  for (let i = 0; i < minLength; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
```

通常の `===` 比較は、最初の違う文字で処理が終わる。つまり「最初の文字が間違っている」場合と「最後の文字だけ間違っている」場合で処理時間が違う。これを計測すれば、少しずつ正解に近づける（タイミング攻撃）。

### PII漏洩防止

Sentry にログを送る際、メールアドレスは送らない。

```typescript
// BAD: PII violation (GDPR/個人情報保護法リスク)
captureError(error, { extra: { email: user.email } });
addBreadcrumb('Admin action', 'admin', { email: user.email });

// GOOD: Privacy compliant
captureError(error, { userId: user.id });
addBreadcrumb('Admin action', 'admin', { userId: user.id });
```

### 3層管理者認証

管理者機能は「メールがホワイトリストにある」だけでは不十分。メールは偽装できる:

```typescript
// Layer 1: 有効なJWT（Supabaseが検証）
const { data: { user } } = await supabase.auth.getUser();

// Layer 2: メールホワイトリスト
if (!ADMIN_EMAILS.includes(user.email.toLowerCase())) {
  return errorResponse(403, 'FORBIDDEN');
}

// Layer 3: データベースのロール確認（CRITICAL!）
const { data: userRecord } = await supabaseAdmin
  .from('users')
  .select('role')
  .eq('id', user.id)
  .single();

if (userRecord?.role !== 'Founder') {
  return errorResponse(403, 'FORBIDDEN');
}
```

---

## 第9章: 開発ツールとワークフロー

### CLAUDE.md — 2000行の知恵

このプロジェクトには、`CLAUDE.md` という2000行超のドキュメントがある。Claude Code（AI開発アシスタント）が参照するルール集だ。

開発中に遭遇したすべての落とし穴が、ここに記録されている。

```markdown
# CLAUDE.md から抜粋

- **Reanimated withRepeat(-1) Cleanup (CRITICAL):**
  `cancelAnimation()` なしで無限ループを使うと、
  コンポーネントアンマウント後もアニメーションが残り、
  "GO_BACK not handled" エラーを引き起こす。

- **Google Books API Japan Block (CRITICAL):**
  日本IPからのフリーテキスト検索はブロックされる。
  `intitle:` プレフィックスを付けること。

- **Context Hook Safe Defaults (CRITICAL):**
  useXxx() が Provider 外で呼ばれた場合、
  例外をスローせず安全なデフォルト値を返すこと。
```

### EAS Build vs Local Build

EAS (Expo Application Services) のリモートビルドは便利だが、月間クォータがある（無料プランは限定的）。

```bash
# リモートビルド（通常時）
eas build --profile production --platform ios

# ローカルビルド（クォータ超過時）
./build-eas-local.sh  # 環境変数を読み込むラッパースクリプト

# NEVER do this directly (env vars will be missing!)
# eas build --local --profile production --platform ios
```

**教訓**: ローカルビルドでは EAS Secrets が利用できない。`.env` ファイルを明示的にエクスポートするスクリプトを用意せよ。

```bash
# build-eas-local.sh の内容
#!/bin/bash
set -a
source .env
set +a

# 必須変数の検証
REQUIRED_VARS=(
  EXPO_PUBLIC_SUPABASE_URL
  EXPO_PUBLIC_SUPABASE_ANON_KEY
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
  # ... 9個の必須変数
)

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing: $var"
    exit 1
  fi
  echo "✅ $var is set"
done

eas build --local --profile production --platform ios
```

### CI/CD パイプライン

GitHub Actions で自動化している処理:

```yaml
# .github/workflows/ci-cd.yml
jobs:
  quality-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx tsc --noEmit  # TypeScript型チェック

  deploy-edge-functions:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: |
          for func in admin-actions create-commitment delete-account \
                      isbn-lookup process-expired-commitments \
                      send-push-notification use-lifeline; do
            supabase functions deploy $func --no-verify-jwt
          done
```

---

## 第10章: 得られた教訓 — 次のエンジニアへ

### 血で書かれたルール TOP 10

| 順位 | 落とし穴 | 解決策 | ビルド消費 |
|------|----------|--------|-----------|
| 1 | iOS Client IDタイポ (`lon`→`ion`) | 文字単位で検証 | 20回 |
| 2 | Reanimated `withRepeat(-1)` リーク | `cancelAnimation()` cleanup | 3回 |
| 3 | スプラッシュ画面永久フリーズ | セーフティタイマー + 初期化チェック | 4回 |
| 4 | Google Books API 日本ブロック | `intitle:` プレフィックス | 2回 |
| 5 | WORKER_ERROR Cold Start | `invokeFunctionWithRetry` パターン | - |
| 6 | Stripe 二重課金リスク | `idempotencyKey` 必須 | - |
| 7 | Context Hook Provider外呼び出し | 例外を投げず安全なデフォルト値 | 1回 |
| 8 | Apple IAP レシート検証失敗 | `APPLE_APP_SHARED_SECRET` 設定 | 3回 |
| 9 | OAuth state 消失 | ネイティブ SDK + `signInWithIdToken` | 10回 |
| 10 | `useFocusEffect` vs `useEffect` | データ取得には `useFocusEffect` | - |

### React Native/Expo ベストプラクティス

```typescript
// 1. データ取得には useFocusEffect を使う
// (useEffect は画面マウント時のみ、Stack Pop では発火しない)
useFocusEffect(
  React.useCallback(() => {
    fetchData();
  }, [])
);

// 2. 非同期操作には isMounted ガードを付ける
useEffect(() => {
  let isMounted = true;
  fetchData().then(data => {
    if (isMounted) setData(data);
  });
  return () => { isMounted = false; };
}, []);

// 3. withTimeout でユーザーを解放する
const result = await withTimeout(
  slowOperation(),
  8000, // 8秒タイムアウト
  fallbackValue,
  'operationName'
);
```

### Supabase Edge Functions ベストプラクティス

```typescript
// 1. 環境変数を最初に検証
const supabaseUrl = Deno.env.get('SUPABASE_URL');
if (!supabaseUrl) {
  return new Response(
    JSON.stringify({ error: 'CONFIGURATION_ERROR' }),
    { status: 500 }
  );
}

// 2. JSON parse を try-catch でラップ
let body: RequestType;
try {
  body = await req.json();
} catch {
  return new Response(
    JSON.stringify({ error: 'INVALID_REQUEST' }),
    { status: 400 }
  );
}

// 3. --no-verify-jwt でデプロイ（Gateway が ES256 を拒否する場合）
// supabase functions deploy create-commitment --no-verify-jwt

// 4. Cold Start 対策はクライアント側で
// invokeFunctionWithRetry() パターンを使う
```

### App Store 審査対策

1. **Guideline 3.1.1 対策**: デジタルコンテンツへのアクセスは IAP を使う
2. **アカウント削除機能**: Apple 必須要件。Edge Function `delete-account` で実装
3. **プライバシーポリシー**: アプリ内で閲覧可能に（WebView or BottomSheet）
4. **審査用メモ**: ペナルティシステムの法的根拠を明記
5. **iPad対応**: サポートしないなら `supportsTablet: false` を明示

---

## エピローグ: 1ヶ月83ビルドの先に

2026年2月4日、Build #83 が App Store 審査に提出された。

1ヶ月前、このアプリはただのアイデアだった。「積読を解消するために、読まなかったら課金されるアプリを作りたい」。

その間に書いたコードは数万行。修正したバグは数百。83回のビルド。

でも、何より価値があるのは、このドキュメントに書いた「なぜダメだったか」の記録だ。

次にこのコードベースを触るエンジニアが、同じ落とし穴に落ちなくて済むように。

| マイルストーン | 日付 | ビルド |
|---------------|------|--------|
| 開発開始 | 2026-01-06 | - |
| Google Sign-In 成功 | 2026-01-28 | #61 |
| IAP 購入フロー完成 | 2026-01-29 | #65 |
| セキュリティ監査完了 | 2026-02-02 | #75 |
| App Store 審査提出 | 2026-02-04 | #83 |

> **"The best code is no code at all. The second best is code that comes with a good story."**

---

## 付録: ファイルリファレンス

| ファイル | 内容 |
|----------|------|
| `CLAUDE.md` | 開発ルール集（2000行） |
| `ROADMAP.md` | フェーズ別開発履歴 |
| `HANDOFF.md` | セッション引継ぎ記録 |
| `src/navigation/AppNavigator.tsx` | 認証・ナビゲーション中核 |
| `src/lib/IAPService.ts` | Apple IAP実装 |
| `src/lib/supabaseHelpers.ts` | Edge Functionリトライ |
| `src/theme/titan.ts` | Titan Design System |
| `src/contexts/UnreadContext.tsx` | Realtime購読の例 |
| `supabase/functions/create-commitment/` | コミットメント作成 |
| `supabase/functions/process-expired-commitments/` | The Reaper |
| `supabase/functions/verify-iap-receipt/` | IAP レシート検証 |
| `supabase/functions/apple-iap-webhook/` | Apple Server Notifications |
| `build-eas-local.sh` | ローカルビルドスクリプト |

---

*最終更新: 2026-02-04 — App Store 審査提出完了 (Build #83)*

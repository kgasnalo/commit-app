# FORKG.md - COMMIT: 積ん読を駆逐する技術の解剖

> *「本を読まなかったら、その代わりに財布が薄くなる」というシンプルな契約から生まれたアプリの物語*

---

## 1. COMMITの魂: なぜこのアプリが存在するのか

「積ん読」——日本語が世界に贈った、本棚で埃をかぶる未読本のための言葉。私たちの多くは買った本の半分も読まないまま、次の本を買ってしまう。意志力だけでは勝てない相手だ。

COMMITはこの問題に「お金」という最も原始的な動機付けで立ち向かう。仕組みはシンプル:

1. **本を選ぶ**: 次に読む本を決める
2. **期限を設定**: 「3週間で読む」と宣言
3. **お金を賭ける**: ¥1,000〜¥10,000を設定
4. **成功か寄付か**: 期限内に読めば何も起きない。読めなければ、設定金額が自動的にRoom to Read（子どもたちに教育を届けるNPO）に寄付される

**アナロジー**: COMMITは「読書習慣のパーソナルトレーナー」だ。ただし怒鳴る代わりに、静かにあなたの財布を取る。失敗のペナルティが第三世界の子どもの教育に変わるという仕掛けが、単なる罰金アプリとは違う「意味のある失敗」を生み出している。

---

## 2. アーキテクチャ俯瞰図: 3層ケーキの構造

### 技術スタック全体像

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMMIT アーキテクチャ                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              LAYER 1: React Native UI                   │    │
│  │  ・Expo SDK 54 (React Native 0.81)                      │    │
│  │  ・React Navigation v7 (Stack + Bottom Tabs)            │    │
│  │  ・react-native-reanimated v4 (アニメーション)           │    │
│  │  ・3言語対応 (ja/en/ko) via i18n                        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            ↓ ↑                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              LAYER 2: Supabase Backend                  │    │
│  │  ・PostgreSQL (データベース)                             │    │
│  │  ・Edge Functions (Deno Runtime)                        │    │
│  │  ・Realtime Subscriptions                               │    │
│  │  ・Row Level Security (RLS)                             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            ↓ ↑                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              LAYER 3: External Services                 │    │
│  │  ・Google OAuth / Apple Sign In (認証)                  │    │
│  │  ・Stripe (ペナルティ決済) ← Webポータル経由             │    │
│  │  ・Apple IAP / Google Play (サブスク) ← ネイティブ      │    │
│  │  ・Google Books API (書籍検索)                          │    │
│  │  ・Expo Push Notifications                              │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

**アナロジー**: 3層ケーキを想像してほしい。一番上のフロスティング（UI）は見た目と触り心地を担当。真ん中のスポンジ（Supabase）がケーキの構造を支える。そして皿（外部サービス）の上に全てが乗っている。

### デュアル決済システム: なぜStripeとIAPの両方が必要なのか

これは重要な設計判断だ。App Store Guidelines 3.1.1により、「デジタルコンテンツへのアクセス」にはApple IAPが必須。しかし、COMMITの「ペナルティ（寄付金）」は「物理的な行為（読書）に紐づく課金」として分類され、IAP対象外となる。

```
サブスクリプション  → Apple IAP / Google Play  → ネイティブ実装
ペナルティ課金     → Stripe                    → Webポータル経由
```

この区別を間違えると、App Store審査でリジェクトされるか、Appleに30%の手数料を余計に払うことになる。

---

## 3. ナビゲーションの迷宮: 3つの世界と状態遷移

### 条件付きスタックの構造

`AppNavigator.tsx`は900行を超える巨大なファイルだが、核心は「認証状態に応じて3つの異なるナビゲーションスタックを表示する」というシンプルな構造だ:

```typescript
// 世界1: 未認証 → オンボーディング全体 (0-13) + Auth
{!session ? (
  <>
    <Stack.Screen name="Onboarding0" ... />
    {/* 14画面のオンボーディング */}
    <Stack.Screen name="Auth" ... />
  </>

// 世界2: 認証済み + オンボーディング未完了 → 後半オンボーディング (7-13) + MainTabs
) : !hasCompletedOnboarding ? (
  <>
    <Stack.Screen name="Onboarding7" ... />
    {/* オンボーディング後半 */}
    <Stack.Screen name="MainTabs" ... />
  </>

// 世界3: 認証済み + オンボーディング完了 → メインアプリ
) : (
  <>
    <Stack.Screen name="MainTabs" ... />
  </>
)}
```

**アナロジー**: これは3つの舞台セットを持つ劇場だ。観客（ユーザー）の「チケットの種類」（認証状態）によって、どのセットが見えるかが決まる。問題は、場面転換の瞬間に役者がまだセリフを言っていたらどうなるか？ということだ。

### 教訓1: GO_BACK破滅

**問題**: iOSのスワイプバックジェスチャーで、スタックの最初の画面から戻ろうとすると「GO_BACK not handled」エラーが発生。

**解決**: 各スタックの最初の画面には `gestureEnabled: false` を設定:

```typescript
<Stack.Screen name="Onboarding0" ... options={{ gestureEnabled: false }} />
<Stack.Screen name="Onboarding7" ... options={{ gestureEnabled: false }} />
```

**原則**: スタックの境界には壁を建てろ。

### 教訓2: 状態テレポート問題

**問題**: OAuthリダイレクト後、ナビゲーションスタック全体が置き換わる。オンボーディングで入力した情報（ユーザー名、選んだ本）が消える。

**解決**: AsyncStorageで状態を永続化し、スタック切り替え後に復元:

```typescript
// OAuth前に保存
await AsyncStorage.setItem('onboardingData', JSON.stringify({
  selectedBook, deadline, pledgeAmount, username
}));

// スタック切り替え後に復元
const data = await AsyncStorage.getItem('onboardingData');
const { username } = JSON.parse(data);
```

**原則**: スタック切り替えは「転送」ではなく「テレポート」。手荷物は自分で持て。

### 教訓3: Realtimeレース

**問題**: SupabaseのRealtime subscriptionでDBが更新されると、即座にスタックが切り替わる。アニメーション完了前にコンポーネントがアンマウントされてしまう。

```typescript
// BAD: アニメーションが見えない（DB更新で即座にスタック切り替え）
await supabase.from('users').update({ subscription_status: 'active' });
setShowAnimation(true);  // ←コンポーネントはもうアンマウントされている！

// GOOD: アニメーション完了後にDB更新
setShowAnimation(true);
// ... アニメーションのonCompleteコールバック内で:
await supabase.from('users').update({ subscription_status: 'active' });
```

**原則**: 演出が終わるまで舞台裏を見せるな。

---

## 4. OAuth障害物コース: 認証の罠

Google/Apple OAuthの実装は、見た目以上に地雷が多い。

### 罠1: URLポリフィルの位置

React NativeにはネイティブのURLクラスがない。`react-native-url-polyfill`を入れても、**インポート位置を間違えると動かない**:

```javascript
// index.js - アプリのエントリーポイント
// これが最初のインポートでなければならない！
import 'react-native-url-polyfill/auto';

import { registerRootComponent } from 'expo';
import App from './App';
```

AppNavigator.tsxでインポートしても手遅れ。Deep Linkハンドラが`new URL()`を呼ぶ前にポリフィルが読み込まれていないから。

### 罠2: PKCEとImplicit Flow

Supabaseは最近PKCEフローをデフォルトにした。が、旧バージョンのクライアントはImplicit Flowを使う。両方をサポートする必要がある:

```typescript
const code = urlObj.searchParams.get('code');
if (code) {
  // PKCEフロー（新）
  await supabase.auth.exchangeCodeForSession(code);
} else {
  // Implicit Flow（旧）
  const access_token = hashParams.get('access_token');
  await supabase.auth.setSession({ access_token, refresh_token });
}
```

### 罠3: withTimeoutでユーザーを解放する

`onAuthStateChange`内でDB操作を行うと、ネットワーク遅延でユーザーが「SYSTEM INITIALIZING...」画面に閉じ込められる。すべての非同期操作にタイムアウトを設定:

```typescript
async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  fallback: T,
  operationName: string
): Promise<T> {
  const timeoutPromise = new Promise<T>((resolve) => {
    setTimeout(() => {
      console.warn(`⏱️ ${operationName}: Timed out`);
      resolve(fallback);
    }, timeoutMs);
  });
  return Promise.race([operation, timeoutPromise]);
}

// 使用例: 最大8秒でフォールバック
const userStatus = await withTimeout(
  checkUserStatus(userId),
  8000,
  { isSubscribed: false },
  'checkUserStatus'
);
```

**原則**: ユーザーを待たせるな。失敗させてでも先に進ませろ。

---

## 5. The Reaper: 自動ペナルティ執行システム

これがCOMMITの心臓部だ。期限を過ぎたコミットメントを検出し、自動的にStripe課金を実行する「死神」。

### 処理フロー

```
┌────────────────────────────────────────────────────────────┐
│                  THE REAPER (process-expired-commitments)  │
├────────────────────────────────────────────────────────────┤
│  1. pg_cron (毎時)                                          │
│     └─→ Edge Function呼び出し                              │
│                                                            │
│  2. 期限切れコミットメント検索                               │
│     WHERE status='pending' AND deadline < NOW()            │
│                                                            │
│  3. 各コミットメントを処理:                                  │
│     a. status='defaulted' に更新 (楽観的ロック)             │
│     b. penalty_chargesレコード作成 (冪等性チェック)          │
│     c. Stripe PaymentIntent作成 (off-session)              │
│     d. 結果に応じてDB更新                                   │
│     e. プッシュ通知送信                                     │
│                                                            │
│  4. 失敗時: 4時間後にリトライ (最大3回)                      │
└────────────────────────────────────────────────────────────┘
```

**アナロジー**: The Reaperは「自動料金所」だ。期限を過ぎた車（コミットメント）をスキャンし、ETCカード（Stripe PaymentMethod）に課金する。カードが使えなければ？4時間後にもう一度試す。それでもダメなら、ユーザーに「カードを更新してください」と通知する。

### 3フェーズトランザクションパターン

金融操作は「DBとStripeの両方を更新する」必要がある。途中で失敗したらどうなる？このパターンで一貫性を保つ:

```typescript
// Phase 1: DBを「処理中」にマーク
await supabase.from('penalty_charges').update({
  charge_status: 'processing',
});

// Phase 2: Stripe課金（冪等性キー付き）
try {
  const paymentIntent = await stripe.paymentIntents.create(
    { amount, currency, customer, payment_method },
    { idempotencyKey: `penalty_${chargeId}` }  // ← 重複課金を防ぐ
  );
} catch (error) {
  // Phase 2失敗 → Phase 1をロールバック
  await supabase.from('penalty_charges').update({
    charge_status: 'failed',
  });
  throw error;
}

// Phase 3: 成功をDBに記録
await supabase.from('penalty_charges').update({
  charge_status: 'succeeded',
  stripe_payment_intent_id: paymentIntent.id,
});
```

**原則**: 金融操作は「やるか、やらないか」。「半分やった」は許されない。

### セキュリティ: timing-safe比較

The Reaperは誰でも呼べてはいけない。SERVICE_ROLE_KEYまたはCRON_SECRETを持つシステムだけが呼べる:

```typescript
function timingSafeEqual(a: string, b: string): boolean {
  // 長さの違いをXORで処理（早期リターンでタイミング情報が漏れるのを防ぐ）
  let result = a.length ^ b.length;
  const minLength = Math.min(a.length, b.length);
  for (let i = 0; i < minLength; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
```

通常の `===` 比較は、最初の違う文字で処理が終わる。つまり「最初の文字が間違っている」場合と「最後の文字だけ間違っている」場合で処理時間が違う。これを計測すれば、少しずつ正解に近づける（タイミング攻撃）。

---

## 6. i18nの地雷原: 3言語対応の痛み

COMMITは日本語、英語、韓国語をサポートする。792個のi18nキーを3つのJSONファイルで同期し続けるのは、想像以上に大変だ。

### 地雷1: defaultValueアンチパターン

```typescript
// BAD: 日本語ロケールでも英語が表示される
i18n.t('celebration.title', { defaultValue: 'Commitment Achieved!' });

// GOOD: 正しく翻訳が使われる
i18n.t('celebration.title');
```

`defaultValue`は「キーが存在しない場合のフォールバック」であって「デフォルト翻訳」ではない。常にすべてのロケールファイルにキーを追加せよ。

### 地雷2: レイアウト崩れ

日本語「完了」、英語「Completed」、韓国語「완료」——文字数が全然違う。

**問題コード**:
```typescript
// 日本語では収まるが、英語ではオーバーフロー
<Text numberOfLines={1} style={{ width: 60 }}>
  {i18n.t('status.completed')}
</Text>
```

**解決策**:
- 固定幅を避け、Flexboxで伸縮させる
- `numberOfLines`と`adjustsFontSizeToFit`を組み合わせる
- **必ず英語でレイアウトをテストする**（日本語は最も短い傾向がある）

**アナロジー**: i18nは旅行の荷造りに似ている。日本の電源プラグで荷造りして、ドイツに着いてから「充電器が使えない！」と気づく。事前にすべての国（言語）でテストせよ。

### 地雷3: 翻訳キーの重複

JSONファイルでキーが重複すると、後の方が勝つ。気づかないまま古い翻訳が消える:

```json
{
  "button.save": "Save",
  // ... 500行後 ...
  "button.save": "Save Changes"  // ← これが使われる、上は無視
}
```

新しいキーを追加する前に `grep '"key_name":' src/i18n/locales/` で検索すること。

---

## 7. Reanimatedとの戦い: アニメーションの落とし穴

`react-native-reanimated` v4は強力だが、いくつかの「やってはいけない」がある。

### 罠1: レンダー中に.valueを読むな

```typescript
// BAD: "[Reanimated] Reading from 'value' during component render" 警告
const Component = () => {
  const x = useSharedValue(0);
  return <Text>{x.value}</Text>;  // ← レンダー中に.valueを読んでいる
};

// GOOD: useDerivedValueでラップ
const Component = () => {
  const x = useSharedValue(0);
  const displayValue = useDerivedValue(() => x.value);
  return <Animated.Text>{displayValue}</Animated.Text>;
};
```

### 罠2: withRepeat(-1)のクリーンアップ

無限ループアニメーションは、コンポーネントがアンマウントされても動き続ける。これがナビゲーションエラーの原因になる:

```typescript
// BAD: アニメーションが永遠に動き続ける
useEffect(() => {
  x.value = withRepeat(withSequence(...), -1, true);
}, []);

// GOOD: クリーンアップでキャンセル
useEffect(() => {
  x.value = withRepeat(withSequence(...), -1, true);
  return () => cancelAnimation(x);  // ← これが必須
}, []);
```

**アナロジー**: アニメーションは飼い犬だ。家を出るときにリードを外さないと、帰ってきたときに家中めちゃくちゃになっている。

### 罠3: withDelayの信頼性

複雑なシーケンスでは`withDelay`が発火しないことがある。重要なタイミングには`setTimeout`を使う:

```typescript
// UNRELIABLE:
opacity.value = withDelay(1000, withTiming(1));

// RELIABLE:
setTimeout(() => {
  opacity.value = withTiming(1);
}, 1000);
```

---

## 8. Edge Functions: サーバーレスの最前線

Supabase Edge Functions（Deno Deploy）は便利だが、「コールドスタート」という厄介な問題がある。

### コールドスタート問題

Edge Functionは使われていないと「眠っている」。最初のリクエストで「起きる」のに時間がかかる。時には`WORKER_ERROR`を返して失敗する。

**解決策**: クライアント側でリトライロジックを実装:

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

    if (error instanceof FunctionsHttpError) {
      const errorBody = await error.context.json();
      if (errorBody.message?.includes('WORKER_ERROR') && attempt < maxRetries) {
        // 指数バックオフ: 1秒, 2秒, 3秒...
        await new Promise(r => setTimeout(r, 1000 * attempt));
        continue;
      }
    }
    return { data: null, error };
  }
}
```

**アナロジー**: Edge Functionは「寒い地下室の自動販売機」だ。電源を入れっぱなしにするとコストがかかるので、使われていないときは省エネモードに入る。最初のお客さんは、マシンが起動するまで待つ必要がある。

### --no-verify-jwtフラグ

Supabase Gatewayは、Edge Functionに到達する前にJWTを検証する。しかし、一部のES256トークンはGatewayで拒否される（関数コードは正しいのに）。

```bash
# BAD: Gatewayで "Invalid JWT" エラー
supabase functions deploy create-commitment

# GOOD: Gateway検証をスキップ、関数内のauth.getUser()に任せる
supabase functions deploy create-commitment --no-verify-jwt
```

---

## 9. Titanデザインシステム: 高級感の設計

COMMITのビジュアルアイデンティティは「Titan」と呼ばれるデザインシステムに基づいている。キーワードは:

- **Real Luxury**: 安っぽいグラデーションではなく、素材感のある暗さ
- **Matte & Heavy**: 光沢より質感、軽さより重厚感
- **Centurion Black**: アメックスのセンチュリオンカードのような「選ばれた者」感

### カラーパレット

```typescript
titanColors = {
  background: {
    primary: '#0D0B09',    // 暖かみのあるオブシディアン
    card: '#1A1714',       // カード背景
  },
  accent: {
    primary: '#FF6B35',    // メインオレンジ（Room to Readのブランドカラー）
  },
  text: {
    primary: '#FAFAFA',    // ほぼ白
    secondary: '#9A9590',  // 暖色系グレー
  },
}
```

### 3層テキスト可視性パターン

本の表紙の上にテキストを置くと、画像の明るさによって見えなくなる。解決策は3層の防御:

```typescript
// Layer 1: 画像を暗くするオーバーレイ
coverImageOverlay: {
  backgroundColor: 'rgba(8, 6, 4, 0.45)', // 45%の暗さ
}

// Layer 2: テキストの背後にグラデーション
<LinearGradient
  colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.4)', 'transparent']}
/>

// Layer 3: テキストに黒い影
title: {
  fontWeight: '600',
  color: '#FFFFFF',
  textShadowColor: 'rgba(0, 0, 0, 1)',
  textShadowRadius: 12,
}
```

---

## 10. セキュリティの塹壕から

### 3層管理者認証

管理者機能は「メールがホワイトリストにある」だけでは不十分。メールは偽装できる:

```typescript
// Layer 1: 有効なJWT（Supabaseが検証）
const { data: { user } } = await supabase.auth.getUser();

// Layer 2: メールホワイトリスト
if (!ADMIN_EMAILS.includes(user.email.toLowerCase())) {
  return errorResponse(403, 'FORBIDDEN');
}

// Layer 3: データベースのロール確認（これが重要！）
const { data: userRecord } = await supabaseAdmin
  .from('users')
  .select('role')
  .eq('id', user.id)
  .single();

if (userRecord?.role !== 'Founder') {
  return errorResponse(403, 'FORBIDDEN');
}
```

### PII（個人情報）ポリシー

Sentryのログにメールアドレスを含めてはいけない:

```typescript
// BAD: GDPR違反の可能性
captureError(error, { extra: { email: user.email } });

// GOOD: IDのみ
captureError(error, { extra: { userId: user.id } });
```

---

## 11. デバッグ戦記: 実際に起きた問題と解決

### edge=curl事件

**症状**: 一部の書籍カバー画像が表示されない。

**原因**: Google Books APIが返す画像URLに`&edge=curl`パラメータが含まれていた（本の端がカールする効果）。このパラメータがあると、React Nativeで画像がレンダリングされないことがある。

**解決**: `url.replace(/&edge=curl/g, '')`

### TOKEN_REFRESHED無限ループ

**症状**: ユーザーが突然オンボーディング画面に戻される。

**原因**: `onAuthStateChange`で`TOKEN_REFRESHED`イベントが発火したとき、`checkUserStatus`が実行され、タイムアウトで`isSubscribed: false`が返されていた。

**解決**: `TOKEN_REFRESHED`では既存の状態を維持する:

```typescript
if (event === 'TOKEN_REFRESHED') {
  setAuthState(prev => ({ ...prev, session }));  // isSubscribedは変更しない
  return;
}
```

---

## 12. 結論: パターンより原則

100以上の教訓を凝縮すると、5つの原則に集約される:

### 1. 早く失敗、安全に失敗

タイムアウト、フォールバック、リトライ——ユーザーを待たせるな、失敗させてでも先に進ませろ。

### 2. 状態は王様

ナビゲーション、認証、Realtime——すべては「状態」の変化として理解できる。状態遷移を制御せよ。

### 3. セキュリティはレイヤー

1つの防御線が破られても、次がある。JWT + ホワイトリスト + DBロール。

### 4. i18nは後回しにしない

最初から3言語でテストしろ。レイアウトは英語（最長テキスト）で確認しろ。

### 5. サブスクリプションはクリーンアップする

Realtime、アニメーション、イベントリスナー——作ったら必ず片付けろ。

---

*この文書は、commit-appの開発過程で得られた知見をまとめたものです。同じ轍を踏まないために、そして「なぜこうなっているのか」を理解するために。*

*最終更新: 2026-01-26*

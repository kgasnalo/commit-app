# COMMIT アプリ 実装報告書

**作成日**: 2025-12-26
**ブランチ**: `claude/setup-commit-app-Bhuk2`
**実装フェーズ**: Phase 1～3

---

## 📋 エグゼクティブサマリー

COMMITアプリの基盤となる機能の実装が完了しました。React Native (Expo SDK 52) + Supabase + Stripe を用いた読書習慣形成アプリとして、認証・サブスクリプション・コミットメント作成機能を実装。特にPhase 3では、ユーザー行動インサイトに基づいた「検索優先UI」への改善とSupabase RLSポリシーの修正を行いました。

---

## 🎯 実装概要

### Phase 1: 環境構築と依存関係のセットアップ
**実装日**: 初期セットアップ

#### 実施内容
- プロジェクト依存関係のインストール（757パッケージ）
- TypeScript設定ファイル (`tsconfig.json`) の作成
- 環境変数テンプレート (`.env`) の作成
- 型定義パッケージのインストール (`@types/react`, `@types/react-native`)

#### 成果物
- ✅ `tsconfig.json` - TypeScript strict modeを有効化
- ✅ `.env` - 環境変数テンプレート（Supabase, Stripe, Google API用）
- ✅ 全依存関係のインストール完了
- ✅ TypeScriptコンパイルエラー0件

---

### Phase 2: コミットメント作成機能の実装
**実装日**: 中期開発

#### 実施内容

##### 1. CreateCommitmentScreen.tsx の新規作成（555行）
**主要機能**:
- Google Books API統合による書籍検索
- リアルタイム検索結果表示（最大10件）
- 読了期限設定（DateTimePicker使用）
- ペナルティ同意チェックボックス
- Supabaseへのデータ保存（書籍 + コミットメント）

**技術的ハイライト**:
```typescript
// Google Books API統合
const searchBooks = async () => {
  const response = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&key=${process.env.EXPO_PUBLIC_GOOGLE_API_KEY}&maxResults=10`
  );
  const data = await response.json();
  if (data.items && data.items.length > 0) {
    setSearchResults(data.items);
  }
};

// Supabaseへの書籍保存（既存チェック付き）
const { data: existingBook } = await supabase
  .from('books')
  .select('id')
  .eq('google_books_id', selectedBook.id)
  .single();

if (!existingBook) {
  const { data: newBook, error: bookError } = await supabase
    .from('books')
    .insert({
      google_books_id: selectedBook.id,
      title: selectedBook.volumeInfo.title,
      author: selectedBook.volumeInfo.authors?.join(', ') || '不明',
      cover_url: selectedBook.volumeInfo.imageLinks?.thumbnail || '',
    })
    .select('id')
    .single();
}

// コミットメント作成
const { error: commitmentError } = await supabase
  .from('commitments')
  .insert({
    user_id: user.id,
    book_id: bookId,
    deadline: deadline.toISOString(),
    status: 'pending',
    pledge_amount: 1000
  });
```

##### 2. RoleSelectScreenの更新
- ナビゲーションプロパティの追加
- `handleBookSelect` 関数実装（おすすめ書籍 → CreateCommitmentScreenへの遷移）
- `preselectedBook` パラメータ対応

##### 3. AppNavigatorの更新
- CreateCommitmentScreenのルート追加
- ナビゲーションスタックへの統合

##### 4. 追加パッケージのインストール
```bash
npm install @react-native-community/datetimepicker
```

#### 成果物
- ✅ `src/screens/CreateCommitmentScreen.tsx` (新規作成)
- ✅ `src/screens/RoleSelectScreen.tsx` (更新)
- ✅ `src/navigation/AppNavigator.tsx` (更新)
- ✅ 書籍検索からコミットメント作成までのフルフロー実装

---

### Phase 3: UI改善とRLS修正
**実装日**: 最終フェーズ

#### ユーザーインサイト
> 「ユーザーは『読みたい本がある』からこのアプリを使う。おすすめは補助的でいい。」

このインサイトに基づき、UIを「おすすめ優先」から「検索優先」へ大幅に変更。

#### 実施内容

##### 1. RoleSelectScreen の UI完全リファクタリング

**変更前**:
- おすすめセクションが常に表示
- 役職選択が縦並びリスト
- 検索機能が目立たない

**変更後**:
- **メインCTA**: 「読みたい本を検索」を最上部に配置（黒枠・大きいアイコン）
- **おすすめ**: 折りたたみ可能（デフォルト: 閉じている）
- **役職選択**: 2x2グリッドレイアウトに変更

**実装コード**:
```typescript
// メインCTA
<TouchableOpacity style={styles.searchCTA} onPress={handleSearchPress}>
  <View style={styles.searchCTAIcon}>
    <Ionicons name="search" size={32} color="#fff" />
  </View>
  <View style={styles.searchCTAContent}>
    <Text style={styles.searchCTATitle}>読みたい本を検索</Text>
    <Text style={styles.searchCTASubtitle}>書籍タイトルから探す</Text>
  </View>
  <MaterialIcons name="chevron-right" size={32} color="#000" />
</TouchableOpacity>

// 折りたたみ式おすすめセクション
<TouchableOpacity
  style={styles.recommendationToggle}
  onPress={() => setShowRecommendations(!showRecommendations)}
>
  <View style={styles.recommendationToggleLeft}>
    <Ionicons name="bulb-outline" size={24} color="#666" />
    <Text style={styles.recommendationToggleText}>おすすめから選ぶ（任意）</Text>
  </View>
  <MaterialIcons
    name={showRecommendations ? "expand-less" : "expand-more"}
    size={24}
    color="#666"
  />
</TouchableOpacity>

// 2x2グリッドの役職選択
<View style={styles.roleGrid}>
  {ROLES.map((role) => (
    <TouchableOpacity
      key={role}
      style={styles.roleButton}
      onPress={() => handleRoleSelect(role)}
    >
      <Text style={styles.roleButtonText}>{role}</Text>
    </TouchableOpacity>
  ))}
</View>
```

##### 2. 書籍画像フォールバックの実装

両スクリーンに `BookThumbnail` コンポーネントを追加し、画像が存在しない場合にアイコンを表示。

**CreateCommitmentScreen.tsx**:
```typescript
const BookThumbnail = ({ uri, large }: { uri?: string; large?: boolean }) => {
  if (!uri) {
    return (
      <View style={large ? styles.placeholderLarge : styles.placeholder}>
        <Ionicons name="book-outline" size={large ? 48 : 32} color="#ccc" />
      </View>
    );
  }
  return <Image source={{ uri }} style={large ? styles.selectedBookCover : styles.bookCover} />;
};
```

**RoleSelectScreen.tsx**:
```typescript
const BookThumbnail = ({ uri }: { uri?: string }) => {
  if (!uri) {
    return (
      <View style={styles.placeholder}>
        <Ionicons name="book-outline" size={32} color="#ccc" />
      </View>
    );
  }
  return <Image source={{ uri }} style={styles.bookCover} />;
};
```

##### 3. Supabase RLSポリシーの修正

**問題点**:
- CreateCommitmentScreenで書籍を挿入すると「new row violates row-level security policy」エラーが発生
- `books` テーブルにINSERTポリシーが存在しなかった

**解決策**:
`supabase_schema.sql` に以下のポリシーを追加：

```sql
CREATE POLICY "Authenticated users can insert books"
ON public.books FOR INSERT
TO authenticated
WITH CHECK (true);
```

**検証結果**:
Supabaseダッシュボードで以下の2つのポリシーが有効化されていることを確認：
- ✅ "Anyone can view books" (SELECT)
- ✅ "Authenticated users can insert books" (INSERT)

##### 4. セットアップドキュメントの作成

`docs/SETUP.md` (305行) を作成し、以下を含む包括的なガイドを提供：
- Supabaseプロジェクトのセットアップ手順
- データベーススキーマの実行方法
- RLSポリシーの設定
- 環境変数の設定
- EAS Buildの設定
- トラブルシューティングセクション

#### 成果物
- ✅ `src/screens/RoleSelectScreen.tsx` (UI完全リファクタリング)
- ✅ `src/screens/CreateCommitmentScreen.tsx` (画像フォールバック追加)
- ✅ `supabase_schema.sql` (RLSポリシー追加)
- ✅ `docs/SETUP.md` (新規作成)
- ✅ Supabase RLSポリシー設定完了

---

## 🏗️ EAS Build設定（Development Build移行）

### 実施内容
Expo GoからEAS Development Buildへ移行し、Stripeなどのネイティブモジュールをテスト可能に。

#### 1. EAS CLI のインストール
```bash
npm install -g eas-cli
```

#### 2. eas.json の作成
```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "placeholder",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "placeholder",
        "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY": "placeholder",
        "EXPO_PUBLIC_GOOGLE_API_KEY": "placeholder"
      }
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

#### 3. app.json の更新
```json
{
  "expo": {
    "scheme": "commitapp",
    "ios": {
      "bundleIdentifier": "com.kgasnalo.commitapp"
    },
    "android": {
      "package": "com.kgasnalo.commitapp"
    },
    "extra": {
      "eas": {
        "projectId": "your-project-id-will-be-added-by-eas"
      }
    }
  }
}
```

#### 4. expo-dev-client のインストール
```bash
npm install expo-dev-client
```

#### ビルドコマンド（参考）
```bash
# Android Development Build
eas build --profile development --platform android

# iOS Simulator Development Build (Macのみ)
eas build --profile development --platform ios
```

---

## 🗄️ データベーススキーマ

### テーブル構成

#### 1. users
```sql
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    stripe_customer_id TEXT,
    role TEXT,
    subscription_status TEXT DEFAULT 'inactive',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. books
```sql
CREATE TABLE public.books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_books_id TEXT UNIQUE,
    title TEXT NOT NULL,
    author TEXT,
    cover_url TEXT,
    amazon_link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3. commitments
```sql
CREATE TABLE public.commitments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'defaulted')),
    deadline TIMESTAMPTZ NOT NULL,
    pledge_amount INTEGER DEFAULT 1000,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4. verification_logs
```sql
CREATE TABLE public.verification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commitment_id UUID REFERENCES public.commitments(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    memo_text TEXT,
    ai_result JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RLS ポリシー一覧

| テーブル | ポリシー名 | 操作 | 条件 |
|---------|----------|------|------|
| users | Users can view their own data | SELECT | `auth.uid() = id` |
| users | Users can update their own data | UPDATE | `auth.uid() = id` |
| books | Anyone can view books | SELECT | `true` |
| **books** | **Authenticated users can insert books** | **INSERT** | `authenticated` |
| commitments | Users can view their own commitments | SELECT | `auth.uid() = user_id` |
| commitments | Users can create their own commitments | INSERT | `auth.uid() = user_id` |
| verification_logs | Users can view their own verification logs | SELECT | EXISTS subquery |

---

## 📁 ファイル変更サマリー

### 新規作成ファイル
| ファイルパス | 行数 | 説明 |
|-------------|------|------|
| `src/screens/CreateCommitmentScreen.tsx` | 555 | コミットメント作成画面 |
| `eas.json` | 27 | EAS Build設定 |
| `tsconfig.json` | 14 | TypeScript設定 |
| `.env` | 14 | 環境変数テンプレート |
| `docs/SETUP.md` | 305 | セットアップガイド |
| `docs/IMPLEMENTATION_REPORT.md` | - | 本報告書 |

### 更新ファイル
| ファイルパス | 主な変更内容 |
|-------------|-------------|
| `src/screens/RoleSelectScreen.tsx` | UI完全リファクタリング、BookThumbnail追加 |
| `src/navigation/AppNavigator.tsx` | CreateCommitmentScreenルート追加 |
| `app.json` | Bundle ID、scheme、EAS設定追加 |
| `supabase_schema.sql` | books INSERTポリシー追加 |
| `package.json` | DateTimePicker、expo-dev-client追加 |

---

## 🔧 技術スタック

### フロントエンド
- **React Native**: 0.76.5
- **Expo SDK**: 52
- **TypeScript**: 5.3.3
- **React Navigation**: Stack Navigator
- **Expo Vector Icons**: MaterialIcons, Ionicons, Feather

### バックエンド
- **Supabase**: 認証、データベース、RLS
- **Stripe React Native SDK**: 決済処理（未実装）

### 外部API
- **Google Books API**: 書籍検索
- **Google Gemini API**: AI検証（将来実装予定）

### 開発ツール
- **EAS CLI**: Development Build作成
- **Expo Dev Client**: ネイティブモジュールテスト環境
- **DateTimePicker**: `@react-native-community/datetimepicker`

---

## 🐛 解決した問題

### 1. Git Pull衝突エラー
**エラー内容**: Cursorでgit pullを実行すると、ローカル変更により上書きされるエラー

**解決方法**:
```bash
git reset --hard origin/claude/setup-commit-app-Bhuk2
```

### 2. TypeScriptコンパイルエラー
**エラー内容**: `Could not find a declaration file for module 'react'`

**解決方法**:
```bash
npm install --save-dev @types/react @types/react-native
```

### 3. Supabase RLS ポリシーエラー
**エラー内容**:
- CreateCommitmentScreenで書籍挿入時に「new row violates row-level security policy」
- ポリシー重複エラー（既存ポリシーが存在）

**解決方法**:
1. Supabaseダッシュボードの「SQL Editor」で既存ポリシーを確認
2. 不足しているINSERTポリシーのみを実行：
```sql
CREATE POLICY "Authenticated users can insert books"
ON public.books FOR INSERT
TO authenticated
WITH CHECK (true);
```

### 4. expo-dev-client インストールエラー
**エラー内容**: React Native Directoryからのフェッチに失敗

**解決方法**:
```bash
npm install expo-dev-client  # npx expo installの代わりにnpmを使用
```

---

## 🎨 UI/UXの改善ポイント

### Phase 3で実施したUI改善の詳細

#### 改善前の問題点
1. おすすめセクションが常に表示され、画面を占有
2. ユーザーの主目的である「検索」が目立たない
3. 役職選択が縦並びで視認性が低い

#### 改善後の成果
1. **検索CTAの強調**:
   - 黒枠・大きいアイコン（56x56px）
   - 明確なタイトル「読みたい本を検索」
   - Chevronアイコンでタップ可能性を明示

2. **おすすめの再配置**:
   - 折りたたみ可能（デフォルト: 閉じている）
   - 「任意」と明記してオプション性を強調
   - Bulbアイコンで補助的な機能であることを視覚化

3. **役職選択のグリッド化**:
   - 2x2グリッドで一覧性向上
   - 各ボタンを45%幅に設定し、タップしやすいサイズを確保

#### デザインシステム
```typescript
// カラーパレット
Primary Black: #000
Background Gray: #f9f9f9
Border Gray: #eee
Text Gray: #666
Light Gray: #ccc
Error Red: #ff6b6b

// タイポグラフィ
Title: 32px, fontWeight: '800'
Section Title: 18px, fontWeight: '600'
CTA Title: 20px, fontWeight: '700'
Body: 16px, fontWeight: '600'

// スペーシング
Section Margin: 24px
Card Padding: 16-24px
Border Radius: 8-16px
```

---

## ✅ 実装状況チェックリスト

### Phase 1: 環境構築
- [x] 依存関係のインストール
- [x] TypeScript設定
- [x] 環境変数テンプレート作成
- [x] 型定義パッケージのインストール

### Phase 2: コミットメント作成機能
- [x] CreateCommitmentScreen実装
- [x] Google Books API統合
- [x] DateTimePicker統合
- [x] Supabaseデータ保存ロジック
- [x] ナビゲーション統合

### Phase 3: UI改善とRLS修正
- [x] RoleSelectScreen UI リファクタリング
- [x] 検索優先UIへの変更
- [x] 書籍画像フォールバック実装
- [x] Supabase RLSポリシー修正
- [x] セットアップドキュメント作成

### EAS Build設定
- [x] EAS CLI インストール
- [x] eas.json 作成
- [x] app.json 更新（Bundle ID, scheme）
- [x] expo-dev-client インストール

### ドキュメント
- [x] SETUP.md 作成
- [x] IMPLEMENTATION_REPORT.md 作成（本報告書）

---

## 🚀 次のステップ（推奨）

### Phase 4: 検証機能の実装（未実装）
1. **カメラ統合**
   - expo-image-pickerを使用した写真撮影
   - 読了証明の画像アップロード

2. **画像ストレージ**
   - Supabase Storageへのアップロード
   - verification_logsテーブルへの保存

3. **AI検証機能**
   - Google Gemini APIを使用した画像分析
   - 読了証明の自動検証
   - 結果のJSONB保存

### Phase 5: Stripe決済統合（未実装）
1. **サブスクリプション管理**
   - Stripe Customer Portal統合
   - プラン変更機能

2. **ペナルティ課金**
   - 期限切れコミットメントの自動検出
   - Stripe Payment Intentの作成
   - 課金処理の実行

### Phase 6: ダッシュボード機能（未実装）
1. **コミットメント一覧**
   - 進行中/完了/失敗の表示
   - ステータスフィルタリング

2. **統計表示**
   - 達成率の可視化
   - 読書履歴のグラフ

### Phase 7: プロダクションデプロイ
1. **環境変数の本番化**
   - EAS Secretsへの移行
   - 本番用Stripe/Supabaseキーの設定

2. **アプリストア申請**
   - iOS App Store
   - Google Play Store

---

## 📊 コードメトリクス

### ファイル統計
- 総ファイル数（新規作成）: 6
- 総ファイル数（更新）: 5
- 総コード行数（新規）: 約915行
- TypeScriptファイル: 2（CreateCommitmentScreen, RoleSelectScreen更新）
- 設定ファイル: 3（eas.json, tsconfig.json, .env）
- ドキュメント: 2（SETUP.md, IMPLEMENTATION_REPORT.md）

### コンポーネント統計
- 画面コンポーネント: 2（CreateCommitmentScreen, RoleSelectScreen）
- カスタムコンポーネント: 2（BookThumbnail x 2）
- ナビゲーションルート: 1追加（CreateCommitment）

---

## 🔒 セキュリティ考慮事項

### 実装済み
1. **Row Level Security (RLS)**
   - 全テーブルでRLS有効化
   - ユーザーごとのデータアクセス制限
   - 認証済みユーザーのみINSERT可能

2. **環境変数管理**
   - `.env` ファイルを `.gitignore` に追加
   - APIキーの秘匿化
   - EAS Secretsによる本番管理（推奨）

3. **認証チェック**
   - `supabase.auth.getUser()` による認証確認
   - 未認証時のエラーハンドリング

### 今後の対応が必要
1. **入力バリデーション**
   - XSS対策（ユーザー入力のサニタイズ）
   - SQLインジェクション対策（Supabaseクライアント使用により対応済み）

2. **レート制限**
   - Google Books API呼び出しの制限
   - Supabaseクエリの最適化

3. **エラーロギング**
   - Sentryなどのエラートラッキングツール導入
   - 本番環境でのデバッグ情報の秘匿

---

## 🎓 学んだベストプラクティス

### 1. ユーザーインサイト駆動の開発
Phase 3で「ユーザーは読みたい本があるからこのアプリを使う」というインサイトに基づき、UIを根本から変更。**機能ではなくユーザー行動を優先する**ことの重要性を実証。

### 2. RLSポリシーの段階的テスト
全ポリシーを一度に実行せず、不足しているポリシーのみを追加することで、エラーの原因を特定しやすくした。

### 3. TypeScript Strictモードの利点
型エラーを早期に発見し、ランタイムエラーを防止。特にGoogle Books APIのレスポンス型定義が有効。

### 4. コンポーネントの再利用性
`BookThumbnail` コンポーネントを両スクリーンで使用し、コードの重複を削減。

---

## 📞 サポート情報

### 問題発生時の確認手順
1. `docs/SETUP.md` のトラブルシューティングセクションを確認
2. Supabase RLSポリシーの設定を確認
3. 環境変数が正しく設定されているか確認
4. TypeScriptコンパイルエラーの確認: `npx tsc --noEmit`

### 関連リソース
- [Expo Documentation](https://docs.expo.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [Stripe React Native SDK](https://stripe.com/docs/stripe-react-native)
- [Google Books API Documentation](https://developers.google.com/books)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)

---

## 📝 変更履歴

| 日付 | フェーズ | 主な変更内容 |
|------|---------|-------------|
| 2025-12-26 | Phase 1 | 環境構築、依存関係インストール |
| 2025-12-26 | Phase 2 | CreateCommitmentScreen実装、Google Books API統合 |
| 2025-12-26 | Phase 3 | UI改善（検索優先）、RLSポリシー修正、ドキュメント作成 |
| 2025-12-26 | EAS Build | Development Build設定、expo-dev-clientインストール |

---

## ✍️ 署名

**開発者**: Claude (Anthropic)
**プロジェクトリード**: kgasnalo
**リポジトリ**: commit-app
**ブランチ**: claude/setup-commit-app-Bhuk2
**最終コミット**: "Implement Phase 3: UI improvements and RLS fixes"

---

**報告書終了**

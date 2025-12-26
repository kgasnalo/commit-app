# COMMIT アプリ セットアップガイド

このドキュメントでは、COMMITアプリの開発環境とSupabaseバックエンドのセットアップ手順を説明します。

---

## 前提条件

- Node.js 18以上
- npm または yarn
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)
- Supabaseアカウント
- Stripeアカウント（決済機能用）
- Google Cloud Platform アカウント（Google Books API用）

---

## 1. プロジェクトのセットアップ

### 1.1 依存関係のインストール

```bash
cd commit-app
npm install
```

### 1.2 環境変数の設定

プロジェクトルートに `.env` ファイルを作成し、以下の値を設定してください：

```bash
# Supabase設定
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Stripe設定
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_SECRET_KEY=sk_test_your_secret_key

# Google Books API
EXPO_PUBLIC_GOOGLE_API_KEY=your_google_books_api_key

# Google Gemini API (将来の検証機能用)
EXPO_PUBLIC_GOOGLE_GEMINI_API_KEY=your_gemini_api_key
```

**注意**: `.env` ファイルは `.gitignore` に含まれています。実際の値を記入したファイルは公開リポジトリにコミットしないでください。

---

## 2. Supabaseのセットアップ

### 2.1 Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com) にログイン
2. 「New Project」をクリック
3. プロジェクト名、データベースパスワード、リージョンを設定
4. プロジェクトが作成されるまで待機（数分かかります）

### 2.2 データベーススキーマの実行

Supabaseダッシュボードで以下の手順を実行：

1. 左サイドバーから「SQL Editor」を選択
2. 「New Query」をクリック
3. 以下のSQLを貼り付けて実行：

```sql
-- 1. users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    stripe_customer_id TEXT,
    role TEXT,
    subscription_status TEXT DEFAULT 'inactive',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. books table
CREATE TABLE IF NOT EXISTS public.books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_books_id TEXT UNIQUE,
    title TEXT NOT NULL,
    author TEXT,
    cover_url TEXT,
    amazon_link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. commitments table
CREATE TABLE IF NOT EXISTS public.commitments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'defaulted')),
    deadline TIMESTAMPTZ NOT NULL,
    pledge_amount INTEGER DEFAULT 1000,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. verification_logs table
CREATE TABLE IF NOT EXISTS public.verification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commitment_id UUID REFERENCES public.commitments(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    memo_text TEXT,
    ai_result JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_logs ENABLE ROW LEVEL SECURITY;
```

4. 「Run」をクリックして実行

### 2.3 RLSポリシーの設定

**重要**: 以下のRLSポリシーを設定してください。これにより、認証されたユーザーが書籍データを挿入できるようになります。

同じSQL Editorで以下を実行：

```sql
-- RLS Policies

-- Users table
CREATE POLICY "Users can view their own data"
ON public.users FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own data"
ON public.users FOR UPDATE
USING (auth.uid() = id);

-- Books table
CREATE POLICY "Anyone can view books"
ON public.books FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert books"
ON public.books FOR INSERT
TO authenticated
WITH CHECK (true);

-- Commitments table
CREATE POLICY "Users can view their own commitments"
ON public.commitments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own commitments"
ON public.commitments FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Verification logs table
CREATE POLICY "Users can view their own verification logs"
ON public.verification_logs FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.commitments
        WHERE commitments.id = verification_logs.commitment_id
        AND commitments.user_id = auth.uid()
    )
);
```

### 2.4 認証設定

1. 左サイドバーから「Authentication」→「Settings」を選択
2. 「Email Auth」を有効化
3. 必要に応じて確認メールの設定を調整

---

## 3. Google Books APIの設定

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成
3. 「APIs & Services」→「Library」から「Books API」を検索して有効化
4. 「Credentials」からAPIキーを作成
5. 作成したAPIキーを `.env` の `EXPO_PUBLIC_GOOGLE_API_KEY` に設定

---

## 4. Stripeの設定

1. [Stripe Dashboard](https://dashboard.stripe.com/) にログイン
2. 「Developers」→「API keys」を開く
3. テスト環境のPublishable KeyとSecret Keyをコピー
4. `.env` ファイルに設定

**注意**: 本番環境では必ず本番用のキーに切り替えてください。

---

## 5. EAS Buildの設定（Development Build用）

### 5.1 EASにログイン

```bash
eas login
```

### 5.2 プロジェクトの設定

```bash
eas build:configure
```

### 5.3 環境変数をEAS Secretsに設定

```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://your-project.supabase.co"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your_key"
eas secret:create --scope project --name EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY --value "pk_test_..."
eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_API_KEY --value "AIzaSy..."
```

### 5.4 Developmentビルドの作成

```bash
# Android
eas build --profile development --platform android

# iOS Simulator (Macのみ)
eas build --profile development --platform ios
```

---

## 6. 開発サーバーの起動

### Expo Go（簡易テスト用）

```bash
npx expo start
```

### Development Build（Stripe等のネイティブモジュールテスト用）

1. Development BuildのAPK/IPAをダウンロードしてデバイスにインストール
2. 開発サーバーを起動：

```bash
npx expo start --dev-client
```

---

## トラブルシューティング

### RLSエラー: 書籍の挿入に失敗する

**症状**: CreateCommitmentScreenで書籍を選択すると「new row violates row-level security policy」エラーが発生

**解決方法**:
1. Supabaseダッシュボードの「SQL Editor」を開く
2. 以下のSQLを実行して、`books`テーブルのINSERTポリシーが存在するか確認：

```sql
SELECT * FROM pg_policies WHERE tablename = 'books';
```

3. ポリシーが存在しない場合は、上記「2.3 RLSポリシーの設定」を実行

### 環境変数が読み込まれない

**解決方法**:
1. `.env` ファイルがプロジェクトルートに存在するか確認
2. すべての環境変数名が `EXPO_PUBLIC_` プレフィックスで始まっているか確認（クライアント側で使用する場合）
3. 開発サーバーを再起動

### TypeScriptエラー

```bash
# 型チェック
npx tsc --noEmit

# 依存関係の再インストール
rm -rf node_modules
npm install
```

---

## 参考リンク

- [Expo Documentation](https://docs.expo.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [Stripe React Native SDK](https://stripe.com/docs/stripe-react-native)
- [Google Books API Documentation](https://developers.google.com/books)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)

---

## サポート

問題が発生した場合は、以下を確認してください：

1. このドキュメントのトラブルシューティングセクション
2. プロジェクトの GitHub Issues
3. 各サービスの公式ドキュメント

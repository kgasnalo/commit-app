# OAuth認証設定ガイド

このドキュメントでは、COMMITアプリでGoogle Sign InとApple Sign Inを有効化するための設定方法を説明します。

## 概要

Phase 9で実装されたOAuth認証機能により、ユーザーは以下の方法でログインできます：
- メールアドレス/パスワード（既存）
- Googleアカウント（新規）
- Appleアカウント（iOS、新規）

## 前提条件

- Supabaseプロジェクトが作成済みであること
- expo-dev-clientを使用したDevelopment Buildが必要（Expo Goでは動作しません）

## Supabaseでの設定

### 1. Google OAuth設定

#### 1.1 Google Cloud Consoleでの設定

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成、または既存のプロジェクトを選択
3. **APIとサービス > 認証情報** に移動
4. **認証情報を作成 > OAuthクライアントID** をクリック
5. アプリケーションの種類を選択：
   - **iOSアプリケーション**（iOS用）
     - バンドルID: `com.kgxxx.commitapp`
   - **Androidアプリケーション**（Android用）
     - パッケージ名: `com.kgxxx.commitapp`
     - SHA-1証明書フィンガープリント（Development Build用）
   - **ウェブアプリケーション**（Supabase用）
     - 承認済みのリダイレクトURI: `https://<YOUR-PROJECT-REF>.supabase.co/auth/v1/callback`

#### 1.2 Supabaseでの設定

1. [Supabase Dashboard](https://app.supabase.com/)にログイン
2. プロジェクトを選択
3. **Authentication > Providers** に移動
4. **Google** を選択
5. **Enable Sign in with Google** をONにする
6. Google Cloud Consoleで作成したウェブアプリケーションの認証情報を入力：
   - **Client ID**: `YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com`
   - **Client Secret**: Google Cloud Consoleで取得したシークレット
7. **Save** をクリック

### 2. Apple OAuth設定（iOS）

#### 2.1 Apple Developer Consoleでの設定

1. [Apple Developer Console](https://developer.apple.com/)にログイン
2. **Certificates, Identifiers & Profiles** に移動
3. **Identifiers** を選択
4. あなたのApp ID（`com.kgxxx.commitapp`）を選択
5. **Sign In with Apple** を有効化
6. **Services ID** を作成：
   - Identifier: `com.kgxxx.commitapp.service`
   - **Sign In with Apple** を有効化
   - **Configure** をクリック
   - Primary App ID: `com.kgxxx.commitapp`
   - Return URLs: `https://<YOUR-PROJECT-REF>.supabase.co/auth/v1/callback`

#### 2.2 Supabaseでの設定

1. [Supabase Dashboard](https://app.supabase.com/)にログイン
2. プロジェクトを選択
3. **Authentication > Providers** に移動
4. **Apple** を選択
5. **Enable Sign in with Apple** をONにする
6. Apple Developer Consoleで作成した認証情報を入力：
   - **Services ID**: `com.kgxxx.commitapp.service`
   - **Key ID**: Apple Developer Consoleで作成したキーのID
   - **Team ID**: Apple Developer TeamのID（Membership画面で確認可能）
   - **Private Key**: `.p8`ファイルの内容
7. **Save** をクリック

## アプリ側の設定

### 1. 環境変数

`.env`ファイルに以下を追加（必要に応じて）：

```env
EXPO_PUBLIC_SUPABASE_URL=https://<YOUR-PROJECT-REF>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<YOUR-ANON-KEY>
```

### 2. app.json設定

`app.json`は既に設定済みです：

```json
{
  "expo": {
    "scheme": "commitapp",
    "plugins": [
      "expo-apple-authentication"
    ],
    "ios": {
      "bundleIdentifier": "com.kgxxx.commitapp"
    },
    "android": {
      "package": "com.kgxxx.commitapp"
    }
  }
}
```

### 3. Development Buildの作成

OAuth認証を使用するには、Development Buildが必要です：

```bash
# iOS
eas build --profile development --platform ios

# Android
eas build --profile development --platform android
```

## 動作確認

1. Development Buildをインストール
2. AuthScreenで以下をテスト：
   - メールアドレス/パスワードでのログイン（既存機能）
   - 「Googleでログイン」ボタンをタップ
   - 「Appleでログイン」ボタンをタップ（iOS）
3. 各認証方法でログインできることを確認
4. Supabase Dashboardの**Authentication > Users**で新しいユーザーが作成されることを確認

## トラブルシューティング

### Google Sign Inが失敗する

- Google Cloud ConsoleでリダイレクトURIが正しく設定されているか確認
- SupabaseのClient IDとClient Secretが正しいか確認
- Development Buildを使用しているか確認（Expo Goでは動作しません）

### Apple Sign Inが失敗する

- Apple Developer ConsoleでSign In with Appleが有効化されているか確認
- Services IDのReturn URLsが正しく設定されているか確認
- SupabaseのKey ID、Team ID、Private Keyが正しいか確認
- iOSデバイスでテストしているか確認（AndroidではApple Sign Inは利用不可）

### リダイレクト後にアプリが開かない

- `app.json`の`scheme`が`commitapp`に設定されているか確認
- Development Buildを再ビルドしてみる

## セキュリティの考慮事項

1. **環境変数の管理**
   - `.env`ファイルはgitignoreに追加
   - 本番環境では環境変数を適切に管理

2. **Client Secret**
   - Google Client Secretは安全に保管
   - Apple Private Key（.p8ファイル）は絶対にリポジトリにコミットしない

3. **リダイレクトURI**
   - SupabaseとOAuthプロバイダーのリダイレクトURIが一致していることを確認
   - 本番環境と開発環境で異なるURIを使用する場合は注意

## 参考リンク

- [Supabase Auth with OAuth](https://supabase.com/docs/guides/auth/social-login)
- [Expo AuthSession](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [Expo Apple Authentication](https://docs.expo.dev/versions/latest/sdk/apple-authentication/)
- [Google Sign-In for iOS](https://developers.google.com/identity/sign-in/ios/start)
- [Sign in with Apple](https://developer.apple.com/sign-in-with-apple/)

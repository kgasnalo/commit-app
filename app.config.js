// =============================================================================
// app.config.js - EAS Build 環境変数注入
// =============================================================================
//
// EASビルドでは.envファイルがコピーされないため、環境変数をextraフィールドに
// 明示的に設定し、ランタイムでConstants.expoConfig.extra経由で読み込む。
//
// 参照:
// - https://docs.expo.dev/guides/environment-variables/
// - https://github.com/expo/eas-cli/issues/3248
// =============================================================================

const path = require('path');

// ローカル開発用: .envからロード（存在する場合のみ）
try {
  require('dotenv').config({
    path: path.resolve(__dirname, '.env'),
  });
} catch (e) {
  // dotenvがない場合は無視（EASビルド環境）
}

// app.json をロード
const appJson = require('./app.json');

// 環境変数をextraに設定（eas.jsonのenvセクションまたは.envから）
// EXPO_PUBLIC_ プレフィックスを除いたキー名で保存
const extra = {
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  GOOGLE_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_API_KEY,
  SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
  POSTHOG_API_KEY: process.env.EXPO_PUBLIC_POSTHOG_API_KEY,
  POSTHOG_HOST: process.env.EXPO_PUBLIC_POSTHOG_HOST,
  GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  // 既存のextraを保持
  eas: appJson.expo?.extra?.eas,
};

// ビルド時のデバッグログ
console.log('[app.config.js] Environment variables status:');
const envKeys = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'GOOGLE_API_KEY',
  'SENTRY_DSN',
  'POSTHOG_API_KEY',
  'POSTHOG_HOST',
  'GOOGLE_WEB_CLIENT_ID',
  'GOOGLE_IOS_CLIENT_ID',
];

let missingVars = 0;
envKeys.forEach(key => {
  const val = extra[key];
  if (val) {
    // セキュリティのため最初の20文字のみ表示
    console.log(`  ✅ ${key}: ${String(val).substring(0, 20)}...`);
  } else {
    console.warn(`  ❌ ${key}: NOT SET`);
    missingVars++;
  }
});

if (missingVars > 0) {
  console.warn(`[app.config.js] ⚠️ ${missingVars} environment variables are missing!`);
} else {
  console.log('[app.config.js] ✅ All environment variables loaded successfully!');
}

// app.json にextraを追加してエクスポート
module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    extra,
  },
};

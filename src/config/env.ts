/**
 * Environment Configuration with strict validation.
 * This module validates ALL required environment variables at import time.
 * If any required variable is missing, the app will crash immediately
 * with a clear error message.
 *
 * Environment variables are loaded from two sources:
 * 1. process.env (local development, Expo Go)
 * 2. Constants.expoConfig.extra (EAS builds via app.config.js)
 */

import Constants from 'expo-constants';

// ============================================
// Type Definitions
// ============================================

interface RequiredEnvVars {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  STRIPE_PUBLISHABLE_KEY: string;
}

interface OptionalEnvVars {
  GOOGLE_API_KEY: string | undefined;
  SENTRY_DSN: string | undefined;
  POSTHOG_API_KEY: string | undefined;
  GOOGLE_WEB_CLIENT_ID: string | undefined;
  GOOGLE_IOS_CLIENT_ID: string | undefined;
}

export interface EnvConfig extends RequiredEnvVars, OptionalEnvVars {}

// ============================================
// Extra Config from app.config.js
// ============================================

// EASビルドではapp.config.jsのextraフィールドから読み込む
const extraConfig: Record<string, string | undefined> =
  (Constants.expoConfig?.extra as Record<string, string | undefined>) ?? {};

// デバッグログ
if (__DEV__) {
  console.log('[env.ts] extraConfig keys:', Object.keys(extraConfig));
}

// ============================================
// Validation Functions
// ============================================

function getRequiredEnv(key: string): string {
  const fullKey = `EXPO_PUBLIC_${key}`;

  // 1. process.envから試行（ローカル開発、Expo Go）
  let value = process.env[fullKey];

  // 2. Constants.expoConfig.extraからフォールバック（EASビルド）
  if (!value || value.trim() === '') {
    value = extraConfig[key];
    if (__DEV__ && value) {
      console.log(`[env.ts] ${key}: loaded from extraConfig`);
    }
  }

  if (!value || value.trim() === '') {
    throw new Error(
      `[ENV ERROR] Missing required environment variable: ${fullKey}\n` +
        `Please check your .env file or eas.json env section.\n` +
        `See .env.example for reference.`
    );
  }

  return value;
}

function getOptionalEnv(key: string): string | undefined {
  const fullKey = `EXPO_PUBLIC_${key}`;

  // 1. process.envから試行
  let value = process.env[fullKey];

  // 2. extraからフォールバック
  if (!value || value.trim() === '') {
    value = extraConfig[key];
  }

  if (!value || value.trim() === '') {
    console.warn(
      `[ENV WARNING] Optional environment variable not set: ${fullKey}\n` +
        `Some features may be disabled.`
    );
    return undefined;
  }

  return value;
}

function validateUrl(value: string, name: string): string {
  try {
    new URL(value);
    return value;
  } catch {
    throw new Error(
      `[ENV ERROR] Invalid URL format for ${name}: "${value}"\n` +
        `Expected a valid URL (e.g., https://example.supabase.co)`
    );
  }
}

function validateApiKey(
  value: string,
  name: string,
  minLength: number = 10
): string {
  if (value.length < minLength) {
    throw new Error(
      `[ENV ERROR] ${name} appears to be invalid (too short).\n` +
        `Expected at least ${minLength} characters, got ${value.length}.`
    );
  }
  return value;
}

// ============================================
// Build and Export Config
// ============================================

function buildEnvConfig(): EnvConfig {
  // Required variables - will throw if missing
  const supabaseUrl = validateUrl(
    getRequiredEnv('SUPABASE_URL'),
    'SUPABASE_URL'
  );

  const supabaseAnonKey = validateApiKey(
    getRequiredEnv('SUPABASE_ANON_KEY'),
    'SUPABASE_ANON_KEY',
    20
  );

  const stripePublishableKey = validateApiKey(
    getRequiredEnv('STRIPE_PUBLISHABLE_KEY'),
    'STRIPE_PUBLISHABLE_KEY',
    10
  );

  // Stripe key format validation (should start with pk_)
  if (!stripePublishableKey.startsWith('pk_')) {
    throw new Error(
      `[ENV ERROR] STRIPE_PUBLISHABLE_KEY should start with "pk_".\n` +
        `Got: "${stripePublishableKey.substring(0, 10)}..."`
    );
  }

  // Optional variables - will log warning if missing
  const googleApiKey = getOptionalEnv('GOOGLE_API_KEY');
  const sentryDsn = getOptionalEnv('SENTRY_DSN');
  const posthogApiKey = getOptionalEnv('POSTHOG_API_KEY');
  const googleWebClientId = getOptionalEnv('GOOGLE_WEB_CLIENT_ID');
  const googleIosClientId = getOptionalEnv('GOOGLE_IOS_CLIENT_ID');

  return {
    SUPABASE_URL: supabaseUrl,
    SUPABASE_ANON_KEY: supabaseAnonKey,
    STRIPE_PUBLISHABLE_KEY: stripePublishableKey,
    GOOGLE_API_KEY: googleApiKey,
    SENTRY_DSN: sentryDsn,
    POSTHOG_API_KEY: posthogApiKey,
    GOOGLE_WEB_CLIENT_ID: googleWebClientId,
    GOOGLE_IOS_CLIENT_ID: googleIosClientId,
  };
}

// ============================================
// Export Singleton (validates on import)
// ============================================

/**
 * Error captured during env initialization.
 * If set, the app should show an error state instead of crashing.
 */
export let ENV_INIT_ERROR: string | null = null;

/**
 * Validated environment configuration.
 * Importing this module will trigger validation.
 * If validation fails, ENV_INIT_ERROR is set and fallback values are used.
 */
let _env: EnvConfig;
try {
  _env = buildEnvConfig();
} catch (error: any) {
  ENV_INIT_ERROR = error?.message ?? 'Unknown env initialization error';
  console.error('[ENV] Initialization failed:', ENV_INIT_ERROR);
  // Fallback values to prevent module-level crash
  _env = {
    SUPABASE_URL: '',
    SUPABASE_ANON_KEY: '',
    STRIPE_PUBLISHABLE_KEY: '',
    GOOGLE_API_KEY: undefined,
    SENTRY_DSN: undefined,
    POSTHOG_API_KEY: undefined,
    GOOGLE_WEB_CLIENT_ID: undefined,
    GOOGLE_IOS_CLIENT_ID: undefined,
  };
}

export const env: EnvConfig = _env;

// Also export individual variables for convenience
export const {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  STRIPE_PUBLISHABLE_KEY,
  GOOGLE_API_KEY,
  SENTRY_DSN,
  POSTHOG_API_KEY,
  GOOGLE_WEB_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
} = env;

/**
 * Environment Configuration with strict validation.
 * This module validates ALL required environment variables at import time.
 * If any required variable is missing, the app will crash immediately
 * with a clear error message.
 */

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
}

export interface EnvConfig extends RequiredEnvVars, OptionalEnvVars {}

// ============================================
// Validation Functions
// ============================================

function getRequiredEnv(key: string): string {
  const fullKey = `EXPO_PUBLIC_${key}`;
  const value = process.env[fullKey];

  if (!value || value.trim() === '') {
    throw new Error(
      `[ENV ERROR] Missing required environment variable: ${fullKey}\n` +
        `Please check your .env file and ensure ${fullKey} is set.\n` +
        `See .env.example for reference.`
    );
  }

  return value;
}

function getOptionalEnv(key: string): string | undefined {
  const fullKey = `EXPO_PUBLIC_${key}`;
  const value = process.env[fullKey];

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

  return {
    SUPABASE_URL: supabaseUrl,
    SUPABASE_ANON_KEY: supabaseAnonKey,
    STRIPE_PUBLISHABLE_KEY: stripePublishableKey,
    GOOGLE_API_KEY: googleApiKey,
    SENTRY_DSN: sentryDsn,
    POSTHOG_API_KEY: posthogApiKey,
  };
}

// ============================================
// Export Singleton (validates on import)
// ============================================

/**
 * Validated environment configuration.
 * Importing this module will trigger validation.
 * The app will crash if required variables are missing.
 */
export const env: EnvConfig = buildEnvConfig();

// Also export individual variables for convenience
export const {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  STRIPE_PUBLISHABLE_KEY,
  GOOGLE_API_KEY,
  SENTRY_DSN,
  POSTHOG_API_KEY,
} = env;

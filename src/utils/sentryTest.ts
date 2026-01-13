/**
 * Sentry Test Utilities
 * Phase 8.1 - Test error mechanisms for verifying Sentry integration
 *
 * Usage (Development only):
 *   import { triggerTestError, triggerTestMessage } from '../utils/sentryTest';
 *   triggerTestError();
 *   triggerTestMessage();
 */

import * as Sentry from '@sentry/react-native';
import { SENTRY_DSN } from '../config/env';
import { addBreadcrumb } from './errorLogger';

/**
 * Trigger a test error to verify Sentry error capture
 */
export function triggerTestError(): void {
  if (!SENTRY_DSN) {
    console.warn('[Sentry Test] SENTRY_DSN not configured');
    return;
  }

  try {
    // Add breadcrumb for context
    addBreadcrumb('Test error triggered', 'test', {
      timestamp: new Date().toISOString(),
      platform: 'mobile',
    });

    // Throw a test error
    throw new Error('Sentry Test Error: This is a test error from the mobile app');
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        test: 'true',
        platform: 'mobile',
      },
      extra: {
        triggered_at: new Date().toISOString(),
        environment: __DEV__ ? 'development' : 'production',
      },
    });

    console.log('[Sentry Test] Test error sent to Sentry');
  }
}

/**
 * Trigger a test message to verify Sentry message capture
 */
export function triggerTestMessage(): void {
  if (!SENTRY_DSN) {
    console.warn('[Sentry Test] SENTRY_DSN not configured');
    return;
  }

  Sentry.captureMessage('Sentry Test Message: This is a test message from the mobile app', {
    level: 'info',
    tags: {
      test: 'true',
      platform: 'mobile',
    },
    extra: {
      triggered_at: new Date().toISOString(),
      environment: __DEV__ ? 'development' : 'production',
    },
  });

  console.log('[Sentry Test] Test message sent to Sentry');
}

/**
 * Trigger a native crash (use with caution - only in development!)
 */
export function triggerNativeCrash(): void {
  if (!__DEV__) {
    console.warn('[Sentry Test] Native crash only available in development');
    return;
  }

  if (!SENTRY_DSN) {
    console.warn('[Sentry Test] SENTRY_DSN not configured');
    return;
  }

  console.log('[Sentry Test] Triggering native crash...');
  Sentry.nativeCrash();
}

/**
 * Test all Sentry features at once
 */
export function runSentryDiagnostics(): void {
  console.log('[Sentry Diagnostics] Starting...');
  console.log('[Sentry Diagnostics] DSN configured:', !!SENTRY_DSN);
  console.log('[Sentry Diagnostics] Environment:', __DEV__ ? 'development' : 'production');

  // Test message
  triggerTestMessage();

  // Wait a bit, then test error
  setTimeout(() => {
    triggerTestError();
    console.log('[Sentry Diagnostics] Complete. Check Sentry dashboard for events.');
  }, 1000);
}

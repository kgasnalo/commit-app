import { ErrorInfo } from 'react';
import * as Sentry from '@sentry/react-native';
import { SENTRY_DSN } from '../config/env';

/**
 * Logs errors for debugging and monitoring.
 * Sends to Sentry in production when DSN is configured.
 */
export function logError(error: Error, errorInfo?: ErrorInfo): void {
  // Development: Log to console
  console.error('[ErrorBoundary] Caught an error:', error);

  if (errorInfo?.componentStack) {
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  // Production: Send to Sentry
  if (SENTRY_DSN && !__DEV__) {
    Sentry.captureException(error, {
      extra: { componentStack: errorInfo?.componentStack },
    });
  }
}

/**
 * Logs a message to Sentry with additional context.
 * Useful for tracking non-error events.
 */
export function logMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  extra?: Record<string, unknown>
): void {

  if (SENTRY_DSN && !__DEV__) {
    Sentry.captureMessage(message, {
      level,
      extra,
    });
  }
}

/**
 * Sets user context for Sentry error reports.
 * Call this after user authentication.
 */
export function setUserContext(userId: string): void {
  if (SENTRY_DSN) {
    Sentry.setUser({
      id: userId,
    });
  }
}

/**
 * Clears user context (call on logout).
 */
export function clearUserContext(): void {
  if (SENTRY_DSN) {
    Sentry.setUser(null);
  }
}

/**
 * Adds breadcrumb for debugging context.
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>
): void {
  if (SENTRY_DSN) {
    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level: 'info',
    });
  }
}

/**
 * Captures an exception with context.
 * Always logs to console. Sends to Sentry in production.
 * Use this in catch blocks throughout the app.
 */
export function captureError(
  error: unknown,
  context: {
    location: string;
    extra?: Record<string, unknown>;
    level?: Sentry.SeverityLevel;
  }
): void {
  // Always log to console for development
  console.error(`[${context.location}]`, error);

  // Send to Sentry in production
  if (SENTRY_DSN && !__DEV__) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    Sentry.captureException(errorObj, {
      tags: { location: context.location },
      extra: context.extra,
      level: context.level || 'error',
    });
  }
}

/**
 * Captures a warning-level error.
 * Use for recoverable errors that should still be tracked.
 */
export function captureWarning(
  message: string,
  context: {
    location: string;
    extra?: Record<string, unknown>;
  }
): void {
  console.warn(`[${context.location}]`, message);

  if (SENTRY_DSN && !__DEV__) {
    Sentry.captureMessage(message, {
      level: 'warning',
      tags: { location: context.location },
      extra: context.extra,
    });
  }
}

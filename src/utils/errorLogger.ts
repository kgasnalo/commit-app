import { ErrorInfo } from 'react';

/**
 * Logs errors for debugging purposes.
 * Placeholder for future Sentry integration.
 */
export function logError(error: Error, errorInfo?: ErrorInfo): void {
  // Development: Log to console
  console.error('[ErrorBoundary] Caught an error:', error);

  if (errorInfo?.componentStack) {
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  // Future: Sentry integration
  // if (!__DEV__) {
  //   Sentry.captureException(error, {
  //     extra: { componentStack: errorInfo?.componentStack },
  //   });
  // }
}

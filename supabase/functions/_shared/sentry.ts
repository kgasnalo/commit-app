// Sentry integration for Supabase Edge Functions (Deno runtime)
// TEMPORARILY DISABLED: Sentry Deno SDK causes WORKER_ERROR in Edge Functions
// See: commit a884b882 - "fix: disable Sentry SDK to debug Edge Function WORKER_ERROR"
// TODO: Re-enable when Sentry releases a compatible Deno Edge Runtime SDK

// All functions are no-op stubs to maintain API compatibility

const SENTRY_DSN = Deno.env.get("SENTRY_DSN_EDGE");

export function initSentry(functionName: string) {
  if (SENTRY_DSN) {
    console.log(`[Sentry] SDK disabled - would initialize for: ${functionName}`);
  }
}

/**
 * Capture an exception (no-op - logs to console only)
 */
export function captureException(
  error: Error | unknown,
  context?: {
    functionName?: string;
    userId?: string;
    extra?: Record<string, unknown>;
  }
) {
  console.error("[Sentry] Exception (SDK disabled):", error, context);
}

/**
 * Capture a message (no-op - logs to console only)
 */
export function captureMessage(
  message: string,
  level: "fatal" | "error" | "warning" | "log" | "info" | "debug" = "info",
  extra?: Record<string, unknown>
) {
  console.log(`[Sentry] Message (SDK disabled): [${level}] ${message}`, extra);
}

/**
 * Add breadcrumb (no-op)
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>
) {
  // No-op: breadcrumbs only useful when SDK is active
}

/**
 * Start a transaction (no-op - returns null)
 */
export function startTransaction(_name: string, _op: string) {
  return null;
}

/**
 * Wrapper to catch errors in Edge Functions (passthrough)
 */
export function withSentry<T>(
  functionName: string,
  handler: () => Promise<T>
): Promise<T> {
  return handler().catch((error) => {
    console.error(`[Sentry] Error in ${functionName} (SDK disabled):`, error);
    throw error;
  });
}

/**
 * Create a Sentry-wrapped request handler (passthrough)
 */
export function createSentryHandler(
  functionName: string,
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (error) {
      console.error(`[Sentry] Error in ${functionName} (SDK disabled):`, error);
      throw error;
    }
  };
}

/**
 * Log a business metric/event (logs to console only)
 */
export function logBusinessEvent(
  eventName: string,
  data?: Record<string, unknown>
) {
  console.log(`[Sentry] Business event (SDK disabled): ${eventName}`, data);
}

/**
 * @deprecated Use logBusinessEvent for success metrics.
 * Increment a custom metric counter (no-op)
 */
export function incrementMetric(
  _name: string,
  _value: number = 1,
  _tags?: Record<string, string>
) {
  // No-op
}

// Sentry integration for Supabase Edge Functions (Deno runtime)
// https://docs.sentry.io/platforms/javascript/guides/deno/

import * as Sentry from "https://deno.land/x/sentry@8.42.0/index.mjs";

// Initialize Sentry with Edge DSN
const SENTRY_DSN = Deno.env.get("SENTRY_DSN_EDGE");

let initialized = false;

export function initSentry(functionName: string) {
  if (!SENTRY_DSN) {
    console.warn("[Sentry] SENTRY_DSN_EDGE not set, skipping initialization");
    return;
  }

  if (initialized) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.1, // 10% of transactions to avoid quota exhaustion
    environment: Deno.env.get("DENO_DEPLOYMENT_ID") ? "production" : "development",
    release: `edge-functions@${new Date().toISOString().split("T")[0]}`,
    serverName: functionName,
    // Edge Functions specific settings
    integrations: [],
  });

  initialized = true;
  console.log(`[Sentry] Initialized for function: ${functionName}`);
}

/**
 * Capture an exception and send to Sentry
 */
export function captureException(
  error: Error | unknown,
  context?: {
    functionName?: string;
    userId?: string;
    extra?: Record<string, unknown>;
  }
) {
  if (!SENTRY_DSN) {
    console.error("[Sentry] Error (not sent - no DSN):", error);
    return;
  }

  // Set user context if provided
  if (context?.userId) {
    Sentry.setUser({ id: context.userId });
  }

  // Add function name as tag
  if (context?.functionName) {
    Sentry.setTag("function_name", context.functionName);
  }

  Sentry.captureException(error, {
    extra: context?.extra,
  });

  console.error(`[Sentry] Exception captured:`, error);
}

/**
 * Capture a message (non-error event)
 */
export function captureMessage(
  message: string,
  level: "fatal" | "error" | "warning" | "log" | "info" | "debug" = "info",
  extra?: Record<string, unknown>
) {
  if (!SENTRY_DSN) {
    console.log(`[Sentry] Message (not sent - no DSN): ${message}`);
    return;
  }

  Sentry.captureMessage(message, {
    level,
    extra,
  });
}

/**
 * Add breadcrumb for debugging context
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>
) {
  if (!SENTRY_DSN) return;

  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: "info",
  });
}

/**
 * Start a transaction for performance monitoring
 */
export function startTransaction(name: string, op: string) {
  if (!SENTRY_DSN) return null;

  return Sentry.startSpan({ name, op }, (span) => span);
}

/**
 * Wrapper to catch errors in Edge Functions
 */
export function withSentry<T>(
  functionName: string,
  handler: () => Promise<T>
): Promise<T> {
  initSentry(functionName);

  return handler().catch((error) => {
    captureException(error, { functionName });
    throw error;
  });
}

/**
 * Create a Sentry-wrapped request handler for Edge Functions
 */
export function createSentryHandler(
  functionName: string,
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    initSentry(functionName);

    try {
      addBreadcrumb(`${functionName} request received`, "http", {
        url: req.url,
        method: req.method,
      });

      const response = await handler(req);

      addBreadcrumb(`${functionName} response sent`, "http", {
        status: response.status,
      });

      return response;
    } catch (error) {
      captureException(error, {
        functionName,
        extra: {
          url: req.url,
          method: req.method,
        },
      });

      // Re-throw to let the function handle the error response
      throw error;
    }
  };
}

/**
 * Log a business metric/event that should ALWAYS be recorded
 * Uses captureMessage (not breadcrumbs) to ensure visibility even on success
 */
export function logBusinessEvent(
  eventName: string,
  data?: Record<string, unknown>
) {
  if (!SENTRY_DSN) {
    console.log(`[Sentry] Business event (not sent - no DSN): ${eventName}`, data);
    return;
  }

  Sentry.captureMessage(eventName, {
    level: "info",
    extra: data,
    tags: { event_type: "business_metric" },
  });

  console.log(`[Sentry] Business event logged: ${eventName}`, data);
}

/**
 * @deprecated Use logBusinessEvent for success metrics. Breadcrumbs only appear with errors.
 * Increment a custom metric counter (breadcrumb-based - only visible if error occurs)
 */
export function incrementMetric(
  name: string,
  value: number = 1,
  tags?: Record<string, string>
) {
  if (!SENTRY_DSN) return;

  // WARNING: Breadcrumbs are only sent if an error occurs later
  // For critical business metrics, use logBusinessEvent() instead
  addBreadcrumb(`Metric: ${name}`, "metric", { value, ...tags });
}

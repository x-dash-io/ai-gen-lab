import { trackEvent } from "./analytics";

type AnalyticsValue = string | number | boolean | null | undefined;

function normalizeAnalyticsValue(value: unknown): AnalyticsValue {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null ||
    value === undefined
  ) {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalizeContext(
  context?: Record<string, unknown>
): Record<string, AnalyticsValue> {
  if (!context) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [key, normalizeAnalyticsValue(value)])
  );
}

/**
 * Unified logging utility
 */
export const logger = {
  warn: (message: string, context?: Record<string, unknown>) => {
    console.warn(`[WARN] ${message}`, context || "");

    trackEvent({
      name: "log_warn",
      properties: {
        message,
        ...normalizeContext(context),
      },
    });
  },

  error: (message: string, error?: unknown, context?: Record<string, unknown>) => {
    const errorDetails: Record<string, AnalyticsValue> =
      error instanceof Error
        ? {
            errorMessage: error.message,
            stack: error.stack,
          }
        : {
            error: normalizeAnalyticsValue(error),
          };

    console.error(`[ERROR] ${message}`, errorDetails, context || "");

    trackEvent({
      name: "log_error",
      properties: {
        message,
        ...errorDetails,
        ...normalizeContext(context),
      },
    });
  },

  info: (message: string, context?: Record<string, unknown>) => {
    // Basic console info, not tracking to analytics by default to avoid noise.
    if (process.env.NODE_ENV === "development") {
      console.log(`[INFO] ${message}`, context || "");
    }
  },
};

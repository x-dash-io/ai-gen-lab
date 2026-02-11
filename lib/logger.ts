import { trackEvent } from "./analytics";

/**
 * Unified logging utility
 */
export const logger = {
  warn: (message: string, context?: Record<string, any>) => {
    console.warn(`[WARN] ${message}`, context || "");

    trackEvent({
      name: "log_warn",
      properties: {
        message,
        ...context,
      },
    });
  },

  error: (message: string, error?: unknown, context?: Record<string, any>) => {
    const errorDetails = error instanceof Error ? {
      errorMessage: error.message,
      stack: error.stack,
    } : { error };

    console.error(`[ERROR] ${message}`, errorDetails, context || "");

    trackEvent({
      name: "log_error",
      properties: {
        message,
        ...errorDetails,
        ...context,
      },
    });
  },

  info: (message: string, context?: Record<string, any>) => {
    // Basic console info, not tracking to analytics by default to avoid noise
    if (process.env.NODE_ENV === "development") {
      console.log(`[INFO] ${message}`, context || "");
    }
  }
};

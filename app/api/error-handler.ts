import { handleServerError } from "@/lib/errors";
import { NextResponse } from "next/server";

/**
 * Wrapper for API route handlers with error handling
 */
export function withErrorHandler<T extends any[]>(
  handler: (...args: T) => Promise<Response | NextResponse>
) {
  return async (...args: T): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error: any) {
      // Re-throw Next.js internal errors used for bailing out of prerendering
      if (
        error.digest?.includes("NEXT_PRERENDER_INTERRUPTED") ||
        error.digest?.includes("DYNAMIC_SERVER_USAGE") ||
        error.message?.includes("headers()") ||
        error.message?.includes("cookies()") ||
        error.message?.includes("getServerSession") ||
        error.message?.includes("redirect()") ||
        error.message?.includes("notFound()")
      ) {
        throw error;
      }

      const { message, statusCode, userMessage } = handleServerError(error);
      return NextResponse.json(
        { error: userMessage, code: message },
        { status: statusCode }
      );
    }
  };
}

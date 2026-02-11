import { handleServerError } from "@/lib/errors";
import { NextResponse } from "next/server";

type NextInternalError = {
  digest?: string;
  message?: string;
};

/**
 * Wrapper for API route handlers with error handling
 */
export function withErrorHandler<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<Response | NextResponse>
) {
  return async (...args: TArgs): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error: unknown) {
      const nextError = error as NextInternalError;

      // Re-throw Next.js internal errors used for bailing out of prerendering
      if (
        nextError.digest?.includes("NEXT_PRERENDER_INTERRUPTED") ||
        nextError.digest?.includes("DYNAMIC_SERVER_USAGE") ||
        nextError.message?.includes("headers()") ||
        nextError.message?.includes("cookies()") ||
        nextError.message?.includes("getServerSession") ||
        nextError.message?.includes("redirect()") ||
        nextError.message?.includes("notFound()")
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

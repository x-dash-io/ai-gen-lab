import { NextRequest, NextResponse } from "next/server";

/**
 * Rate limit middleware for API routes
 */
export function withRateLimit(
  limitFn: (identifier: string) => {
    allowed: boolean;
    remaining: number;
    resetAt: number;
  }
) {
  return (request: NextRequest) => {
    // Get identifier (IP address or user ID)
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const result = limitFn(ip);

    if (!result.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests",
          message: "Rate limit exceeded. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": "100",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": new Date(result.resetAt).toISOString(),
            "Retry-After": Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    return null; // Continue with request
  };
}

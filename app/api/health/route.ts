import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "../error-handler";
import { logger } from "@/lib/logger";

type NextInternalError = {
  digest?: string;
  message?: string;
};

export const GET = withErrorHandler(async () => {
  // Force dynamic rendering to prevent static generation failures
  await headers();

  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "healthy" });
  } catch (error: unknown) {
    const nextError = error as NextInternalError;

    // Re-throw Next.js internal errors so withErrorHandler can handle them (bail out)
    if (
      nextError.digest?.startsWith("NEXT_PRERENDER_") ||
      nextError.message?.includes("DYNAMIC_SERVER_USAGE") ||
      nextError.message?.includes("NEXT_PRERENDER_INTERRUPTED")
    ) {
      throw error;
    }

    logger.error("Health check failed", error);
    return NextResponse.json(
      { status: "unhealthy", error: "Database connection failed" },
      { status: 503 }
    );
  }
});

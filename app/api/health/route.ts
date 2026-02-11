import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "../error-handler";
import { logger } from "@/lib/logger";

export const GET = withErrorHandler(async () => {
  // Force dynamic rendering to prevent static generation failures
  await headers();

  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "healthy" });
  } catch (error: any) {
    // Re-throw Next.js internal errors so withErrorHandler can handle them (bail out)
    if (
      error.digest?.startsWith("NEXT_PRERENDER_") ||
      error.message?.includes("DYNAMIC_SERVER_USAGE") ||
      error.message?.includes("NEXT_PRERENDER_INTERRUPTED")
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

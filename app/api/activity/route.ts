import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "../error-handler";
import { AppError } from "@/lib/errors";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw AppError.unauthorized();
  }

  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type");
  const limit = parseInt(searchParams.get("limit") || "50");

  const where = {
    userId: session.user.id,
    ...(type && type !== "all" ? { type } : {}),
  };

  const activity = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  // Fetch course information for purchase activities
  const enrichedActivity = await Promise.all(
    activity.map(async (entry: (typeof activity)[number]) => {
      if (
        entry.type === "purchase_completed" &&
        entry.metadata &&
        typeof entry.metadata === "object" &&
        !Array.isArray(entry.metadata)
      ) {
        const metadata = entry.metadata as Record<string, unknown>;
        const courseId =
          typeof metadata.courseId === "string" ? metadata.courseId : null;

        if (courseId) {
          try {
            const course = await prisma.course.findUnique({
              where: { id: courseId },
              select: { title: true, slug: true },
            });
            if (course) {
              return {
                ...entry,
                metadata: {
                  ...metadata,
                  courseTitle: course.title,
                  courseSlug: course.slug,
                },
              };
            }
          } catch {
            // Continue without enrichment if course fetch fails.
          }
        }
      }
      return entry;
    })
  );

  return NextResponse.json({ activity: enrichedActivity });
});

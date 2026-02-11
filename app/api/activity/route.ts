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

    const where: any = { userId: session.user.id };
    if (type && type !== "all") {
      where.type = type;
    }

    const activity = await prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Fetch course information for purchase activities
    const enrichedActivity = await Promise.all(
      activity.map(async (entry: any) => {
        if (entry.type === "purchase_completed" && entry.metadata) {
          const metadata = entry.metadata as any;
          if (metadata.courseId) {
            try {
              const course = await prisma.course.findUnique({
                where: { id: metadata.courseId },
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
            } catch (error) {
              // Continue without enrichment if course fetch fails
            }
          }
        }
        return entry;
      })
    );

  return NextResponse.json({ activity: enrichedActivity });
});

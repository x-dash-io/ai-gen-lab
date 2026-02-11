import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { checkCloudinaryResourceExists } from "@/lib/cloudinary";

/**
 * Debug endpoint to check if content exists in Cloudinary
 * 
 * Only admins can access this endpoint
 * 
 * Usage:
 * POST /api/debug/content-check
 * {
 *   "lessonId": "lesson_id_here"
 * }
 * 
 * Or check all lessons in a course:
 * POST /api/debug/content-check
 * {
 *   "courseId": "course_id_here"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Only admins can use this
    await requireRole("admin");

    const body = await request.json();
    const { lessonId, courseId } = body;

    if (!lessonId && !courseId) {
      return NextResponse.json(
        { error: "Either lessonId or courseId required" },
        { status: 400 }
      );
    }

    let lessons;

    if (lessonId) {
      console.log(`[DEBUG CONTENT] Checking content for lesson ${lessonId}`);
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: { contents: true },
      });

      if (!lesson) {
        return NextResponse.json(
          { error: "Lesson not found" },
          { status: 404 }
        );
      }

      lessons = [lesson];
    } else {
      console.log(`[DEBUG CONTENT] Checking content for all lessons in course ${courseId}`);
      lessons = await prisma.lesson.findMany({
        where: { Section: { courseId } },
        include: { contents: true },
      });

      if (lessons.length === 0) {
        return NextResponse.json(
          { error: "No lessons found for course" },
          { status: 404 }
        );
      }
    }

    const result = await Promise.all(
      lessons.map(async (lesson: any) => {
        const contentChecks = await Promise.all(
          lesson.contents.map(async (content: any) => {
            let exists = false;
            let error = null;

            if (content.contentUrl) {
              try {
                console.log(`[DEBUG CONTENT] Checking if exists: ${content.contentUrl}`);
                exists = await checkCloudinaryResourceExists(content.contentUrl);
              } catch (e) {
                error = e instanceof Error ? e.message : String(e);
                console.error(`[DEBUG CONTENT] Error checking ${content.contentUrl}:`, error);
              }
            }

            return {
              id: content.id,
              contentType: content.contentType,
              contentUrl: content.contentUrl,
              title: content.title,
              sortOrder: content.sortOrder,
              existsInCloudinary: exists,
              error,
            };
          })
        );

        return {
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          contentCount: lesson.contents.length,
          allContentExists: contentChecks.every(c => !c.contentUrl || c.existsInCloudinary),
          missingContent: contentChecks.filter(c => c.contentUrl && !c.existsInCloudinary),
          contents: contentChecks,
        };
      })
    );

    const summary = {
      lessonsChecked: result.length,
      lessonsWithMissingContent: result.filter((l: any) => !l.allContentExists).length,
      totalContentItems: result.reduce((sum: number, l: any) => sum + l.contentCount, 0),
      missingContentItems: result.reduce((sum: number, l: any) => sum + l.missingContent.length, 0),
    };

    return NextResponse.json({
      summary,
      details: result,
    });
  } catch (error) {
    console.error("[DEBUG CONTENT] Error checking content:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Error checking content",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: error instanceof Error && error.message.includes("FORBIDDEN") ? 403 : 500 }
    );
  }
}

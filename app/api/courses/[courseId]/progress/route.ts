import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/access";
import { getCourseForLibraryBySlug } from "@/lib/courses";
import { hasCourseAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { courseProgressSchema, validateRequestBody } from "@/lib/validation";
import { getCachedProgress, setCachedProgress, updateCachedLessonProgress } from "@/lib/progress-cache";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;

    // Validate input
    const validation = validateRequestBody(courseProgressSchema, { courseId });
    if (!validation.success) {
      return validation.response;
    }

    const user = await requireUser();

    // Check cache first
    const cachedProgress = getCachedProgress(user.id, courseId);
    if (cachedProgress) {
      return NextResponse.json({
        courseId,
        ...cachedProgress,
      });
    }

    // Get course by slug or ID
    const course = await getCourseForLibraryBySlug(courseId);
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Check access
    const hasAccess = await hasCourseAccess(user.id, user.role, course.id);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get all lesson IDs
    const lessonIds = course.sections.flatMap((section) =>
      section.lessons.map((lesson) => lesson.id)
    );

    // Get progress for all lessons
    const progressEntries = lessonIds.length === 0
      ? []
      : await prisma.progress.findMany({
        where: {
          userId: user.id,
          lessonId: { in: lessonIds }
        },
      });

    // Calculate progress
    const totalLessons = lessonIds.length;
    const completedLessons = progressEntries.filter((p) => p.completedAt != null).length;
    const overallProgress = totalLessons > 0
      ? Math.round((completedLessons / totalLessons) * 100)
      : 0;

    // Format lessons progress
    const lessons = lessonIds.map(lessonId => {
      const progress = progressEntries.find(p => p.lessonId === lessonId);
      return {
        lessonId,
        completedAt: progress?.completedAt?.toISOString() || null,
        completionPercent: progress?.completionPercent || 0,
        lastPosition: progress?.lastPosition || 0,
      };
    });

    const progressData = {
      courseId: course.id,
      totalLessons,
      completedLessons,
      overallProgress,
      lessons,
      isCompleted: overallProgress === 100,
      lastUpdated: Date.now(),
    };

    // Cache the result
    setCachedProgress(user.id, courseId, progressData);

    return NextResponse.json(progressData);

  } catch (error) {
    console.error("Error fetching course progress:", error);
    return NextResponse.json(
      { error: "Failed to fetch progress" },
      { status: 500 }
    );
  }
}

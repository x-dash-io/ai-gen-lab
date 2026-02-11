"use server";

import { prisma, withRetry } from "@/lib/prisma";
import { requireCustomer, hasCourseAccess } from "@/lib/access";

export async function updateLessonProgress(
  lessonId: string,
  data: {
    startedAt?: Date;
    completedAt?: Date;
    lastPosition?: number;
    completionPercent?: number;
  }
) {
  const user = await requireCustomer();

  // Verify lesson access
  const lesson = await withRetry(async () => {
    return prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        Section: {
          select: {
            courseId: true,
          },
        },
      },
    });
  });

  if (!lesson) {
    throw new Error("NOT_FOUND");
  }

  const hasAccess = await hasCourseAccess(
    user.id,
    user.role,
    lesson.Section.courseId
  );

  if (!hasAccess) {
    throw new Error("FORBIDDEN");
  }

  // Update or create progress
  return withRetry(async () => {
    return prisma.progress.upsert({
      where: {
        userId_lessonId: {
          userId: user.id,
          lessonId,
        },
      },
      create: {
        id: `${user.id}-${lessonId}-${Date.now()}`, // Generate unique ID
        userId: user.id,
        lessonId,
        startedAt: data.startedAt || new Date(),
        completedAt: data.completedAt,
        lastPosition: data.lastPosition ?? 0,
        completionPercent: data.completionPercent ?? 0,
        updatedAt: new Date(),
      },
      update: {
        startedAt: data.startedAt,
        completedAt: data.completedAt,
        lastPosition: data.lastPosition,
        completionPercent: data.completionPercent,
        updatedAt: new Date(),
      },
    });
  });
}

export async function getLessonProgress(lessonId: string) {
  const user = await requireCustomer();

  return withRetry(async () => {
    return prisma.progress.findUnique({
      where: {
        userId_lessonId: {
          userId: user.id,
          lessonId,
        },
      },
    });
  });
}

export async function getCourseProgress(courseId: string) {
  const user = await requireCustomer();

  // Get all lessons in the course
  const course = await withRetry(async () => {
    return prisma.course.findUnique({
      where: { id: courseId },
      include: {
        sections: {
          include: {
            lessons: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });
  });

  if (!course) {
    throw new Error("NOT_FOUND");
  }

  const lessonIds = course.sections.flatMap((s) =>
    s.lessons.map((l) => l.id)
  );

  const progressRecords = await withRetry(async () => {
    return prisma.progress.findMany({
      where: {
        userId: user.id,
        lessonId: { in: lessonIds },
      },
    });
  });

  const totalLessons = lessonIds.length;
  const completedLessons = progressRecords.filter(
    (p) => p.completedAt != null
  ).length;
  const completionPercent =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return {
    totalLessons,
    completedLessons,
    completionPercent,
    progressRecords,
  };
}

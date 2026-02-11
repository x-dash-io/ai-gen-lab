"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/access";
import { getUserSubscription } from "@/lib/subscriptions";

export async function getAllPublishedLearningPaths() {
  return prisma.learningPath.findMany({
    include: {
      courses: {
        where: {
          Course: {
            isPublished: true,
          },
        },
        include: {
          Course: {
            select: {
              id: true,
              title: true,
              slug: true,
              description: true,
              priceCents: true,
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
      _count: {
        select: {
          courses: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getLearningPathBySlug(slugOrId: string) {
  // Try to find by slug first, then by id (for backward compatibility)
  let path = await prisma.learningPath.findUnique({
    where: { slug: slugOrId },
    include: {
      courses: {
        where: {
          Course: {
            isPublished: true,
          },
        },
        include: {
          Course: {
            select: {
              id: true,
              title: true,
              slug: true,
              description: true,
              priceCents: true,
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  // If not found by slug, try by id
  if (!path) {
    path = await prisma.learningPath.findUnique({
      where: { id: slugOrId },
      include: {
        courses: {
          where: {
            Course: {
              isPublished: true,
            },
          },
          include: {
            Course: {
              select: {
                id: true,
                title: true,
                slug: true,
                description: true,
                priceCents: true,
              },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
  }

  return path;
}

/**
 * Calculate the price user will pay for a learning path (excluding already purchased courses)
 */
export async function calculateLearningPathPrice(userId: string, pathId: string): Promise<{
  fullPriceCents: number;
  adjustedPriceCents: number;
  alreadyPurchasedCents: number;
  coursesToPurchase: number;
  totalCourses: number;
}> {
  const path = await prisma.learningPath.findUnique({
    where: { id: pathId },
    include: {
      courses: {
        include: {
          Course: {
            select: {
              id: true,
              priceCents: true,
            },
          },
        },
      },
    },
  });

  if (!path || path.courses.length === 0) {
    return {
      fullPriceCents: 0,
      adjustedPriceCents: 0,
      alreadyPurchasedCents: 0,
      coursesToPurchase: 0,
      totalCourses: 0,
    };
  }

  const courseIds = path.courses.map((pc) => pc.Course.id);
  const existingPurchases = await prisma.purchase.findMany({
    where: {
      userId,
      courseId: { in: courseIds },
      status: "paid",
    },
  });

  const existingCourseIds = new Set(existingPurchases.map((p) => p.courseId));

  const fullPriceCents = path.courses.reduce((sum, pc) => sum + pc.Course.priceCents, 0);
  const alreadyPurchasedCents = path.courses
    .filter((pc) => existingCourseIds.has(pc.Course.id))
    .reduce((sum, pc) => sum + pc.Course.priceCents, 0);
  const adjustedPriceCents = fullPriceCents - alreadyPurchasedCents;
  const coursesToPurchase = path.courses.filter((pc) => !existingCourseIds.has(pc.Course.id)).length;

  return {
    fullPriceCents,
    adjustedPriceCents,
    alreadyPurchasedCents,
    coursesToPurchase,
    totalCourses: path.courses.length,
  };
}

/**
 * Check if user has enrolled in all courses in a learning path
 */
export async function hasEnrolledInLearningPath(userId: string, pathId: string): Promise<boolean> {
  // Elite subscribers only get access to all learning paths
  const subscription = await getUserSubscription(userId);
  if (subscription && subscription.plan.tier === "founder") {
    return true;
  }

  const path = await prisma.learningPath.findUnique({
    where: { id: pathId },
    include: {
      courses: {
        include: {
          Course: {
            select: { id: true },
          },
        },
      },
    },
  });

  if (!path || path.courses.length === 0) {
    return false;
  }

  const courseIds = path.courses.map((pc) => pc.Course.id);
  const purchases = await prisma.purchase.findMany({
    where: {
      userId,
      courseId: { in: courseIds },
      status: "paid",
    },
  });

  return purchases.length === courseIds.length;
}

/**
 * Core logic for creating learning path purchases
 * Extracted for performance optimization and testing
 */
export async function createLearningPathPurchasesCore(userId: string, pathId: string) {
  const path = await prisma.learningPath.findUnique({
    where: { id: pathId },
    include: {
      courses: {
        include: {
          Course: {
            select: {
              id: true,
              title: true,
              priceCents: true,
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!path || path.courses.length === 0) {
    throw new Error("Learning path not found or has no courses");
  }

  // Check existing purchases
  const courseIds = path.courses.map((pc) => pc.Course.id);
  const existingPurchases = await prisma.purchase.findMany({
    where: {
      userId,
      courseId: { in: courseIds },
    },
  });

  const paidCourseIds = new Set(
    existingPurchases
      .filter((p) => p.status === "paid")
      .map((p) => p.courseId)
  );

  const coursesToPurchase = path.courses.filter(
    (pc) => !paidCourseIds.has(pc.Course.id)
  );

  if (coursesToPurchase.length === 0) {
    throw new Error("You have already enrolled in all courses in this path");
  }

  // Split into create and update
  const existingPurchaseMap = new Map(
    existingPurchases.map((p) => [p.courseId, p])
  );

  const toCreate: Array<{ id: string; userId: string; courseId: string; amountCents: number; currency: string; status: string; provider: string; }> = [];
  const toUpdateIds: string[] = [];

  for (const pc of coursesToPurchase) {
    if (existingPurchaseMap.has(pc.Course.id)) {
      toUpdateIds.push(pc.Course.id);
    } else {
      toCreate.push({
        id: `purchase_${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${toCreate.length}`,
        userId,
        courseId: pc.Course.id,
        amountCents: pc.Course.priceCents,
        currency: "usd",
        status: "pending",
        provider: "paypal",
      });
    }
  }

  if (toCreate.length > 0) {
    await prisma.purchase.createMany({
      data: toCreate,
    });
  }

  if (toUpdateIds.length > 0) {
    await prisma.purchase.updateMany({
      where: {
        userId,
        courseId: { in: toUpdateIds },
      },
      data: {
        status: "pending",
        provider: "paypal",
      },
    });
  }

  // Fetch final results
  const allRelevantCourseIds = coursesToPurchase.map((pc) => pc.Course.id);
  const purchases = await prisma.purchase.findMany({
    where: {
      userId,
      courseId: { in: allRelevantCourseIds },
    },
  });

  return {
    purchases,
    totalAmountCents: coursesToPurchase.reduce(
      (sum, pc) => sum + pc.Course.priceCents,
      0
    ),
  };
}

/**
 * Create purchases for all courses in a learning path
 */
export async function createLearningPathPurchases(userId: string, pathId: string) {
  const user = await requireUser();
  if (user.id !== userId) {
    throw new Error("FORBIDDEN: You can only enroll yourself");
  }

  return createLearningPathPurchasesCore(userId, pathId);
}

/**
 * Calculate user's progress through a learning path
 */
export async function getLearningPathProgress(userId: string, pathId: string): Promise<{
  totalCourses: number;
  completedCount: number;
  inProgressCount: number;
  notStartedCount: number;
  progressPercent: number;
  courses: Array<{
    id: string;
    title: string;
    status: 'completed' | 'in-progress' | 'not-started';
  }>;
} | null> {
  const path = await prisma.learningPath.findUnique({
    where: { id: pathId },
    include: {
      courses: {
        include: {
          Course: {
            select: { id: true, title: true },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!path) {
    return null;
  }

  const totalCourses = path.courses.length;

  let completedCount = 0;
  let inProgressCount = 0;

  // Helper function to check if user completed a course
  async function userCompletedCourse(userId: string, courseId: string): Promise<boolean> {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        sections: {
          include: {
            lessons: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!course) return false;

    const lessonIds = course.sections.flatMap((s) => s.lessons.map((l) => l.id));
    if (lessonIds.length === 0) return false;

    const progressRecords = await prisma.progress.findMany({
      where: {
        userId,
        lessonId: { in: lessonIds },
      },
    });

    return progressRecords.length === lessonIds.length;
  }

  const coursesProgress = await Promise.all(
    path.courses.map(async (pc) => {
      const courseId = pc.Course.id;
      // Check if course is completed
      const isCompleted = await userCompletedCourse(userId, courseId);

      if (isCompleted) {
        completedCount++;
        return {
          id: courseId,
          title: pc.Course.title,
          status: 'completed' as const,
        };
      }

      // Check if course is in progress (has any progress)
      const hasProgress = await prisma.progress.findFirst({
        where: {
          userId,
          Lesson: {
            Section: {
              courseId: courseId,
            },
          },
        },
      });

      if (hasProgress) {
        inProgressCount++;
        return {
          id: courseId,
          title: pc.Course.title,
          status: 'in-progress' as const,
        };
      }

      return {
        id: courseId,
        title: pc.Course.title,
        status: 'not-started' as const,
      };
    })
  );

  const progressPercent = totalCourses > 0 ? Math.round((completedCount / totalCourses) * 100) : 0;

  return {
    totalCourses,
    completedCount,
    inProgressCount,
    notStartedCount: totalCourses - completedCount - inProgressCount,
    progressPercent,
    courses: coursesProgress,
  };
}

/**
 * Check if user has completed a learning path
 */
export async function hasCompletedLearningPath(userId: string, pathId: string): Promise<boolean> {
  const progress = await getLearningPathProgress(userId, pathId);
  if (!progress) return false;
  return progress.progressPercent === 100;
}

"use server";

import { prisma } from "@/lib/prisma";
import { hasCourseAccess, requireCustomer } from "@/lib/access";

const MIN_COMPLETION_FOR_REVIEW = 50; // Minimum 50% completion required to review

export async function getCourseReviews(courseId: string) {
  return prisma.review.findMany({
    where: { courseId },
    include: {
      User: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCourseReviewStats(courseId: string) {
  const [aggregates, distribution] = await Promise.all([
    prisma.review.aggregate({
      where: { courseId },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.review.groupBy({
      by: ["rating"],
      where: { courseId },
      _count: { id: true },
    }),
  ]);

  const totalReviews = aggregates._count._all;

  if (totalReviews === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    };
  }

  const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  distribution.forEach((group: (typeof distribution)[number]) => {
    const rating = group.rating as keyof typeof ratingDistribution;
    if (rating >= 1 && rating <= 5) {
      ratingDistribution[rating] = group._count.id;
    }
  });

  const averageRating = aggregates._avg.rating || 0;

  return {
    averageRating: Math.round(averageRating * 10) / 10,
    totalReviews,
    ratingDistribution,
  };
}

export async function getUserReview(courseId: string, userId: string) {
  return prisma.review.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId,
      },
    },
    include: {
      User: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });
}

export async function createReview(
  courseId: string,
  data: { rating: number; text?: string | null }
) {
  const user = await requireCustomer();

  // Verify user has access to the course (purchase or eligible subscription)
  const hasAccess = await hasCourseAccess(user.id, user.role, courseId);
  if (!hasAccess) {
    throw new Error("FORBIDDEN: You must have access to the course before reviewing");
  }

  // Verify user has completed minimum percentage of the course
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

  if (!course) {
    throw new Error("Course not found");
  }

  const lessonIds = course.sections.flatMap((s: (typeof course.sections)[number]) =>
    s.lessons.map((l: (typeof s.lessons)[number]) => l.id)
  );
  const totalLessons = lessonIds.length;

  if (totalLessons > 0) {
    const progressRecords = await prisma.progress.findMany({
      where: {
        userId: user.id,
        lessonId: { in: lessonIds },
        completedAt: { not: null },
      },
    });

    const completedLessons = progressRecords.length;
    const completionPercent = Math.round((completedLessons / totalLessons) * 100);

    if (completionPercent < MIN_COMPLETION_FOR_REVIEW) {
      throw new Error(
        `You must complete at least ${MIN_COMPLETION_FOR_REVIEW}% of the course before reviewing. Current progress: ${completionPercent}%`
      );
    }
  }

  // Check if review already exists
  const existingReview = await prisma.review.findUnique({
    where: {
      userId_courseId: {
        userId: user.id,
        courseId,
      },
    },
  });

  if (existingReview) {
    throw new Error("You have already reviewed this course");
  }

  // Validate rating
  if (data.rating < 1 || data.rating > 5) {
    throw new Error("Rating must be between 1 and 5");
  }

  return prisma.review.create({
    data: {
      id: `review_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userId: user.id,
      courseId,
      rating: data.rating,
      text: data.text?.trim() || null,
    },
    include: {
      User: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });
}

export async function updateReview(
  reviewId: string,
  data: { rating?: number; text?: string | null }
) {
  const user = await requireCustomer();

  // Verify review belongs to user
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw new Error("Review not found");
  }

  if (review.userId !== user.id) {
    throw new Error("FORBIDDEN: You can only update your own reviews");
  }

  // Validate rating if provided
  if (data.rating !== undefined && (data.rating < 1 || data.rating > 5)) {
    throw new Error("Rating must be between 1 and 5");
  }

  return prisma.review.update({
    where: { id: reviewId },
    data: {
      rating: data.rating,
      text: data.text?.trim() || null,
    },
    include: {
      User: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });
}

export async function deleteReview(reviewId: string) {
  const user = await requireCustomer();

  // Verify review belongs to user
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw new Error("Review not found");
  }

  if (review.userId !== user.id) {
    throw new Error("FORBIDDEN: You can only delete your own reviews");
  }

  return prisma.review.delete({
    where: { id: reviewId },
  });
}

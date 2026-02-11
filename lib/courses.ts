import { prisma, withRetry } from "@/lib/prisma";
import { getCached, cacheKeys } from "@/lib/cache";

export async function getPublishedCourses() {
  return withRetry(async () => {
    return prisma.course.findMany({
      where: { isPublished: true },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        category: true, // Keep for backward compat if needed, but rely on relation
        categoryId: true, // Ensure we get the FK
        Category: { // Fetch the relation to get the slug
          select: {
            slug: true,
            name: true
          }
        },
        priceCents: true,
        tier: true,
        inventory: true,
        imageUrl: true,
      },
      orderBy: { createdAt: "desc" },
    });
  });
}

export async function getPublishedCoursesByCategory(category: string) {
  return withRetry(async () => {
    return prisma.course.findMany({
      where: { isPublished: true, category },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        category: true,
        priceCents: true,
        tier: true,
        inventory: true,
        imageUrl: true,
      },
      orderBy: { createdAt: "desc" },
    });
  });
}

export async function getCoursePreviewBySlug(slug: string) {
  const course = await withRetry(async () => {
    return prisma.course.findFirst({
      where: { slug, isPublished: true },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        priceCents: true,
        tier: true,
        imageUrl: true,
        sections: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            title: true,
            lessons: {
              orderBy: { sortOrder: "asc" },
              select: {
                id: true,
                title: true,
                isLocked: true,
                contents: {
                  orderBy: { sortOrder: "asc" },
                  take: 1,
                  select: {
                    contentType: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  });
  return course;
}

export async function getCourseForLibraryBySlug(slug: string) {
  return withRetry(async () => {
    return prisma.course.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        title: true,
        tier: true,
        imageUrl: true,
        sections: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            title: true,
            lessons: {
              orderBy: { sortOrder: "asc" },
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });
  });
}

export async function getLessonById(lessonId: string) {
  return withRetry(async () => {
    return prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        Section: {
          include: {
            Course: true,
          },
        },
      },
    });
  });
}

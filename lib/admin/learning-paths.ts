"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";

export async function getAllLearningPaths() {
  return prisma.learningPath.findMany({
    include: {
      courses: {
        include: {
          Course: {
            select: {
              id: true,
              title: true,
              slug: true,
              description: true,
              priceCents: true,
              isPublished: true,
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

export async function getLearningPathById(pathId: string) {
  return prisma.learningPath.findUnique({
    where: { id: pathId },
    include: {
      courses: {
        include: {
          Course: {
            select: {
              id: true,
              title: true,
              slug: true,
              description: true,
              priceCents: true,
              isPublished: true,
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50) + "-" + Date.now().toString(36);
}

export async function createLearningPath(data: {
  title: string;
  description?: string;
  slug?: string;
}) {
  await requireRole("admin");

  const pathId = `path_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const slug = data.slug || generateSlug(data.title);
  const now = new Date();

  return prisma.learningPath.create({
    data: {
      id: pathId,
      slug,
      title: data.title,
      description: data.description,
      updatedAt: now,
    },
  });
}

export async function updateLearningPath(
  pathId: string,
  formData: FormData
) {
  await requireRole("admin");

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const imageUrl = formData.get("imageUrl") as string;

  return prisma.learningPath.update({
    where: { id: pathId },
    data: {
      title,
      description,
      imageUrl,
    },
  });
}

export async function deleteLearningPath(pathId: string) {
  await requireRole("admin");

  return prisma.learningPath.delete({
    where: { id: pathId },
  });
}

export async function addCourseToPath(
  pathId: string,
  courseId: string,
  sortOrder?: number
) {
  await requireRole("admin");

  // Get max sort order if not provided
  if (sortOrder === undefined) {
    const path = await prisma.learningPath.findUnique({
      where: { id: pathId },
      include: {
        courses: {
          orderBy: { sortOrder: "desc" },
          take: 1,
        },
      },
    });

    sortOrder = path?.courses[0]?.sortOrder
      ? path.courses[0].sortOrder + 1
      : 0;
  }

  return prisma.learningPathCourse.create({
    data: {
      id: `lpc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      learningPathId: pathId,
      courseId,
      sortOrder,
    },
    include: {
      Course: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
    },
  });
}

export async function removeCourseFromPath(pathId: string, courseId: string) {
  await requireRole("admin");

  return prisma.learningPathCourse.deleteMany({
    where: {
      learningPathId: pathId,
      courseId,
    },
  });
}

export async function updateCourseOrder(
  pathId: string,
  courseOrders: { courseId: string; sortOrder: number }[]
) {
  await requireRole("admin");

  // Update all course orders in a transaction
  await prisma.$transaction(
    courseOrders.map(({ courseId, sortOrder }) =>
      prisma.learningPathCourse.updateMany({
        where: {
          learningPathId: pathId,
          courseId,
        },
        data: { sortOrder },
      })
    )
  );
}

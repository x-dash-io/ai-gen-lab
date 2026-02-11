"use server";

import { prisma, withRetry } from "@/lib/prisma";
import { requireRole } from "@/lib/access";

export type CategoryInput = {
  name: string;
  slug?: string;
  description?: string;
  icon?: string;
  color?: string;
  isActive?: boolean;
};

/**
 * Generate slug from name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Get all categories (admin view)
 */
export async function getAllCategories() {
  await requireRole("admin");

  return withRetry(async () => {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        _count: {
          select: { courses: true },
        },
      },
    });

    return categories.map((cat: (typeof categories)[number]) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      icon: cat.icon,
      color: cat.color,
      sortOrder: cat.sortOrder,
      isActive: cat.isActive,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
      courseCount: cat._count.courses,
    }));
  });
}

/**
 * Create a new category
 */
export async function createCategory(data: CategoryInput) {
  await requireRole("admin");

  const slug = data.slug || generateSlug(data.name);

  // Check if slug already exists
  const existing = await prisma.category.findUnique({
    where: { slug },
  });

  if (existing) {
    throw new Error("SLUG_EXISTS");
  }

  // Get max sort order
  const maxSortOrder = await prisma.category.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const category = await withRetry(async () => {
    return prisma.category.create({
      data: {
        id: `cat_${slug}_${Date.now()}`,
        name: data.name,
        slug,
        description: data.description,
        icon: data.icon,
        color: data.color,
        isActive: data.isActive ?? true,
        sortOrder: (maxSortOrder?.sortOrder ?? 0) + 1,
      },
    });
  });

  // Revalidate cache
  // revalidateTag removed

  // Return in same format as getAllCategories
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    icon: category.icon,
    color: category.color,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
    courseCount: 0,
  };
}

/**
 * Update a category
 */
export async function updateCategory(id: string, data: Partial<CategoryInput>) {
  await requireRole("admin");

  // If slug is being updated, check uniqueness
  if (data.slug) {
    const existing = await prisma.category.findFirst({
      where: {
        slug: data.slug,
        NOT: { id },
      },
    });

    if (existing) {
      throw new Error("SLUG_EXISTS");
    }
  }

  const category = await withRetry(async () => {
    return prisma.category.update({
      where: { id },
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        icon: data.icon,
        color: data.color,
        isActive: data.isActive,
      },
      include: {
        _count: {
          select: { courses: true },
        },
      },
    });
  });

  // Revalidate cache
  // revalidateTag removed

  // Return in same format as getAllCategories
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    icon: category.icon,
    color: category.color,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
    courseCount: category._count.courses,
  };
}

/**
 * Delete a category (soft delete if courses exist)
 */
export async function deleteCategory(id: string) {
  await requireRole("admin");

  // Check if any courses use this category
  const courseCount = await prisma.course.count({
    where: { categoryId: id },
  });

  if (courseCount > 0) {
    // Soft delete: set isActive to false
    await withRetry(async () => {
      return prisma.category.update({
        where: { id },
        data: { isActive: false },
      });
    });

    // Revalidate cache
    // revalidateTag removed

    return { deleted: false, deactivated: true, courseCount };
  }

  // Hard delete if no courses
  await withRetry(async () => {
    return prisma.category.delete({
      where: { id },
    });
  });

  // Revalidate cache
  // revalidateTag removed

  return { deleted: true, deactivated: false, courseCount: 0 };
}

/**
 * Reorder categories
 */
export async function reorderCategories(
  categories: Array<{ id: string; sortOrder: number }>
) {
  await requireRole("admin");

  await withRetry(async () => {
    return prisma.$transaction(
      categories.map((cat) =>
        prisma.category.update({
          where: { id: cat.id },
          data: { sortOrder: cat.sortOrder },
        })
      )
    );
  });

  // Revalidate cache
  // revalidateTag removed

  return { success: true };
}

/**
 * Toggle category active status
 */
export async function toggleCategoryStatus(id: string) {
  await requireRole("admin");

  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: {
        select: { courses: true },
      },
    },
  });

  if (!category) {
    throw new Error("NOT_FOUND");
  }

  const updated = await withRetry(async () => {
    return prisma.category.update({
      where: { id },
      data: { isActive: !category.isActive },
      include: {
        _count: {
          select: { courses: true },
        },
      },
    });
  });

  // Revalidate cache
  // revalidateTag removed

  // Return in same format as getAllCategories
  return {
    id: updated.id,
    name: updated.name,
    slug: updated.slug,
    description: updated.description,
    icon: updated.icon,
    color: updated.color,
    sortOrder: updated.sortOrder,
    isActive: updated.isActive,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
    courseCount: updated._count.courses,
  };
}

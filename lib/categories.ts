"use server";

import { prisma, withRetry } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CategoryWithCourseCount = Category & {
  courseCount: number;
};

/**
 * Get all active categories (cached for 5 minutes)
 */
export const getActiveCategories = unstable_cache(
  async (): Promise<Category[]> => {
    return withRetry(async () => {
      return prisma.category.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      });
    });
  },
  ["active-categories"],
  {
    revalidate: 300, // 5 minutes
    tags: ["categories"],
  }
);

/**
 * Get all active categories with course count
 */
export async function getActiveCategoriesWithCount(): Promise<
  CategoryWithCourseCount[]
> {
  return withRetry(async () => {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
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
 * Get category by slug
 */
export async function getCategoryBySlug(
  slug: string
): Promise<Category | null> {
  return withRetry(async () => {
    return prisma.category.findUnique({
      where: { slug },
    });
  });
}

/**
 * Get category by ID
 */
export async function getCategoryById(id: string): Promise<Category | null> {
  return withRetry(async () => {
    return prisma.category.findUnique({
      where: { id },
    });
  });
}

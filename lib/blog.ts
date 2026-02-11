import { prisma, withRetry } from "@/lib/prisma";

export async function getPublishedPosts(options: { tag?: string; search?: string } = {}) {
  const { tag, search } = options;

  const where = {
    status: "published",
    ...(tag ? { tags: { some: { slug: tag } } } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { content: { contains: search, mode: "insensitive" } },
            { excerpt: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  return withRetry(async () => {
    return prisma.blogPost.findMany({
      where,
      include: {
        tags: true,
        _count: {
          select: { reviews: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  });
}

export async function getPostBySlug(slug: string) {
  return withRetry(async () => {
    return prisma.blogPost.findUnique({
      where: { slug },
      include: {
        tags: true,
        reviews: {
          include: {
            User: {
              select: {
                name: true,
                image: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  });
}

export async function getBlogTags() {
  return withRetry(async () => {
    return prisma.blogTag.findMany({
      orderBy: { name: "asc" },
    });
  });
}

export async function incrementPostViews(postId: string) {
  return withRetry(async () => {
    return prisma.blogPost.update({
      where: { id: postId },
      data: {
        views: { increment: 1 },
      },
    });
  });
}

export function estimateReadTime(content: string): number {
  const wordsPerMinute = 200;
  const noOfWords = content.split(/\s+/g).length;
  const minutes = noOfWords / wordsPerMinute;
  return Math.max(1, Math.ceil(minutes));
}

import { prisma, withRetry } from "@/lib/prisma";
import { estimateReadTime } from "../blog";

export async function getAllPosts() {
  return withRetry(async () => {
    return prisma.blogPost.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        createdAt: true,
        views: true,
        readTimeMinutes: true,
        tags: true,
        _count: {
          select: { reviews: true },
        },
        // Exclude content and excerpt to prevent payload issues
      },
      orderBy: { createdAt: "desc" },
    });
  });
}

export async function getPostForEdit(postId: string) {
  return withRetry(async () => {
    return prisma.blogPost.findUnique({
      where: { id: postId },
      include: {
        tags: true,
      },
    });
  });
}

export async function createPost(data: {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  status?: "draft" | "published";
  tags?: string[];
}) {
  const readTimeMinutes = estimateReadTime(data.content);

  return withRetry(async () => {
    return prisma.blogPost.create({
      data: {
        title: data.title,
        slug: data.slug,
        content: data.content,
        excerpt: data.excerpt,
        featuredImage: data.featuredImage,
        status: data.status || "draft",
        readTimeMinutes,
        tags: {
          connectOrCreate: data.tags?.map(tagName => ({
            where: { name: tagName },
            create: {
              name: tagName,
              slug: tagName.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\w-]+/g, "")
            }
          })) || []
        }
      },
    });
  });
}

export async function updatePost(
  postId: string,
  data: {
    title?: string;
    slug?: string;
    content?: string;
    excerpt?: string;
    featuredImage?: string;
    status?: "draft" | "published";
    tags?: string[];
  }
) {
  const { tags, ...otherData } = data;
  const updateData: any = { ...otherData };

  if (data.content) {
    updateData.readTimeMinutes = estimateReadTime(data.content);
  }

  if (tags) {
    updateData.tags = {
      set: [], // Clear existing tags
      connectOrCreate: tags.map(tagName => ({
        where: { name: tagName },
        create: {
          name: tagName,
          slug: tagName.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\w-]+/g, "")
        }
      }))
    };
  }

  return withRetry(async () => {
    return prisma.blogPost.update({
      where: { id: postId },
      data: updateData as any,
    });
  });
}

export async function deletePost(postId: string) {
  return withRetry(async () => {
    return prisma.blogPost.delete({
      where: { id: postId },
    });
  });
}

export async function getTags() {
  return withRetry(async () => {
    return prisma.blogTag.findMany({
      orderBy: { name: "asc" },
    });
  });
}

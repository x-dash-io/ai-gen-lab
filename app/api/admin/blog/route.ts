import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/access";
import { createPost, getAllPosts } from "@/lib/admin/blog";
import { withErrorHandler } from "@/app/api/error-handler";
import { AppError } from "@/lib/errors";

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireRole("admin");
  const posts = await getAllPosts();
  return NextResponse.json({ posts });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  await requireRole("admin");
  const data = await request.json();

  if (!data.title || !data.slug || !data.content) {
    throw AppError.badRequest("Title, slug, and content are required");
  }

  const post = await createPost(data);
  return NextResponse.json({ post }, { status: 201 });
});

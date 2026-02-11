import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, withRetry } from "@/lib/prisma";
import { withErrorHandler } from "@/app/api/error-handler";
import { AppError } from "@/lib/errors";

export const POST = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw AppError.unauthorized("You must be signed in to review");
  }

  const { postId } = await params;
  const { rating, text } = await request.json();

  if (!rating || rating < 1 || rating > 5) {
    throw AppError.badRequest("Rating must be between 1 and 5");
  }

  const review = await withRetry(async () => {
    return prisma.blogReview.upsert({
      where: {
        userId_blogPostId: {
          userId: session.user.id,
          blogPostId: postId,
        },
      },
      update: {
        rating,
        text,
        createdAt: new Date(),
      },
      create: {
        userId: session.user.id,
        blogPostId: postId,
        rating,
        text,
      },
    });
  });

  return NextResponse.json({ review });
});

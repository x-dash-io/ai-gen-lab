import { NextRequest, NextResponse } from "next/server";
import { getUserReview } from "@/lib/reviews";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withErrorHandler } from "@/app/api/error-handler";
import { headers } from "next/headers";

export const GET = withErrorHandler(async (request: NextRequest) => {
  // Force dynamic rendering
  await headers();

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("courseId");
  const userId = searchParams.get("userId") || session.user.id;

  if (!courseId) {
    return NextResponse.json(
      { error: "courseId is required" },
      { status: 400 }
    );
  }

  // Users can only view their own reviews
  if (userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const review = await getUserReview(courseId, userId);
  return NextResponse.json({ review });
});

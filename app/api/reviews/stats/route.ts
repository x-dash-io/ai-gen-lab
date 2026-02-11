import { NextRequest, NextResponse } from "next/server";
import { getCourseReviewStats } from "@/lib/reviews";
import { withErrorHandler } from "@/app/api/error-handler";
import { headers } from "next/headers";

export const GET = withErrorHandler(async (request: NextRequest) => {
  // Force dynamic rendering
  await headers();

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("courseId");

  if (!courseId) {
    return NextResponse.json(
      { error: "courseId is required" },
      { status: 400 }
    );
  }

  const stats = await getCourseReviewStats(courseId);
  return NextResponse.json(stats);
});

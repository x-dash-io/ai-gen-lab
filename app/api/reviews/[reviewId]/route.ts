import { NextRequest, NextResponse } from "next/server";
import { updateReview, deleteReview } from "@/lib/reviews";
import { reviewSchema, safeParse } from "@/lib/validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const { reviewId } = await params;
    const body = await request.json();
    const { rating, text } = body;

    // Validate input
    const validation = safeParse(reviewSchema, { rating, text });
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const review = await updateReview(reviewId, validation.data);
    return NextResponse.json({ review });
  } catch (error) {
    console.error("Error updating review:", error);

    if (error instanceof Error) {
      if (error.message.includes("FORBIDDEN")) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      if (error.message.includes("not found")) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }

    return NextResponse.json(
      { error: "Failed to update review" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const { reviewId } = await params;
    await deleteReview(reviewId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting review:", error);

    if (error instanceof Error) {
      if (error.message.includes("FORBIDDEN")) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      if (error.message.includes("not found")) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }

    return NextResponse.json(
      { error: "Failed to delete review" },
      { status: 500 }
    );
  }
}

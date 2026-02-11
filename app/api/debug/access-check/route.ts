import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";

/**
 * Debug endpoint to check if a user has access to a course
 * 
 * Only admins can access this endpoint
 * 
 * Usage:
 * POST /api/debug/access-check
 * {
 *   "userId": "user_id_here",
 *   "courseId": "course_id_here"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Only admins can use this
    await requireRole("admin");

    const body = await request.json();
    const { userId, courseId } = body;

    if (!userId || !courseId) {
      return NextResponse.json(
        { error: "userId and courseId required" },
        { status: 400 }
      );
    }

    console.log(`[DEBUG ACCESS] Checking access for user ${userId} to course ${courseId}`);

    // Check purchase
    const purchase = await prisma.purchase.findFirst({
      where: { userId, courseId },
    });

    console.log(`[DEBUG ACCESS] Purchase found:`, purchase ? {
      id: purchase.id,
      status: purchase.status,
      provider: purchase.provider,
    } : "NONE");

    // Check enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    console.log(`[DEBUG ACCESS] Enrollment found:`, enrollment ? {
      id: enrollment.id,
      purchaseId: enrollment.purchaseId,
    } : "NONE");

    // Check lesson content
    const lessons = await prisma.lesson.findMany({
      where: { Section: { courseId } },
      include: { contents: true },
    });

    console.log(`[DEBUG ACCESS] Found ${lessons.length} lessons with ${lessons.reduce((sum: number, l: { contents: Array<{ contentUrl: string | null; id: string; contentType: string; title: string | null }> }) => sum + l.contents.length, 0)} content items`);

    const lessonsWithContent = lessons.map((l: { id: string; title: string; contents: Array<{ id: string; contentType: string; contentUrl: string | null; title: string | null }> }) => ({
      id: l.id,
      title: l.title,
      contentCount: l.contents.length,
      hasContentUrl: l.contents.some((c: { contentUrl: string | null }) => !!c.contentUrl),
      contents: l.contents.map((c: { id: string; contentType: string; contentUrl: string | null; title: string | null }) => ({
        id: c.id,
        contentType: c.contentType,
        hasUrl: !!c.contentUrl,
        title: c.title,
      })),
    }));

    const result = {
      userId,
      courseId,
      purchase: purchase ? {
        id: purchase.id,
        status: purchase.status,
        provider: purchase.provider,
        providerRef: purchase.providerRef,
        amountCents: purchase.amountCents,
        createdAt: purchase.createdAt,
        updatedAt: purchase.createdAt, // Note: Purchase model doesn't have updatedAt, using createdAt
      } : null,
      enrollment: enrollment ? {
        id: enrollment.id,
        grantedAt: enrollment.grantedAt,
        purchaseId: enrollment.purchaseId,
      } : null,
      lessonsWithContent,
      diagnosis: {
        hasPaidPurchase: purchase?.status === "paid",
        hasEnrollment: !!enrollment,
        hasLessonContent: lessonsWithContent.some((l: { hasContentUrl: boolean }) => l.hasContentUrl),
        shouldHaveAccess: purchase?.status === "paid",
        accessGranted: !!enrollment && purchase?.status === "paid",
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("[DEBUG ACCESS] Error checking access:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Error checking access",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: error instanceof Error && error.message.includes("FORBIDDEN") ? 403 : 500 }
    );
  }
}

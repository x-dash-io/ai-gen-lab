import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/access";
import { updateLessonProgress, getLessonProgress } from "@/lib/progress";
import { trackLessonComplete } from "@/lib/analytics";
import { withErrorHandler } from "../error-handler";
import { logger } from "@/lib/logger";
import { checkAndGenerateCertificate } from "@/lib/certificate-service";
import { progressUpdateSchema, progressQuerySchema, validateRequestBody, validateQueryParams } from "@/lib/validation";

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  
  logger.info("Progress update request", { body });
  
  // Validate input
  const validation = validateRequestBody(progressUpdateSchema, body);
  if (!validation.success) {
    // Parse the error directly for logging
    const parseResult = progressUpdateSchema.safeParse(body);
    logger.error("Progress validation failed", { 
      body, 
      errors: parseResult.success ? null : parseResult.error.flatten()
    });
    return validation.response;
  }
  
  const { lessonId, lastPosition, completionPercent, completed } = validation.data;

  const user = await requireUser();
  const progress = await updateLessonProgress(lessonId, {
    lastPosition: lastPosition ?? undefined,
    completionPercent: completionPercent ?? undefined,
    completedAt: completed ? new Date() : undefined,
  });

  // Track lesson completion analytics and check for course completion
  if (completed) {
    try {
      const lesson = await import("@/lib/courses").then((m) =>
        m.getLessonById(lessonId)
      );
      if (lesson) {
        trackLessonComplete(lessonId, lesson.Section.courseId, user.id);

        // Use centralized certificate service for course completion check
        try {
          const result = await checkAndGenerateCertificate(user.id, lesson.Section.courseId);
          
          logger.info(`Certificate check completed: userId=${user.id}, courseId=${lesson.Section.courseId}, success=${result.success}`);
          
        } catch (error) {
          logger.error("Failed to check course completion", {
            error: error instanceof Error ? error.message : 'Unknown error',
            userId: user.id,
            courseId: lesson.Section.courseId,
          });
          // Don't fail the progress update if certificate check fails
        }
      }
    } catch (error) {
      logger.error("Failed to track lesson completion", error);
    }
  }

  return NextResponse.json({ progress });
});

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  
  // Validate query parameters
  const validation = validateQueryParams(progressQuerySchema, searchParams);
  if (!validation.success) {
    return validation.response;
  }
  
  const { lessonId } = validation.data;

  const progress = await getLessonProgress(lessonId);
  return NextResponse.json({ progress });
});

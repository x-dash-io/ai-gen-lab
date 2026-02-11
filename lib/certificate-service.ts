import { generateCourseCertificate, hasCompletedCourse } from "@/lib/certificates";
import { logger } from "@/lib/logger";

type CertificateGenerationResult = {
  success: boolean;
  message: string;
  certificateId?: string;
  newlyGenerated?: boolean;
  isCompleted?: boolean;
  error?: string;
};

// In-memory cache to track ongoing certificate generation attempts.
// In production, this should be replaced with Redis or similar.
const certificateGenerationCache = new Map<
  string,
  {
    isGenerating: boolean;
    timestamp: number;
    promise?: Promise<CertificateGenerationResult>;
  }
>();

// Cache expiration time (5 minutes)
const CACHE_EXPIRY = 5 * 60 * 1000;

/**
 * Centralized certificate generation service with deduplication
 * Prevents multiple simultaneous calls for the same course completion
 */
export async function checkAndGenerateCertificate(
  userId: string,
  courseId: string
): Promise<CertificateGenerationResult> {
  const cacheKey = `${userId}-${courseId}`;

  // Check if certificate generation is already in progress.
  const cached = certificateGenerationCache.get(cacheKey);
  if (cached?.isGenerating && Date.now() - cached.timestamp < CACHE_EXPIRY) {
    logger.info(
      `Certificate generation already in progress: userId=${userId}, courseId=${courseId}`
    );

    // Wait for the existing generation to complete.
    if (cached.promise) {
      try {
        return await cached.promise;
      } catch {
        // If the cached promise failed, allow retry.
        certificateGenerationCache.delete(cacheKey);
      }
    }
  }

  // Check if course is completed.
  const isCompleted = await hasCompletedCourse(userId, courseId);

  if (!isCompleted) {
    return {
      success: true,
      message: "Course not yet completed",
      isCompleted: false,
    };
  }

  // Mark generation as in progress.
  const generationPromise = generateCertificateWithDeduplication(userId, courseId);

  certificateGenerationCache.set(cacheKey, {
    isGenerating: true,
    timestamp: Date.now(),
    promise: generationPromise,
  });

  try {
    return await generationPromise;
  } finally {
    // Clean up cache after completion.
    setTimeout(() => {
      certificateGenerationCache.delete(cacheKey);
    }, 1000); // Small delay to prevent immediate retries.
  }
}

/**
 * Internal function to handle the actual certificate generation
 */
async function generateCertificateWithDeduplication(
  userId: string,
  courseId: string
): Promise<CertificateGenerationResult> {
  try {
    const certificate = await generateCourseCertificate(courseId);
    logger.info(
      `Certificate generated successfully: userId=${userId}, courseId=${courseId}, certificateId=${certificate.certificateId}`
    );

    return {
      success: true,
      message: "Certificate generated successfully",
      certificateId: certificate.certificateId,
      newlyGenerated: true,
    };
  } catch (error) {
    logger.error("Failed to generate certificate", {
      error: error instanceof Error ? error.message : "Unknown error",
      userId,
      courseId,
    });

    return {
      success: false,
      message: "Course completed but certificate generation failed",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// These functions are not server actions - they're utility functions.
export const cleanupCertificateCache = (): void => {
  const now = Date.now();
  const entries = Array.from(certificateGenerationCache.entries());
  for (const [key, value] of entries) {
    if (now - value.timestamp > CACHE_EXPIRY) {
      certificateGenerationCache.delete(key);
    }
  }
};

export const getCertificateCacheStatus = (): {
  totalEntries: number;
  activeGenerations: number;
  entries: Array<{ key: string; isGenerating: boolean; age: number }>;
} => {
  const now = Date.now();
  const entries = Array.from(certificateGenerationCache.entries()).map(
    ([key, value]) => ({
      key,
      isGenerating: value.isGenerating,
      age: now - value.timestamp,
    })
  );

  return {
    totalEntries: entries.length,
    activeGenerations: entries.filter((entry) => entry.isGenerating).length,
    entries,
  };
};

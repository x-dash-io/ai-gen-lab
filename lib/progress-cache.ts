/**
 * Course progress caching service
 * Reduces database queries for frequently accessed progress data
 */

import { logger } from "@/lib/logger";

interface CourseProgressCache {
  totalLessons: number;
  completedLessons: number;
  overallProgress: number;
  lessons: Array<{
    lessonId: string;
    completedAt: string | null;
    completionPercent: number;
    lastPosition: number;
  }>;
  isCompleted: boolean;
  lastUpdated: number;
}

interface CacheEntry {
  data: CourseProgressCache;
  timestamp: number;
  ttl: number;
}

// In-memory cache - in production, this should be Redis or similar
const progressCache = new Map<string, CacheEntry>();

// Default TTL: 5 minutes for progress data
const DEFAULT_TTL = 5 * 60 * 1000;

// TTL for completed courses: 30 minutes (less frequent updates)
const COMPLETED_TTL = 30 * 60 * 1000;

/**
 * Generate cache key for user-course combination
 */
function getCacheKey(userId: string, courseId: string): string {
  return `progress:${userId}:${courseId}`;
}

/**
 * Get cached progress data
 */
export function getCachedProgress(userId: string, courseId: string): CourseProgressCache | null {
  const key = getCacheKey(userId, courseId);
  const entry = progressCache.get(key);
  
  if (!entry) {
    return null;
  }
  
  // Check if cache entry has expired
  if (Date.now() - entry.timestamp > entry.ttl) {
    progressCache.delete(key);
    logger.info(`Progress cache expired for user ${userId}, course ${courseId}`);
    return null;
  }
  
  logger.info(`Progress cache hit for user ${userId}, course ${courseId}`);
  return entry.data;
}

/**
 * Set cached progress data
 */
export function setCachedProgress(
  userId: string, 
  courseId: string, 
  data: CourseProgressCache
): void {
  const key = getCacheKey(userId, courseId);
  const ttl = data.isCompleted ? COMPLETED_TTL : DEFAULT_TTL;
  
  progressCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
  
  logger.info(`Progress cache set for user ${userId}, course ${courseId}, TTL: ${ttl}ms`);
}

/**
 * Update cached progress for a specific lesson
 */
export function updateCachedLessonProgress(
  userId: string,
  courseId: string,
  lessonId: string,
  lessonProgress: {
    completedAt?: string | null;
    completionPercent?: number;
    lastPosition?: number;
  }
): void {
  const cached = getCachedProgress(userId, courseId);
  if (!cached) {
    return; // No cached data to update
  }
  
  // Find and update the lesson
  const lessonIndex = cached.lessons.findIndex(l => l.lessonId === lessonId);
  if (lessonIndex === -1) {
    return; // Lesson not found in cache
  }
  
  // Update lesson data
  const updatedLesson = { ...cached.lessons[lessonIndex] };
  if (lessonProgress.completedAt !== undefined) {
    updatedLesson.completedAt = lessonProgress.completedAt;
  }
  if (lessonProgress.completionPercent !== undefined) {
    updatedLesson.completionPercent = lessonProgress.completionPercent;
  }
  if (lessonProgress.lastPosition !== undefined) {
    updatedLesson.lastPosition = lessonProgress.lastPosition;
  }
  
  // Update cached data
  cached.lessons[lessonIndex] = updatedLesson;
  cached.completedLessons = cached.lessons.filter(l => l.completedAt !== null).length;
  cached.overallProgress = cached.totalLessons > 0 
    ? Math.round((cached.completedLessons / cached.totalLessons) * 100) 
    : 0;
  cached.isCompleted = cached.overallProgress === 100;
  cached.lastUpdated = Date.now();
  
  // Re-cache with updated data
  setCachedProgress(userId, courseId, cached);
  
  logger.info(`Updated cached lesson progress for user ${userId}, course ${courseId}, lesson ${lessonId}`);
}

/**
 * Invalidate cache for a specific user-course combination
 */
export function invalidateProgressCache(userId: string, courseId: string): void {
  const key = getCacheKey(userId, courseId);
  progressCache.delete(key);
  logger.info(`Invalidated progress cache for user ${userId}, course ${courseId}`);
}

/**
 * Invalidate all progress cache for a user
 */
export function invalidateUserProgressCache(userId: string): void {
  const keysToDelete: string[] = [];
  
  for (const key of progressCache.keys()) {
    if (key.startsWith(`progress:${userId}:`)) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => progressCache.delete(key));
  logger.info(`Invalidated ${keysToDelete.length} progress cache entries for user ${userId}`);
}

/**
 * Clean up expired cache entries
 */
export function cleanupProgressCache(): void {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [key, entry] of progressCache.entries()) {
    if (now - entry.timestamp > entry.ttl) {
      progressCache.delete(key);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    logger.info(`Cleaned up ${cleanedCount} expired progress cache entries`);
  }
}

/**
 * Get cache statistics for monitoring
 */
export function getProgressCacheStats(): {
  totalEntries: number;
  completedCourses: number;
  activeCourses: number;
  averageAge: number;
  oldestEntry: number;
  newestEntry: number;
} {
  const now = Date.now();
  const entries = Array.from(progressCache.values());
  
  if (entries.length === 0) {
    return {
      totalEntries: 0,
      completedCourses: 0,
      activeCourses: 0,
      averageAge: 0,
      oldestEntry: 0,
      newestEntry: 0,
    };
  }
  
  const ages = entries.map(e => now - e.timestamp);
  const completedCount = entries.filter(e => e.data.isCompleted).length;
  
  return {
    totalEntries: entries.length,
    completedCourses: completedCount,
    activeCourses: entries.length - completedCount,
    averageAge: ages.reduce((sum, age) => sum + age, 0) / ages.length,
    oldestEntry: Math.max(...ages),
    newestEntry: Math.min(...ages),
  };
}

/**
 * Preload progress cache for a user (useful for dashboard loading)
 */
export async function preloadUserProgressCache(
  userId: string,
  courseIds: string[],
  fetchProgressFn: (courseId: string) => Promise<CourseProgressCache>
): Promise<void> {
  const promises = courseIds.map(async (courseId) => {
    try {
      // Check if already cached
      if (getCachedProgress(userId, courseId)) {
        return;
      }
      
      // Fetch and cache
      const progress = await fetchProgressFn(courseId);
      setCachedProgress(userId, courseId, progress);
    } catch (error) {
      logger.error(`Failed to preload progress for user ${userId}, course ${courseId}`, error);
    }
  });
  
  await Promise.allSettled(promises);
  logger.info(`Preloaded progress cache for user ${userId}, ${courseIds.length} courses`);
}

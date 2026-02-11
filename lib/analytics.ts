/**
 * Analytics and monitoring utilities
 * Integrated with Vercel Analytics
 */

import { track as vercelTrack } from "@vercel/analytics";

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  userId?: string;
}

/**
 * Track analytics events
 * Uses Vercel Analytics for automatic tracking
 */
export function trackEvent(event: AnalyticsEvent): void {
  // Always log in development
  if (process.env.NODE_ENV === "development") {
    console.log("[ANALYTICS] Event:", event);
  }

  // Track with Vercel Analytics (works in production automatically)
  try {
    vercelTrack(event.name, event.properties);
  } catch (error) {
    console.error("[ANALYTICS] Failed to track with Vercel:", error);
  }
}

/**
 * Track page views
 */
export function trackPageView(path: string, userId?: string): void {
  trackEvent({
    name: "page_view",
    properties: { path },
    userId,
  });
}

/**
 * Track purchases
 */
export function trackPurchase(
  courseId: string,
  amountCents: number,
  userId: string
): void {
  trackEvent({
    name: "purchase",
    properties: {
      courseId,
      amount: amountCents / 100,
      currency: "USD",
    },
    userId,
  });
}

/**
 * Track course views
 */
export function trackCourseView(courseId: string, userId?: string): void {
  trackEvent({
    name: "course_view",
    properties: { courseId },
    userId,
  });
}

/**
 * Track lesson completion
 */
export function trackLessonComplete(
  lessonId: string,
  courseId: string,
  userId: string
): void {
  trackEvent({
    name: "lesson_complete",
    properties: { lessonId, courseId },
    userId,
  });
}

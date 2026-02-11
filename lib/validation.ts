/**
 * Input validation utilities
 */

import { z } from "zod";

// Course validation schemas
export const courseSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().max(5000).optional(),
  priceCents: z.number().int().min(0).max(10000000), // Max $100,000
  isPublished: z.boolean().optional(),
});

// Review validation schemas
export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  text: z.string().max(1000).nullable().optional(),
});

// User validation schemas
export const userUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
});

// File upload validation
export const fileUploadSchema = z.object({
  contentType: z.enum(["video", "audio", "pdf", "file"]),
  fileSize: z.number().max(500 * 1024 * 1024), // 500MB max
  mimeType: z.string(),
});

// Progress validation schemas
export const progressUpdateSchema = z.object({
  lessonId: z.string().min(1, "Lesson ID is required"), // Accept CUID format
  lastPosition: z.number().min(0).max(24 * 60 * 60).optional(), // Max 24 hours in seconds
  completionPercent: z.number().min(0).max(100).optional(),
  completed: z.boolean().optional(),
});

export const progressQuerySchema = z.object({
  lessonId: z.string().min(1, "Lesson ID is required"), // Accept CUID format
});

// Certificate validation schemas
export const certificateCheckSchema = z.object({
  courseId: z.string().uuid("Invalid course ID format"),
});

export const certificateDownloadSchema = z.object({
  certificateId: z.string().min(1).max(100).regex(/^[A-Z0-9-]+$/, "Invalid certificate ID format"),
});

// Course progress validation schemas
export const courseProgressSchema = z.object({
  courseId: z.string().min(1).max(100),
});

/**
 * Validate and sanitize input
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Safe parse with error handling
 */
export function safeParse<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: result.error.issues.map((e) => e.message).join(", "),
  };
}

/**
 * Validate request body and return error response if invalid
 */
export function validateRequestBody<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; response: Response } {
  const result = safeParse(schema, data);
  if (!result.success) {
    // Check if Response is available (not in Jest test environment)
    if (typeof Response !== 'undefined') {
      return {
        success: false,
        response: new Response(
          JSON.stringify({ error: "Validation failed", details: result.error }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        ),
      };
    } else {
      // Fallback for test environment
      throw new Error(`Validation failed: ${result.error}`);
    }
  }
  return { success: true, data: result.data };
}

/**
 * Validate query parameters and return error response if invalid
 */
export function validateQueryParams<T>(
  schema: z.ZodSchema<T>,
  searchParams: URLSearchParams
): { success: true; data: T } | { success: false; response: Response } {
  const params: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    params[key] = value;
  }
  
  return validateRequestBody(schema, params);
}

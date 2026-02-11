/**
 * Rate limiting utility with Upstash for production
 * Falls back to in-memory for development without Redis
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialize Redis client if credentials are available
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

/**
 * In-memory rate limiter fallback for development
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class InMemoryRateLimiter {
  private limits = new Map<string, RateLimitEntry>();

  check(
    key: string,
    maxRequests: number,
    windowMs: number
  ): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = this.limits.get(key);

    if (!entry || now > entry.resetAt) {
      const resetAt = now + windowMs;
      this.limits.set(key, {
        count: 1,
        resetAt,
      });

      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetAt,
      };
    }

    if (entry.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
      };
    }

    entry.count++;
    this.limits.set(key, entry);

    return {
      allowed: true,
      remaining: maxRequests - entry.count,
      resetAt: entry.resetAt,
    };
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetAt) {
        this.limits.delete(key);
      }
    }
  }
}

const inMemoryLimiter = new InMemoryRateLimiter();

// Cleanup every 5 minutes (only for in-memory)
if (typeof setInterval !== "undefined" && !redis) {
  setInterval(() => {
    inMemoryLimiter.cleanup();
  }, 5 * 60 * 1000);
}

/**
 * Create Upstash rate limiters with different configurations
 */
const upstashLimiters = redis ? {
  // API routes: 100 requests per 15 minutes
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, "15 m"),
    analytics: true,
    prefix: "ratelimit:api",
  }),
  
  // Auth routes: 5 requests per 15 minutes
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "15 m"),
    analytics: true,
    prefix: "ratelimit:auth",
  }),
  
  // Upload routes: 10 requests per hour
  upload: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 h"),
    analytics: true,
    prefix: "ratelimit:upload",
  }),
  
  // Review creation: 5 requests per hour
  review: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 h"),
    analytics: true,
    prefix: "ratelimit:review",
  }),
} : null;

/**
 * Rate limit result type
 */
interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Create a rate limiter function for a specific limit type
 */
function createRateLimiter(
  type: "api" | "auth" | "upload" | "review",
  maxRequests: number,
  windowMs: number
) {
  return async (identifier: string): Promise<RateLimitResult> => {
    if (upstashLimiters) {
      const result = await upstashLimiters[type].limit(identifier);
      return {
        allowed: result.success,
        remaining: result.remaining,
        resetAt: result.reset,
      };
    } else {
      // Fall back to in-memory
      return inMemoryLimiter.check(`${type}:${identifier}`, maxRequests, windowMs);
    }
  };
}

/**
 * Predefined rate limiters
 * These return async functions that check rate limits
 */
export const rateLimits = {
  // API routes: 100 requests per 15 minutes
  api: createRateLimiter("api", 100, 15 * 60 * 1000),
  
  // Auth routes: 5 requests per 15 minutes
  auth: createRateLimiter("auth", 5, 15 * 60 * 1000),
  
  // Upload routes: 10 requests per hour
  upload: createRateLimiter("upload", 10, 60 * 60 * 1000),
  
  // Review creation: 5 requests per hour
  review: createRateLimiter("review", 5, 60 * 60 * 1000),
};

/**
 * Legacy synchronous interface for backwards compatibility
 * Uses in-memory limiter only (for migration purposes)
 */
export const rateLimiter = {
  check: (key: string, maxRequests: number, windowMs: number) => {
    return inMemoryLimiter.check(key, maxRequests, windowMs);
  },
  cleanup: () => {
    inMemoryLimiter.cleanup();
  },
};

/**
 * Check if Upstash is available
 */
export function isUpstashAvailable(): boolean {
  return redis !== null;
}

/**
 * Helper to create a custom rate limiter
 */
export function createCustomRateLimit(
  prefix: string,
  maxRequests: number,
  windowSeconds: number
) {
  if (redis) {
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maxRequests, `${windowSeconds} s`),
      analytics: true,
      prefix: `ratelimit:${prefix}`,
    });

    return async (identifier: string): Promise<RateLimitResult> => {
      const result = await limiter.limit(identifier);
      return {
        allowed: result.success,
        remaining: result.remaining,
        resetAt: result.reset,
      };
    };
  } else {
    return async (identifier: string): Promise<RateLimitResult> => {
      return inMemoryLimiter.check(`${prefix}:${identifier}`, maxRequests, windowSeconds * 1000);
    };
  }
}

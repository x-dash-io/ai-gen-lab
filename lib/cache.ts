/**
 * Cache implementation with Upstash Redis for production
 * Falls back to in-memory cache for development without Redis
 */

import { Redis } from "@upstash/redis";

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// Initialize Redis client if credentials are available
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

/**
 * In-memory fallback cache for development
 */
class InMemoryCache {
  private cache = new Map<string, CacheEntry<any>>();

  set<T>(key: string, data: T, ttlSeconds: number = 60): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { data, expiresAt });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

const inMemoryCache = new InMemoryCache();

// Cleanup expired entries every 5 minutes (only for in-memory)
if (typeof setInterval !== "undefined" && !redis) {
  setInterval(() => {
    inMemoryCache.cleanup();
  }, 5 * 60 * 1000);
}

/**
 * Unified cache interface that works with both Redis and in-memory
 */
export const cache = {
  /**
   * Set a value in cache with TTL
   */
  async set<T>(key: string, data: T, ttlSeconds: number = 60): Promise<void> {
    if (redis) {
      await redis.setex(key, ttlSeconds, JSON.stringify(data));
    } else {
      inMemoryCache.set(key, data, ttlSeconds);
    }
  },

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (redis) {
      const data = await redis.get(key);
      if (data === null) return null;
      // Redis returns parsed JSON for objects, strings as-is
      return data as T;
    } else {
      return inMemoryCache.get<T>(key);
    }
  },

  /**
   * Delete a value from cache
   */
  async delete(key: string): Promise<void> {
    if (redis) {
      await redis.del(key);
    } else {
      inMemoryCache.delete(key);
    }
  },

  /**
   * Clear all cache (use with caution in production)
   */
  async clear(): Promise<void> {
    if (redis) {
      // In production, we typically don't want to flush all keys
      // This would require pattern matching which is expensive
      console.warn("Cache clear called on Redis - skipping for safety");
    } else {
      inMemoryCache.clear();
    }
  },

  /**
   * Check if Redis is available
   */
  isRedisAvailable(): boolean {
    return redis !== null;
  },
};

/**
 * Synchronous cache get for backwards compatibility
 * Only works with in-memory cache, returns null if using Redis
 */
cache.get = async function<T>(key: string): Promise<T | null> {
  if (redis) {
    const data = await redis.get(key);
    if (data === null) return null;
    return data as T;
  } else {
    return inMemoryCache.get<T>(key);
  }
};

/**
 * Cache key generators
 */
export const cacheKeys = {
  course: (slug: string) => `course:${slug}`,
  coursePreview: (slug: string) => `course:preview:${slug}`,
  userProgress: (userId: string, courseId: string) =>
    `progress:${userId}:${courseId}`,
  reviewStats: (courseId: string) => `reviews:stats:${courseId}`,
  learningPath: (pathId: string) => `learning-path:${pathId}`,
};

/**
 * Helper function to wrap async cache operations for sync-like usage
 * Useful for migrating from sync to async cache
 */
export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 60
): Promise<T> {
  const cached = await cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  const data = await fetcher();
  await cache.set(key, data, ttlSeconds);
  return data;
}

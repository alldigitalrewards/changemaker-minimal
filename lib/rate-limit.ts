/**
 * RATE LIMITING UTILITIES
 * ========================
 *
 * Sliding window rate limiting for API endpoints.
 * Prevents abuse of security-critical operations.
 */

type Bucket = {
  timestamps: number[]
}

const store = new Map<string, Bucket>()

// Cleanup old buckets every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now()
  const maxWindowMs = 5 * 60 * 1000 // 5 minutes

  for (const [key, bucket] of store.entries()) {
    bucket.timestamps = bucket.timestamps.filter(ts => now - ts < maxWindowMs)
    if (bucket.timestamps.length === 0) {
      store.delete(key)
    }
  }
}, 5 * 60 * 1000)

/**
 * Rate limit checker using sliding window algorithm
 * @param key Unique identifier (e.g., "ip:userId", "email:action")
 * @param limit Maximum number of requests allowed in the window
 * @param windowMs Time window in milliseconds
 * @returns Object with allowed status and optional retry-after time
 */
export function rateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const bucket = store.get(key) || { timestamps: [] }

  // Remove timestamps outside the current window
  bucket.timestamps = bucket.timestamps.filter(ts => now - ts < windowMs)

  if (bucket.timestamps.length >= limit) {
    const retryAfter = windowMs - (now - bucket.timestamps[0])
    store.set(key, bucket)
    return { allowed: false, retryAfter }
  }

  bucket.timestamps.push(now)
  store.set(key, bucket)
  return { allowed: true }
}

/**
 * Reset rate limit for a specific key (useful for testing)
 */
export function resetRateLimit(key: string): void {
  store.delete(key)
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const RateLimiters = {
  /**
   * Strict rate limit for authentication operations
   * 5 requests per minute
   */
  auth: (key: string) => rateLimit(key, 5, 60 * 1000),

  /**
   * Standard rate limit for API endpoints
   * 30 requests per minute
   */
  api: (key: string) => rateLimit(key, 30, 60 * 1000),

  /**
   * Lenient rate limit for public endpoints
   * 100 requests per minute
   */
  public: (key: string) => rateLimit(key, 100, 60 * 1000),

  /**
   * Very strict rate limit for security-critical operations
   * 3 requests per 5 minutes
   */
  critical: (key: string) => rateLimit(key, 3, 5 * 60 * 1000),
}



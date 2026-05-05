/**
 * Simple in-memory rate limiter.
 * No external dependencies required — uses a Map with automatic cleanup.
 * Suitable for single-instance deployments (SQLite architecture).
 *
 * For multi-instance deployments, replace with @upstash/ratelimit + Redis.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

export interface RateLimitConfig {
  /** Maximum number of requests in the window */
  maxRequests: number
  /** Window duration in seconds */
  windowSeconds: number
}

const defaultConfig: RateLimitConfig = {
  maxRequests: 100,
  windowSeconds: 60,
}

// In-memory store — automatically cleaned up
const store = new Map<string, RateLimitEntry>()

// Cleanup stale entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000
let cleanupTimer: ReturnType<typeof setInterval> | null = null

function cleanup(): void {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) {
      store.delete(key)
    }
  }
}

function ensureCleanup(): void {
  if (!cleanupTimer) {
    cleanupTimer = setInterval(cleanup, CLEANUP_INTERVAL)
    // Allow process to exit even if timer is running
    if (cleanupTimer.unref) {
      cleanupTimer.unref()
    }
  }
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  success: boolean
  /** Number of requests remaining in the current window */
  remaining: number
  /** Timestamp (ms) when the rate limit window resets */
  resetAt: number
}

/**
 * Check rate limit for a given key (typically IP or userId).
 *
 * @param key - Identifier to rate limit by (IP address, user ID, etc.)
 * @param config - Rate limit configuration (max requests per window)
 * @returns Result with success flag, remaining count, and reset time
 */
export function rateLimit(key: string, config: Partial<RateLimitConfig> = {}): RateLimitResult {
  ensureCleanup()

  const maxRequests = config.maxRequests ?? defaultConfig.maxRequests
  const windowMs = (config.windowSeconds ?? defaultConfig.windowSeconds) * 1000

  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt <= now) {
    // New window
    const resetAt = now + windowMs
    store.set(key, { count: 1, resetAt })
    return { success: true, remaining: maxRequests - 1, resetAt }
  }

  if (entry.count >= maxRequests) {
    // Rate limited
    return { success: false, remaining: 0, resetAt: entry.resetAt }
  }

  // Within limit
  entry.count++
  return { success: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt }
}

// Predefined rate limit configurations for different endpoint types
export const RATE_LIMITS = {
  /** General API: 100 requests/minute */
  general: { maxRequests: 100, windowSeconds: 60 } as RateLimitConfig,
  /** Auth endpoints: 10 requests/minute */
  auth: { maxRequests: 10, windowSeconds: 60 } as RateLimitConfig,
  /** Bot chat: 30 requests/minute */
  botChat: { maxRequests: 30, windowSeconds: 60 } as RateLimitConfig,
  /** Webhook endpoints: 60 requests/minute */
  webhook: { maxRequests: 60, windowSeconds: 60 } as RateLimitConfig,
  /** Public tracking: 60 requests/minute */
  tracking: { maxRequests: 60, windowSeconds: 60 } as RateLimitConfig,
  /** Search: 20 requests/minute */
  search: { maxRequests: 20, windowSeconds: 60 } as RateLimitConfig,
} as const

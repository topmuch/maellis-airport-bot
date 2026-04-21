// ============================================================================
// MAELLIS Airport Bot — Rate Limiter (Production Security)
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000; // 15 min
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;

/**
 * Check if a request should be rate limited.
 * Returns { allowed: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(identifier: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
} {
  const now = Date.now();

  // Clean up expired entries
  if (Math.random() < 0.01) { // 1% chance to clean up
    for (const [key, entry] of store) {
      if (entry.resetTime < now) store.delete(key);
    }
  }

  let entry = store.get(identifier);

  if (!entry || entry.resetTime < now) {
    entry = { count: 0, resetTime: now + WINDOW_MS };
    store.set(identifier, entry);
  }

  entry.count++;
  const remaining = Math.max(0, MAX_REQUESTS - entry.count);

  return {
    allowed: entry.count <= MAX_REQUESTS,
    remaining,
    resetAt: entry.resetTime,
    limit: MAX_REQUESTS,
  };
}

/**
 * Extract rate limit identifier from a request.
 * Uses IP address from headers or phone number.
 */
export function extractIdentifier(req: Request): string {
  // Try phone from body (for POST requests)
  const url = new URL(req.url);

  if (req.method === "POST") {
    // For WhatsApp webhook, we can try to read the phone from the payload
    // But since we need to read the body later, use IP as fallback
  }

  // Use IP from headers (set by Caddy/reverse proxy)
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;

  return "unknown";
}

/**
 * Create rate limit HTTP headers.
 */
export function rateLimitHeaders(result: ReturnType<typeof checkRateLimit>): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}

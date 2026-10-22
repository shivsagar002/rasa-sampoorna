import { RateLimitError } from "@/lib/api/errors";

interface RateLimitConfig {
  maxRequests: number; // e.g. 5 requests
  windowMs: number;    // e.g. 60 * 1000 (1 minute)
}

interface ClientRecord {
  count: number;
  resetAt: number;
}

const store = new Map<string, ClientRecord>();

// Cleanup stale entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (record.resetAt <= now) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Apply rate limiting to an identifier (e.g. client IP or user ID)
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { maxRequests: 60, windowMs: 60 * 1000 }
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const record = store.get(identifier);

  if (!record || record.resetAt <= now) {
    store.set(identifier, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    };
  }

  if (record.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.resetAt,
    };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetAt: record.resetAt,
  };
}

/**
 * Convenience helper to enforce rate limiting and throw RateLimitError if exceeded
 */
export function enforceRateLimit(
  identifier: string,
  config: RateLimitConfig = { maxRequests: 10, windowMs: 60 * 1000 }
) {
  const result = checkRateLimit(identifier, config);
  if (!result.allowed) {
    throw new RateLimitError();
  }
}

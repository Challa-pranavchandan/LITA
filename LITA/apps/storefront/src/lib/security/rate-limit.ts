/**
 * In-memory sliding window rate limiter for authentication endpoints.
 * In serverless/production deployments, this complements edge WAF / Cloudflare rate limiting.
 */

type RateLimitRecord = {
  timestamps: number[];
};

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up expired entries every 10 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      record.timestamps = record.timestamps.filter((t) => now - t < 15 * 60 * 1000);
      if (record.timestamps.length === 0) {
        rateLimitStore.delete(key);
      }
    }
  }, 10 * 60 * 1000);
}

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetInSeconds: number;
};

export function checkRateLimit(
  identifier: string,
  action: "login" | "register" | "reset",
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000 // 15 minutes
): RateLimitResult {
  const key = `${action}:${identifier.toLowerCase().trim()}`;
  const now = Date.now();
  let record = rateLimitStore.get(key);

  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(key, record);
  }

  // Filter timestamps within the current sliding window
  record.timestamps = record.timestamps.filter((t) => now - t < windowMs);

  if (record.timestamps.length >= maxAttempts) {
    const oldest = record.timestamps[0];
    const resetInSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return {
      success: false,
      remaining: 0,
      resetInSeconds,
    };
  }

  record.timestamps.push(now);
  return {
    success: true,
    remaining: maxAttempts - record.timestamps.length,
    resetInSeconds: Math.ceil(windowMs / 1000),
  };
}

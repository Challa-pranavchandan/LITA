/**
 * Pluggable sliding window rate limiter.
 *
 * Production: Uses @upstash/ratelimit when UPSTASH_REDIS_REST_URL and
 * UPSTASH_REDIS_REST_TOKEN are set. In production, fails closed with a log error
 * if Upstash is not configured.
 *
 * Development: Falls back to an in-memory sliding window limiter.
 */

export type RateLimitAction =
  | "login"
  | "register"
  | "reset"
  | "contact"
  | "inquiry"
  | "newsletter"
  | "feedback"
  | "trade"

export type RateLimitResult = {
  success: boolean
  remaining: number
  resetInSeconds: number
}

type RateLimitRecord = {
  timestamps: number[]
}

const rateLimitStore = new Map<string, RateLimitRecord>()

// Clean up expired entries every 10 minutes in memory
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [key, record] of rateLimitStore.entries()) {
      record.timestamps = record.timestamps.filter((t) => now - t < 15 * 60 * 1000)
      if (record.timestamps.length === 0) {
        rateLimitStore.delete(key)
      }
    }
  }, 10 * 60 * 1000)
}

export function resetInMemoryRateLimitStore() {
  rateLimitStore.clear()
}

export function checkInMemoryLimit(
  identifier: string,
  action: RateLimitAction,
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000
): RateLimitResult {
  const key = `${action}:${identifier.toLowerCase().trim()}`
  const now = Date.now()
  let record = rateLimitStore.get(key)

  if (!record) {
    record = { timestamps: [] }
    rateLimitStore.set(key, record)
  }

  // Filter timestamps within the current sliding window
  record.timestamps = record.timestamps.filter((t) => now - t < windowMs)

  if (record.timestamps.length >= maxAttempts) {
    const oldest = record.timestamps[0]
    const resetInSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000))
    return {
      success: false,
      remaining: 0,
      resetInSeconds,
    }
  }

  record.timestamps.push(now)
  return {
    success: true,
    remaining: maxAttempts - record.timestamps.length,
    resetInSeconds: Math.ceil(windowMs / 1000),
  }
}

export async function checkRateLimit(
  identifier: string,
  action: RateLimitAction,
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000
): Promise<RateLimitResult> {
  const isProd = process.env.NODE_ENV === "production"
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (upstashUrl && upstashToken) {
    try {
      const { Ratelimit } = await import("@upstash/ratelimit")
      const { Redis } = await import("@upstash/redis")

      const redis = new Redis({
        url: upstashUrl,
        token: upstashToken,
      })

      const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000))
      const ratelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(maxAttempts, `${windowSeconds} s`),
        prefix: `lita:ratelimit:${action}`,
      })

      const key = identifier.toLowerCase().trim()
      const res = await ratelimit.limit(key)

      return {
        success: res.success,
        remaining: res.remaining,
        resetInSeconds: Math.max(1, Math.ceil((res.reset - Date.now()) / 1000)),
      }
    } catch (err) {
      console.error(`[RateLimit] Upstash execution error for action "${action}":`, err)
      if (isProd) {
        return {
          success: false,
          remaining: 0,
          resetInSeconds: 60,
        }
      }
    }
  }

  if (isProd) {
    console.error(
      `[RateLimit] Security error: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are not configured in production. Failing closed for action: "${action}".`
    )
    return {
      success: false,
      remaining: 0,
      resetInSeconds: 60,
    }
  }

  // Development fallback to in-memory limiter
  return checkInMemoryLimit(identifier, action, maxAttempts, windowMs)
}

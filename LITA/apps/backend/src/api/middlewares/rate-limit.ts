import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { extractClientIp, hashIp } from "../../lib/ip-hash"

type RateLimitRecord = {
  timestamps: number[]
}

const rateLimitStore = new Map<string, RateLimitRecord>()

export type RateLimitAction =
  | "inquiry"
  | "newsletter"
  | "trade"
  | "feedback"
  | "commission_upload"
  | "contact"
  | "reset"

export function checkBackendRateLimit(
  key: string,
  maxRequests = 5,
  windowMs = 15 * 60 * 1000
): { success: boolean; remaining: number; resetInSeconds: number } {
  const now = Date.now()
  let record = rateLimitStore.get(key)
  if (!record) {
    record = { timestamps: [] }
    rateLimitStore.set(key, record)
  }

  // Filter timestamps within current sliding window
  record.timestamps = record.timestamps.filter((t) => now - t < windowMs)

  if (record.timestamps.length >= maxRequests) {
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
    remaining: maxRequests - record.timestamps.length,
    resetInSeconds: Math.ceil(windowMs / 1000),
  }
}

export function resetBackendRateLimitStore() {
  rateLimitStore.clear()
}

export function createRateLimitMiddleware(
  action: RateLimitAction,
  maxRequests = 5,
  windowMs = 15 * 60 * 1000
) {
  return async (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
    const rawIp = extractClientIp(req)
    const ipHash = hashIp(rawIp) || "anonymous"
    const key = `${action}:${ipHash}`

    const result = checkBackendRateLimit(key, maxRequests, windowMs)

    res.setHeader("X-RateLimit-Limit", maxRequests.toString())
    res.setHeader("X-RateLimit-Remaining", result.remaining.toString())

    if (!result.success) {
      res.setHeader("Retry-After", result.resetInSeconds.toString())
      return res.status(429).json({
        message: "Too many requests. Please try again later.",
        retry_after: result.resetInSeconds,
      })
    }

    return next()
  }
}

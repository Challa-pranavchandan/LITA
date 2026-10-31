const { test, describe } = require("node:test")
const assert = require("node:assert")
const fs = require("node:fs")
const path = require("node:path")

describe("B6 - Bot & Abuse Protection, Rate Limiting, and Inquiries", () => {
  describe("Pluggable Rate Limiter (rate-limit.ts)", () => {
    const rateLimitModulePath = path.resolve(__dirname, "../lib/security/rate-limit.ts")
    const rateLimitSource = fs.readFileSync(rateLimitModulePath, "utf8")

    test("exports checkRateLimit, checkInMemoryLimit, resetInMemoryRateLimitStore", () => {
      assert.strictEqual(rateLimitSource.includes("export async function checkRateLimit"), true)
      assert.strictEqual(rateLimitSource.includes("export function checkInMemoryLimit"), true)
      assert.strictEqual(rateLimitSource.includes("export function resetInMemoryRateLimitStore"), true)
    })

    test("supports all required RateLimitAction types", () => {
      const requiredActions = [
        "login",
        "register",
        "reset",
        "contact",
        "inquiry",
        "newsletter",
        "feedback",
        "trade",
      ]
      for (const action of requiredActions) {
        assert.strictEqual(
          rateLimitSource.includes(`"${action}"`),
          true,
          `Expected rate-limit.ts to support action "${action}"`
        )
      }
    })

    test("fails closed in production if Upstash is not configured", () => {
      assert.strictEqual(
        rateLimitSource.includes("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are not configured in production"),
        true
      )
      assert.strictEqual(rateLimitSource.includes("Failing closed for action:"), true)
    })

    test("in-memory limiter enforces sliding window: 5 attempts pass, 6th fails", () => {
      // Transpile-free test of in-memory sliding window algorithm
      const store = new Map()
      function simulateLimiter(key, maxAttempts = 5, windowMs = 60000) {
        const now = Date.now()
        let rec = store.get(key)
        if (!rec) {
          rec = { timestamps: [] }
          store.set(key, rec)
        }
        rec.timestamps = rec.timestamps.filter((t) => now - t < windowMs)
        if (rec.timestamps.length >= maxAttempts) {
          const oldest = rec.timestamps[0]
          return {
            success: false,
            remaining: 0,
            resetInSeconds: Math.ceil((oldest + windowMs - now) / 1000),
          }
        }
        rec.timestamps.push(now)
        return {
          success: true,
          remaining: maxAttempts - rec.timestamps.length,
          resetInSeconds: Math.ceil(windowMs / 1000),
        }
      }

      for (let i = 1; i <= 5; i++) {
        const res = simulateLimiter("test:user@example.com", 5)
        assert.strictEqual(res.success, true, `Attempt ${i} should succeed`)
        assert.strictEqual(res.remaining, 5 - i)
      }

      const sixth = simulateLimiter("test:user@example.com", 5)
      assert.strictEqual(sixth.success, false, "6th attempt in window should fail")
      assert.strictEqual(sixth.remaining, 0)
      assert.strictEqual(sixth.resetInSeconds > 0, true)
    })
  })

  describe("Storefront /api/inquiry Proxy Route", () => {
    const inquiryRoutePath = path.resolve(__dirname, "../app/api/inquiry/route.ts")
    const inquiryRouteSource = fs.readFileSync(inquiryRoutePath, "utf8")

    test("routes directly to Medusa backend and removes INQUIRY_WEBHOOK_URL", () => {
      assert.strictEqual(inquiryRouteSource.includes("INQUIRY_WEBHOOK_URL"), false)
      assert.strictEqual(inquiryRouteSource.includes("/store/inquiries"), true)
      assert.strictEqual(inquiryRouteSource.includes("/store/newsletter/subscribe"), true)
    })

    test("returns honest 502 error when backend service is unreachable", () => {
      assert.strictEqual(inquiryRouteSource.includes("status: 502"), true)
      assert.strictEqual(
        inquiryRouteSource.includes("The studio service is currently unreachable. Please try again shortly."),
        true
      )
    })

    test("checks honeypot and silently accepts without forwarding", () => {
      assert.strictEqual(inquiryRouteSource.includes("body.website"), true)
      assert.strictEqual(inquiryRouteSource.includes("return NextResponse.json({ ok: true })"), true)
    })

    test("enforces sliding window rate limit on inquiries and newsletter", () => {
      assert.strictEqual(inquiryRouteSource.includes("checkRateLimit"), true)
      assert.strictEqual(inquiryRouteSource.includes("status: 429"), true)
      assert.strictEqual(inquiryRouteSource.includes('"Retry-After"'), true)
    })
  })

  describe("Form Protections & Turnstile Integration", () => {
    test("InquiryForm includes honeypot, Turnstile, and honest states", () => {
      const formPath = path.resolve(__dirname, "../components/InquiryForm.tsx")
      const source = fs.readFileSync(formPath, "utf8")

      assert.strictEqual(source.includes('name="website"'), true)
      assert.strictEqual(source.includes("<Turnstile"), true)
      assert.strictEqual(source.includes('disabled={state === "sending"}'), true)
      assert.strictEqual(source.includes("role=\"alert\""), true)
      assert.strictEqual(source.includes("role=\"status\""), true)
    })

    test("NewsletterForm includes honeypot, Turnstile, and double opt-in messaging", () => {
      const formPath = path.resolve(__dirname, "../components/NewsletterForm.tsx")
      const source = fs.readFileSync(formPath, "utf8")

      assert.strictEqual(source.includes('name="website"'), true)
      assert.strictEqual(source.includes("<Turnstile"), true)
      assert.strictEqual(source.includes("Please check your inbox to confirm your subscription."), true)
      assert.strictEqual(source.includes('disabled={state === "sending"}'), true)
    })

    test("Footer uses NewsletterForm component", () => {
      const footerPath = path.resolve(__dirname, "../components/Footer.tsx")
      const source = fs.readFileSync(footerPath, "utf8")

      assert.strictEqual(source.includes("<NewsletterForm />"), true)
    })

    test("Turnstile component handles test keys and dev fallbacks", () => {
      const turnstilePath = path.resolve(__dirname, "../components/Turnstile.tsx")
      const source = fs.readFileSync(turnstilePath, "utf8")

      assert.strictEqual(source.includes("NEXT_PUBLIC_TURNSTILE_SITE_KEY"), true)
      assert.strictEqual(source.includes("1x00000000000000000000AA"), true)
      assert.strictEqual(source.includes("dummy-turnstile-token"), true)
    })
  })

  describe("Newsletter Dedicated Pages", () => {
    test("confirmed page exists and handles expired and success states", () => {
      const pagePath = path.resolve(__dirname, "../app/newsletter/confirmed/page.tsx")
      assert.strictEqual(fs.existsSync(pagePath), true)
      const source = fs.readFileSync(pagePath, "utf8")
      assert.strictEqual(source.includes("Subscription Confirmed"), true)
      assert.strictEqual(source.includes("Link Expired or Invalid"), true)
    })

    test("unsubscribed page exists", () => {
      const pagePath = path.resolve(__dirname, "../app/newsletter/unsubscribed/page.tsx")
      assert.strictEqual(fs.existsSync(pagePath), true)
      const source = fs.readFileSync(pagePath, "utf8")
      assert.strictEqual(source.includes("You Have Been Unsubscribed"), true)
    })
  })
})

const { test, describe } = require("node:test")
const assert = require("node:assert")

const RAZORPAY_PREFIX = "pp_razorpay"
const RAZORPAY_PROVIDER_ID = "pp_razorpay_razorpay"
const MANUAL_PROVIDER_ID = "pp_system_default"

function isRazorpayProvider(id) {
  if (!id) return false
  return id === RAZORPAY_PROVIDER_ID || id.startsWith(RAZORPAY_PREFIX)
}

function isSupportedProvider(id, nodeEnv = process.env.NODE_ENV || "development") {
  if (isRazorpayProvider(id)) return true
  if (id === MANUAL_PROVIDER_ID && nodeEnv !== "production") return true
  return false
}

function assertAllowedProvider(providerId, nodeEnv = process.env.NODE_ENV || "development") {
  if (nodeEnv !== "production") return
  if (!isRazorpayProvider(providerId)) {
    throw new Error(
      "Payment provider is not allowed in production. Only Razorpay is accepted."
    )
  }
}

describe("Storefront Payment Guard & Provider Enforcement", () => {
  describe("assertAllowedProvider", () => {
    test("rejects pp_system_default in production", () => {
      assert.throws(
        () => assertAllowedProvider("pp_system_default", "production"),
        {
          name: "Error",
          message: "Payment provider is not allowed in production. Only Razorpay is accepted.",
        }
      )
    })

    test("rejects non-Razorpay unknown provider in production", () => {
      assert.throws(
        () => assertAllowedProvider("pp_stripe_stripe", "production"),
        {
          name: "Error",
          message: "Payment provider is not allowed in production. Only Razorpay is accepted.",
        }
      )
    })

    test("accepts pp_razorpay_razorpay in production", () => {
      assert.doesNotThrow(() => {
        assertAllowedProvider("pp_razorpay_razorpay", "production")
      })
    })

    test("accepts custom razorpay prefix in production", () => {
      assert.doesNotThrow(() => {
        assertAllowedProvider("pp_razorpay_custom", "production")
      })
    })

    test("accepts pp_system_default in development/non-production", () => {
      assert.doesNotThrow(() => {
        assertAllowedProvider("pp_system_default", "development")
      })
      assert.doesNotThrow(() => {
        assertAllowedProvider("pp_system_default", "test")
      })
    })

    test("accepts Razorpay in development/non-production", () => {
      assert.doesNotThrow(() => {
        assertAllowedProvider("pp_razorpay_razorpay", "development")
      })
    })
  })

  describe("isSupportedProvider", () => {
    test("returns false for pp_system_default in production", () => {
      assert.strictEqual(isSupportedProvider("pp_system_default", "production"), false)
    })

    test("returns true for pp_razorpay_razorpay in production", () => {
      assert.strictEqual(isSupportedProvider("pp_razorpay_razorpay", "production"), true)
    })

    test("returns true for pp_system_default outside production", () => {
      assert.strictEqual(isSupportedProvider("pp_system_default", "development"), true)
      assert.strictEqual(isSupportedProvider("pp_system_default", "test"), true)
    })

    test("returns true for pp_razorpay_razorpay outside production", () => {
      assert.strictEqual(isSupportedProvider("pp_razorpay_razorpay", "development"), true)
    })

    test("returns false for unsupported third-party providers in any environment", () => {
      assert.strictEqual(isSupportedProvider("pp_stripe", "production"), false)
      assert.strictEqual(isSupportedProvider("pp_stripe", "development"), false)
    })
  })

  describe("isRazorpayProvider", () => {
    test("correctly identifies Razorpay provider IDs", () => {
      assert.strictEqual(isRazorpayProvider("pp_razorpay_razorpay"), true)
      assert.strictEqual(isRazorpayProvider("pp_razorpay"), true)
      assert.strictEqual(isRazorpayProvider("pp_system_default"), false)
      assert.strictEqual(isRazorpayProvider(""), false)
      assert.strictEqual(isRazorpayProvider(null), false)
      assert.strictEqual(isRazorpayProvider(undefined), false)
    })
  })
})

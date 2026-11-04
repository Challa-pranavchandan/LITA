import {
  isAllowedProductionPaymentProvider,
  UPI_MANUAL_PROVIDER_ID,
} from "../check-production-config"

describe("production payment provider allowlist", () => {
  it("allows only Razorpay when manual UPI is disabled", () => {
    expect(isAllowedProductionPaymentProvider("pp_razorpay_razorpay", false)).toBe(true)
    expect(isAllowedProductionPaymentProvider(UPI_MANUAL_PROVIDER_ID, false)).toBe(false)
    expect(isAllowedProductionPaymentProvider("pp_system_default", false)).toBe(false)
  })

  it("allows Razorpay and manual UPI when the feature flag is enabled", () => {
    expect(isAllowedProductionPaymentProvider("pp_razorpay_razorpay", true)).toBe(true)
    expect(isAllowedProductionPaymentProvider(UPI_MANUAL_PROVIDER_ID, true)).toBe(true)
    expect(isAllowedProductionPaymentProvider("pp_system_default", true)).toBe(false)
    expect(isAllowedProductionPaymentProvider("pp_stripe_stripe", true)).toBe(false)
  })
})

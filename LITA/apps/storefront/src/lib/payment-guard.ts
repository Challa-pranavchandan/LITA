export const RAZORPAY_PREFIX = "pp_razorpay"
export const RAZORPAY_PROVIDER_ID = "pp_razorpay_razorpay"
export const MANUAL_PROVIDER_ID = "pp_system_default"

/**
 * Checks if a given provider identifier is a Razorpay payment provider.
 */
export function isRazorpayProvider(id?: string | null): boolean {
  if (!id) return false
  return id === RAZORPAY_PROVIDER_ID || id.startsWith(RAZORPAY_PREFIX)
}

/**
 * Checks if a payment provider is supported for the current environment.
 * In production, only Razorpay providers are accepted.
 * In development/test, manual payment (pp_system_default) is permitted for offline testing.
 */
export function isSupportedProvider(
  id: string,
  nodeEnv: string = process.env.NODE_ENV || "development"
): boolean {
  if (isRazorpayProvider(id)) return true
  if (id === MANUAL_PROVIDER_ID && nodeEnv !== "production") return true
  return false
}

/**
 * Asserts that the payment provider is permitted in the current environment.
 * Throws an Error if a non-Razorpay provider (such as pp_system_default)
 * is requested in production.
 */
export function assertAllowedProvider(
  providerId: string,
  nodeEnv: string = process.env.NODE_ENV || "development"
): void {
  if (nodeEnv !== "production") return
  if (!isRazorpayProvider(providerId)) {
    throw new Error(
      "Payment provider is not allowed in production. Only Razorpay is accepted."
    )
  }
}

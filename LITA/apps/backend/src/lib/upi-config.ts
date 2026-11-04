import { MedusaError } from "@medusajs/framework/utils"

const DEFAULT_UPI_ORDER_EXPIRY_HOURS = 48
const MIN_UPI_ORDER_EXPIRY_HOURS = 6
const MAX_UPI_ORDER_EXPIRY_HOURS = 168

let cachedExpiryHours: number | undefined

export function getUpiOrderExpiryHours(): number {
  if (cachedExpiryHours !== undefined) {
    return cachedExpiryHours
  }

  const rawValue = process.env.UPI_ORDER_EXPIRY_HOURS
  const expiryHours =
    rawValue === undefined || rawValue.trim() === ""
      ? DEFAULT_UPI_ORDER_EXPIRY_HOURS
      : Number(rawValue)

  if (
    !Number.isInteger(expiryHours) ||
    expiryHours < MIN_UPI_ORDER_EXPIRY_HOURS ||
    expiryHours > MAX_UPI_ORDER_EXPIRY_HOURS
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_ARGUMENT,
      `UPI_ORDER_EXPIRY_HOURS must be an integer between ${MIN_UPI_ORDER_EXPIRY_HOURS} and ${MAX_UPI_ORDER_EXPIRY_HOURS}.`
    )
  }

  cachedExpiryHours = expiryHours
  return expiryHours
}

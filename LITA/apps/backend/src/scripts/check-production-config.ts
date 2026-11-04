import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

const RAZORPAY_PREFIX = "pp_razorpay"
export const UPI_MANUAL_PROVIDER_ID = "pp_upimanual_upimanual"

export function isAllowedProductionPaymentProvider(
  providerId: string,
  enableUpiManual = process.env.ENABLE_UPI_MANUAL === "true"
): boolean {
  return (
    providerId === "pp_razorpay_razorpay" ||
    (enableUpiManual && providerId === UPI_MANUAL_PROVIDER_ID)
  )
}

/**
 * check-production-config
 *
 * Run with:
 *   cd apps/backend && npm run check:prod-config
 *
 * Exits 1 if any region has a payment provider other than Razorpay (and
 * optionally manual UPI), or if any region uses a currency other than INR.
 */
export default async function checkProductionConfig({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  logger.info("Checking production payment and currency configuration...")

  const { data: regions } = await query.graph({
    entity: "region",
    fields: [
      "id",
      "name",
      "currency_code",
      "payment_providers.*",
    ],
  })

  if (!regions || regions.length === 0) {
    logger.warn("No regions found in the database.")
    process.exit(1)
  }

  const failures: string[] = []

  for (const region of regions) {
    const regionLabel = `Region "${region.name}" (${region.id})`

    // Currency check
    if ((region.currency_code as string)?.toLowerCase() !== "inr") {
      failures.push(
        `${regionLabel} has currency "${region.currency_code}" — only "inr" is allowed`
      )
    }

    // Payment provider check
    const providers = (region.payment_providers ?? []) as Array<{ id: string }>
    if (providers.length === 0) {
      failures.push(`${regionLabel} has no payment providers configured`)
      continue
    }

    for (const provider of providers) {
      if (!isAllowedProductionPaymentProvider(provider.id)) {
        failures.push(
          process.env.ENABLE_UPI_MANUAL === "true"
            ? `${regionLabel} has unsupported provider "${provider.id}" — only "pp_razorpay_razorpay" and "${UPI_MANUAL_PROVIDER_ID}" are allowed`
            : `${regionLabel} has non-Razorpay provider "${provider.id}" — only "pp_razorpay_razorpay" is allowed`
        )
      }
    }
  }

  if (failures.length > 0) {
    logger.error("Production configuration check FAILED:")
    for (const failure of failures) {
      logger.error(`  - ${failure}`)
    }
    logger.error(
      "Fix: In Medusa Admin > Settings > Regions, ensure every region uses INR " +
      `and has only ${process.env.ENABLE_UPI_MANUAL === "true" ? "Razorpay or manual UPI" : "the Razorpay provider"} enabled. ` +
      "Delete any demo EUR/USD regions."
    )
    process.exit(1)
  }

  logger.info(
    process.env.ENABLE_UPI_MANUAL === "true"
      ? `Production configuration check PASSED: ${regions.length} region(s) checked, all use INR and Razorpay or manual UPI only.`
      : `Production configuration check PASSED: ${regions.length} region(s) checked, all use INR and Razorpay only.`
  )
}

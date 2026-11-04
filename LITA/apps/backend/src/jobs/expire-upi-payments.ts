import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { UPI_PAYMENT_MODULE } from "../modules/upi-payment"
import { getUpiOrderExpiryHours } from "../lib/upi-config"
import {
  expireUpiPaymentWorkflow,
  type UpipaymentsService,
} from "../workflows/upi-payments"

type UpipaymentsJobService = UpipaymentsService & {
  listAndCountUpiPayments: (
    filters: { status: "awaiting_proof" | "rejected" },
    config: { order: { expires_at: "ASC" }; take: number; skip: number }
  ) => Promise<[Array<{ id: string; expires_at: Date | string }>, number]>
}

export default async function expireUpiPaymentsJob(container: MedusaContainer) {
  if (
    process.env.ENABLE_UPI_MANUAL !== "true" ||
    process.env.MEDUSA_WORKER_MODE === "server"
  ) {
    return
  }

  getUpiOrderExpiryHours()

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const paymentService = container.resolve<UpipaymentsJobService>(
    UPI_PAYMENT_MODULE
  )
  const now = Date.now()
  const candidates: Array<{ id: string; expires_at: Date | string }> = []

  for (const status of ["awaiting_proof", "rejected"] as const) {
    let skip = 0
    const take = 500

    while (true) {
      const [payments] = await paymentService.listAndCountUpiPayments(
        { status },
        { order: { expires_at: "ASC" }, take, skip }
      )
      if (!payments.length) break
      candidates.push(...payments)

      if (payments.length < take) break
      skip += take
    }
  }

  for (const payment of candidates) {
    if (new Date(payment.expires_at).getTime() > now) continue
    try {
      await expireUpiPaymentWorkflow(container).run({
        input: { id: payment.id },
      })
    } catch {
      logger.error(
        `[expire-upi-payments] Failed to expire payment ${payment.id}`
      )
    }
  }
}

export const config = {
  name: "expire-upi-payments",
  schedule: "0 * * * *",
}

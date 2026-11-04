import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ensureUpiPaymentForOrderWorkflow } from "../workflows/upi-payments"

export default async function upiOrderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  if (!data?.id) {
    return
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "payment_collections.payment_sessions.provider_id",
    ],
    filters: { id: data.id },
  })
  const paymentCollections = orders?.[0]?.payment_collections ?? []
  const usesManualUpi = paymentCollections
    .flatMap((collection) => collection?.payment_sessions ?? [])
    .some((session) => session?.provider_id === "pp_upimanual_upimanual")

  if (!usesManualUpi) {
    return
  }

  await ensureUpiPaymentForOrderWorkflow(container).run({
    input: { order_id: data.id },
  })
}

export const config: SubscriberConfig = {
  event: "order.placed",
}

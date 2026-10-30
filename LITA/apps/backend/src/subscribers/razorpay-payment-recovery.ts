import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { PaymentWebhookEvents } from "@medusajs/framework/utils"
import { reconcileRazorpayOrderWorkflow } from "../workflows/reconcile-razorpay-order"

export default async function razorpayPaymentRecoveryHandler({
  event,
  container,
}: SubscriberArgs<any>) {
  const data = event.data
  const provider = data?.provider

  // Only handle Razorpay payment webhooks
  if (provider !== "pp_razorpay_razorpay" && provider !== "razorpay") {
    return
  }

  const payload = data?.payload
  const webhookData = payload?.data
  const eventName = webhookData?.event

  // Only reconcile on payment confirmation events
  if (
    eventName !== "payment.captured" &&
    eventName !== "payment.authorized" &&
    eventName !== "order.paid"
  ) {
    return
  }

  const paymentEntity = webhookData?.payload?.payment?.entity
  const orderEntity = webhookData?.payload?.order?.entity
  const entity = paymentEntity || orderEntity

  const paymentId = paymentEntity?.id
  const orderId = paymentEntity?.order_id || orderEntity?.id
  const sessionId =
    entity?.notes?.session_id ||
    paymentEntity?.notes?.session_id ||
    orderEntity?.notes?.session_id

  if (!paymentId || !sessionId) {
    return
  }

  // Execute business logic in workflow
  await reconcileRazorpayOrderWorkflow(container).run({
    input: {
      payment_id: paymentId,
      order_id: orderId || "",
      session_id: sessionId,
      amount: entity?.amount_paid ?? entity?.amount ?? 0,
    },
  })
}

export const config: SubscriberConfig = {
  event: PaymentWebhookEvents.WebhookReceived,
  context: {
    subscriberId: "razorpay-payment-recovery-handler",
  },
}

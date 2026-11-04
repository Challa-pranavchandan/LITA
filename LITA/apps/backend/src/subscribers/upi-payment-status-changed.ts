import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import {
  upiPaymentExpiredTemplate,
  upiPaymentInstructionsTemplate,
  upiPaymentRejectedTemplate,
  upiPaymentVerifiedTemplate,
  upiProofReceivedStudioTemplate,
} from "../modules/resend/emails/templates"
import { UPI_PAYMENT_MODULE } from "../modules/upi-payment"

type UpiPaymentStatus = "awaiting_proof" | "submitted" | "verified" | "rejected" | "expired"

type UpiPaymentStatusChangedData = {
  id: string
  status: UpiPaymentStatus
}

type UpiPaymentRecord = {
  id: string
  reference_code: string
  order_id: string | null
  email: string
  amount: number
  currency_code: string
  status: UpiPaymentStatus
  utr: string | null
  reject_reason: string | null
  expires_at: Date | string
}

type UpiPaymentService = {
  listUpiPayments: (
    filters: { id: string },
    config: { take: number }
  ) => Promise<UpiPaymentRecord[]>
}

type NotificationService = {
  createNotifications: (input: {
    to: string
    channel: "email"
    template: string
    data: Record<string, unknown>
    content: { subject: string; html: string }
  }) => Promise<unknown>
}

type OrderQuery = {
  graph: (input: Record<string, unknown>) => Promise<{
    data?: Array<{ display_id?: number; id: string }>
  }>
}

export default async function upiPaymentStatusChangedHandler({
  event: { data },
  container,
}: SubscriberArgs<UpiPaymentStatusChangedData>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  if (process.env.ENABLE_UPI_MANUAL !== "true" || !data?.id || !data.status) {
    return
  }

  try {
    const paymentService = container.resolve<UpiPaymentService>(UPI_PAYMENT_MODULE)
    const payment = (await paymentService.listUpiPayments(
      { id: data.id },
      { take: 1 }
    ))[0]

    if (!payment || payment.status !== data.status || !payment.order_id) {
      logger.warn(
        `[upi-payment-status-changed] Skipped payment ${data.id} status ${data.status}`
      )
      return
    }

    const query = container.resolve<OrderQuery>(ContainerRegistrationKeys.QUERY)
    const { data: orders } = await query.graph({
      entity: "order",
      fields: ["id", "display_id"],
      filters: { id: payment.order_id },
    })
    const order = orders?.[0]
    const orderNumber = order?.display_id
      ? `#${order.display_id}`
      : `#${payment.order_id.slice(-6).toUpperCase()}`
    const storefrontUrl = (
      process.env.STOREFRONT_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      "http://localhost:8000"
    ).replace(/\/$/, "")
    const commonData = {
      referenceCode: payment.reference_code,
      amount: Number(payment.amount),
      currencyCode: payment.currency_code,
      orderId: payment.order_id,
      orderNumber,
      storefrontUrl,
    }

    let template: string
    let recipient: string
    let rendered: { subject: string; html: string }

    switch (data.status) {
      case "awaiting_proof":
        template = "upi-payment-instructions"
        recipient = payment.email
        rendered = upiPaymentInstructionsTemplate({
          ...commonData,
          vpa: process.env.UPI_VPA || "",
          payeeName: process.env.UPI_PAYEE_NAME || "",
          deadline: new Date(payment.expires_at).toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "Asia/Kolkata",
          }),
        })
        break
      case "submitted": {
        template = "upi-proof-received-studio"
        recipient = process.env.STUDIO_EMAIL || ""
        const adminUrl = (
          process.env.MEDUSA_ADMIN_URL ||
          process.env.MEDUSA_BACKEND_URL ||
          "http://localhost:9000"
        ).replace(/\/$/, "")
        rendered = upiProofReceivedStudioTemplate({
          ...commonData,
          utrLast4: payment.utr?.replace(/\D/g, "").slice(-4),
          adminUrl: `${adminUrl}/app/upi-payments`,
        })
        break
      }
      case "verified":
        template = "upi-payment-verified"
        recipient = payment.email
        rendered = upiPaymentVerifiedTemplate(commonData)
        break
      case "rejected":
        template = "upi-payment-rejected"
        recipient = payment.email
        rendered = upiPaymentRejectedTemplate({
          ...commonData,
          rejectReason: payment.reject_reason || "",
        })
        break
      case "expired":
        template = "upi-payment-expired"
        recipient = payment.email
        rendered = upiPaymentExpiredTemplate(commonData)
        break
    }

    if (!recipient) {
      logger.warn(
        `[upi-payment-status-changed] Missing recipient for payment ${data.id} status ${data.status}`
      )
      return
    }

    const notificationService = container.resolve<NotificationService>(
      Modules.NOTIFICATION
    )
    await notificationService.createNotifications({
      to: recipient,
      channel: "email",
      template,
      data: commonData,
      content: rendered,
    })
    logger.info(
      `[upi-payment-status-changed] Sent notification for payment ${data.id} status ${data.status}`
    )
  } catch {
    logger.error(
      `[upi-payment-status-changed] Failed notification for payment ${data.id} status ${data.status}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "upi_payment.status_changed",
}

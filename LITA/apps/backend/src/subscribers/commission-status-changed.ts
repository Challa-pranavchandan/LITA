import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { commissionStatusTemplate } from "../modules/resend/emails/templates"

type CommissionStatusChangedData = {
  id: string
  customer_id: string
  title: string
  status: string
  previous_status?: string
  quoted_price?: number
  currency_code?: string
  admin_notes?: string
  order_id?: string
}

export default async function commissionStatusChangedHandler({
  event: { data },
  container,
}: SubscriberArgs<CommissionStatusChangedData>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  if (!data?.customer_id || !data?.status) {
    logger.warn("[commission-status-changed] Missing customer_id or status in event payload.")
    return
  }

  // Only dispatch for notable customer-facing statuses
  const notifiedStatuses = ["quoted", "accepted", "converted", "rejected", "cancelled"]
  const normalizedStatus = data.status.toLowerCase().trim()
  if (!notifiedStatuses.includes(normalizedStatus)) {
    logger.debug(
      `[commission-status-changed] Status '${data.status}' does not trigger email notification. Skipping.`
    )
    return
  }

  const storefrontUrl = (
    process.env.STOREFRONT_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "http://localhost:8000"
  ).replace(/\/$/, "")

  try {
    let customer: any = null

    // Try resolving customer details via Customer Module service
    try {
      const customerService: any = container.resolve(Modules.CUSTOMER)
      customer = await customerService.retrieveCustomer(data.customer_id)
    } catch (custErr: any) {
      logger.debug(
        `[commission-status-changed] Direct customer retrieval fallback: ${custErr?.message}`
      )
    }

    // Fallback to query graph if direct service failed
    if (!customer) {
      try {
        const query: any = container.resolve(ContainerRegistrationKeys.QUERY)
        const { data: customers } = await query.graph({
          entity: "customer",
          fields: ["id", "email", "first_name", "last_name"],
          filters: { id: data.customer_id },
        })
        customer = customers?.[0]
      } catch (queryErr: any) {
        logger.debug(
          `[commission-status-changed] Query graph lookup failed: ${queryErr?.message}`
        )
      }
    }

    const email = customer?.email
    if (!email) {
      logger.warn(
        `[commission-status-changed] Could not find customer email for customer ID ${data.customer_id}.`
      )
      return
    }

    const customerName =
      [customer.first_name, customer.last_name].filter(Boolean).join(" ") || undefined

    const templateData = {
      title: data.title || "Bespoke Artwork",
      customerName,
      status: normalizedStatus,
      quotedPrice: data.quoted_price ? Number(data.quoted_price) : undefined,
      currencyCode: (data.currency_code || "inr").toLowerCase(),
      adminNotes: data.admin_notes,
      orderId: data.order_id,
      storefrontUrl,
    }

    const { subject, html } = commissionStatusTemplate(templateData)

    const notificationService: any = container.resolve(Modules.NOTIFICATION)
    await notificationService.createNotifications({
      to: email,
      channel: "email",
      template: `commission-${normalizedStatus}`,
      data: templateData,
      content: { subject, html },
    })

    logger.info(
      `[commission-status-changed] Dispatched '${normalizedStatus}' notification for commission '${data.title}' to ${email}`
    )
  } catch (err: any) {
    logger.error(
      `[commission-status-changed] Failed to send commission status notification: ${err?.message || err}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "commission.status_changed",
}

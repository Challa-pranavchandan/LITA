import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  Modules,
  OrderWorkflowEvents,
} from "@medusajs/framework/utils"
import { orderFulfillmentTemplate } from "../modules/resend/emails/templates"

type FulfillmentCreatedData = {
  order_id?: string
  id?: string
  fulfillment_id?: string
  no_notification?: boolean
}

export default async function orderFulfillmentCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<FulfillmentCreatedData>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  // Respect no_notification flag set by admin or system workflows
  if (data?.no_notification) {
    logger.debug("[order-fulfillment-created] no_notification is true. Skipping email dispatch.")
    return
  }

  const orderId = data?.order_id
  const fulfillmentId = data?.fulfillment_id || data?.id

  if (!orderId) {
    logger.warn("[order-fulfillment-created] No order_id provided in event payload.")
    return
  }

  const storefrontUrl = (
    process.env.STOREFRONT_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "http://localhost:8000"
  ).replace(/\/$/, "")

  try {
    let order: any = null
    let fulfillment: any = null

    // Attempt Query graph resolution first
    try {
      const query: any = container.resolve(ContainerRegistrationKeys.QUERY)
      if (query?.graph) {
        const { data: orders } = await query.graph({
          entity: "order",
          fields: [
            "id",
            "display_id",
            "email",
            "currency_code",
            "shipping_address.*",
            "customer.*",
            "items.*",
          ],
          filters: { id: orderId },
        })
        order = orders?.[0]

        if (fulfillmentId) {
          const { data: fulfillments } = await query.graph({
            entity: "fulfillment",
            fields: [
              "id",
              "provider_id",
              "tracking_numbers",
              "tracking_links",
              "labels.*",
              "items.*",
            ],
            filters: { id: fulfillmentId },
          })
          fulfillment = fulfillments?.[0]
        }
      }
    } catch (queryErr: any) {
      logger.debug(`[order-fulfillment-created] Query graph lookup fallback: ${queryErr?.message}`)
    }

    // Fallback to Order Module service if not found
    if (!order) {
      try {
        const orderService: any = container.resolve(Modules.ORDER)
        order = await orderService.retrieveOrder(orderId, {
          relations: ["items", "shipping_address"],
        })
      } catch (svcErr: any) {
        logger.error(`[order-fulfillment-created] Could not retrieve order ${orderId}: ${svcErr?.message}`)
        return
      }
    }

    if (!order) {
      logger.warn(`[order-fulfillment-created] Order ${orderId} not found.`)
      return
    }

    const email = order.email || order.customer?.email
    if (!email) {
      logger.warn(`[order-fulfillment-created] Order ${orderId} has no customer email address.`)
      return
    }

    const customerName =
      [order.shipping_address?.first_name, order.shipping_address?.last_name]
        .filter(Boolean)
        .join(" ") ||
      [order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(" ") ||
      undefined

    // Extract tracking numbers & URLs
    const trackingNumbers: string[] = []
    const trackingUrls: string[] = []

    if (Array.isArray(fulfillment?.tracking_numbers)) {
      trackingNumbers.push(...fulfillment.tracking_numbers)
    }
    if (Array.isArray(fulfillment?.tracking_links)) {
      trackingUrls.push(...fulfillment.tracking_links)
    }
    if (Array.isArray(fulfillment?.labels)) {
      for (const label of fulfillment.labels) {
        if (label.tracking_number && !trackingNumbers.includes(label.tracking_number)) {
          trackingNumbers.push(label.tracking_number)
        }
        if (label.tracking_url && !trackingUrls.includes(label.tracking_url)) {
          trackingUrls.push(label.tracking_url)
        }
      }
    }

    const items = (order.items || []).map((item: any) => ({
      title: item.title || item.product_title || "Artwork",
      quantity: Number(item.quantity || 1),
    }))

    const templateData = {
      orderId: order.id,
      displayId: order.display_id,
      customerName,
      fulfillmentId: fulfillmentId || "fulfilled",
      trackingNumbers: trackingNumbers.length ? trackingNumbers : undefined,
      trackingUrls: trackingUrls.length ? trackingUrls : undefined,
      carrier: fulfillment?.provider_id,
      items,
      storefrontUrl,
    }

    const { subject, html } = orderFulfillmentTemplate(templateData)

    const notificationService: any = container.resolve(Modules.NOTIFICATION)
    await notificationService.createNotifications({
      to: email,
      channel: "email",
      template: "order-shipped",
      data: templateData,
      content: { subject, html },
    })

    logger.info(
      `[order-fulfillment-created] Dispatched shipment notification for order #${order.display_id || order.id} to ${email}`
    )
  } catch (err: any) {
    logger.error(
      `[order-fulfillment-created] Failed to process fulfillment notification: ${err?.message || err}`
    )
  }
}

export const config: SubscriberConfig = {
  event: [
    OrderWorkflowEvents.FULFILLMENT_CREATED,
    "fulfillment.created",
  ],
}

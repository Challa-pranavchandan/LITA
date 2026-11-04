import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  Modules,
  OrderWorkflowEvents,
} from "@medusajs/framework/utils"
import {
  orderPlacedTemplate,
  upiOrderPlacedTemplate,
} from "../modules/resend/emails/templates"

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  if (!data?.id) {
    return
  }

  const storefrontUrl = (
    process.env.STOREFRONT_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "http://localhost:8000"
  ).replace(/\/$/, "")

  try {
    let order: any = null

    // Try Query graph first to fetch comprehensive order relations
    try {
      const query: any = container.resolve(ContainerRegistrationKeys.QUERY)
      if (query?.graph) {
        const orderFields = [
          "id",
          "display_id",
          "status",
          "email",
          "total",
          "subtotal",
          "shipping_total",
          "tax_total",
          "discount_total",
          "currency_code",
          "created_at",
          "items.*",
          "shipping_address.*",
          "customer.*",
        ]
        if (process.env.ENABLE_UPI_MANUAL === "true") {
          orderFields.push(
            "payment_collections.payment_sessions.provider_id",
            "payment_collections.payments.provider_id"
          )
        }
        const { data: orders } = await query.graph({
          entity: "order",
          fields: orderFields,
          filters: { id: data.id },
        })
        order = orders?.[0]
      }
    } catch (queryErr: any) {
      logger.debug(`[order-placed] Query graph lookup fallback: ${queryErr?.message}`)
    }

    // Fallback to Order Module service if query graph was unavailable
    if (!order) {
      try {
        const orderService: any = container.resolve(Modules.ORDER)
        const relations = ["items", "shipping_address"]
        if (process.env.ENABLE_UPI_MANUAL === "true") {
          relations.push("payment_collections", "payment_collections.payments")
        }
        order = await orderService.retrieveOrder(data.id, {
          relations,
        })
      } catch (svcErr: any) {
        logger.error(`[order-placed] Could not retrieve order ${data.id}: ${svcErr?.message}`)
        return
      }
    }

    if (!order) {
      logger.warn(`[order-placed] Order ${data.id} not found.`)
      return
    }

    const email = order.email || order.customer?.email
    if (!email) {
      logger.warn(`[order-placed] Order ${data.id} has no customer email address.`)
      return
    }

    const items = (order.items || []).map((item: any) => ({
      title: item.title || item.product_title || "Artwork",
      quantity: Number(item.quantity || 1),
      unitPrice: Number(item.unit_price || 0),
      thumbnail: item.thumbnail,
    }))

    const customerName =
      [order.shipping_address?.first_name, order.shipping_address?.last_name]
        .filter(Boolean)
        .join(" ") ||
      [order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(" ") ||
      undefined

    const shippingAddress = order.shipping_address
      ? {
          firstName: order.shipping_address.first_name,
          lastName: order.shipping_address.last_name,
          address1: order.shipping_address.address_1,
          address2: order.shipping_address.address_2,
          city: order.shipping_address.city,
          province: order.shipping_address.province,
          postalCode: order.shipping_address.postal_code,
          countryCode: order.shipping_address.country_code,
        }
      : undefined

    const templateData = {
      orderId: order.id,
      displayId: order.display_id,
      customerName,
      customerEmail: email,
      items,
      subtotal: Number(order.subtotal ?? order.total ?? 0),
      shippingTotal: order.shipping_total !== undefined ? Number(order.shipping_total) : undefined,
      taxTotal: order.tax_total !== undefined ? Number(order.tax_total) : undefined,
      discountTotal: order.discount_total !== undefined ? Number(order.discount_total) : undefined,
      total: Number(order.total ?? 0),
      currencyCode: String(order.currency_code || "inr").toLowerCase(),
      shippingAddress,
      storefrontUrl,
    }

    const isUpiOrder =
      process.env.ENABLE_UPI_MANUAL === "true" &&
      order.payment_collections?.some((collection: any) =>
        [...(collection.payment_sessions || []), ...(collection.payments || [])]
          .some((payment: any) => payment.provider_id === "pp_upimanual_upimanual")
      )
    const { subject, html } = isUpiOrder
      ? upiOrderPlacedTemplate(templateData)
      : orderPlacedTemplate(templateData)

    const notificationService: any = container.resolve(Modules.NOTIFICATION)
    await notificationService.createNotifications({
      to: email,
      channel: "email",
      template: isUpiOrder ? "upi-order-placed" : "order-placed",
      data: templateData,
      content: { subject, html },
    })

    logger.info(`[order-placed] Dispatched order confirmation email for order #${order.display_id || order.id} to ${email}`)
  } catch (err: any) {
    logger.error(`[order-placed] Failed to process order placed notification: ${err?.message || err}`)
  }
}

export const config: SubscriberConfig = {
  event: [OrderWorkflowEvents.PLACED, "order.created"],
}

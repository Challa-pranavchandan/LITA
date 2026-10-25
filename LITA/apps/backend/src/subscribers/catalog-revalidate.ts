import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function catalogRevalidateHandler({
  event,
  container,
}: SubscriberArgs<Record<string, unknown>>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  const storefrontUrl = (
    process.env.STOREFRONT_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "http://localhost:8000"
  ).replace(/\/$/, "")

  const secret = process.env.REVALIDATE_SECRET
  if (!secret) {
    logger.warn(
      `[catalog-revalidate] REVALIDATE_SECRET not set in backend .env. Storefront won't auto-update on ${event.name}.`
    )
    return
  }

  try {
    const res = await fetch(`${storefrontUrl}/api/revalidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret,
        event: event.name,
      }),
    })

    if (res.ok) {
      logger.info(`[catalog-revalidate] Successfully refreshed storefront cache for '${event.name}'`)
    } else {
      const errText = await res.text()
      logger.warn(`[catalog-revalidate] Storefront revalidate returned (${res.status}): ${errText}`)
    }
  } catch (err) {
    logger.debug(`[catalog-revalidate] Storefront ping failed (storefront may be offline): ${err}`)
  }
}

export const config: SubscriberConfig = {
  event: [
    "product.created",
    "product.updated",
    "product.deleted",
    "product-category.created",
    "product-category.updated",
    "product-category.deleted",
    "product_category.created",
    "product_category.updated",
    "product_category.deleted",
    "product-collection.created",
    "product-collection.updated",
    "product-collection.deleted",
    "product_collection.created",
    "product_collection.updated",
    "product_collection.deleted",
    "product-variant.created",
    "product-variant.updated",
    "product-variant.deleted",
    "product_variant.created",
    "product_variant.updated",
    "product_variant.deleted",
    "inventory-item.updated",
    "inventory-level.updated",
    "price-list.created",
    "price-list.updated",
    "price-list.deleted",
  ],
}

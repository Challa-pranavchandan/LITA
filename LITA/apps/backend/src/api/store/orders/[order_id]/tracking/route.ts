import type { MedusaStoreRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

type OrderFulfillmentReference = { id: string }
type TrackingLabel = {
  tracking_number?: string | null
  tracking_url?: string | null
}
type FulfillmentTrackingRecord = {
  id: string
  tracking_numbers?: string[] | null
  tracking_links?: string[] | null
  labels?: TrackingLabel[] | null
}
type GraphQuery = {
  graph<T>(input: {
    entity: string
    fields: string[]
    filters: Record<string, string>
  }): Promise<{ data: T[] }>
}

export async function GET(req: MedusaStoreRequest, res: MedusaResponse) {
  const query = req.scope.resolve<GraphQuery>(ContainerRegistrationKeys.QUERY)
  const { data: orders } = await query.graph<{
    id: string
    fulfillments?: OrderFulfillmentReference[] | null
  }>({
    entity: "order",
    fields: ["id", "fulfillments.id"],
    filters: { id: req.params.order_id },
  })

  const order = orders[0]
  if (!order) {
    return res.status(404).json({ message: "Order not found." })
  }

  const fulfillmentIds = [...new Set(
    (order.fulfillments ?? []).map(({ id }) => id).filter(Boolean)
  )]
  const fulfillments = await Promise.all(
    fulfillmentIds.map(async (id) => {
      const { data } = await query.graph<FulfillmentTrackingRecord>({
        entity: "fulfillment",
        fields: ["id", "tracking_numbers", "tracking_links", "labels.*"],
        filters: { id },
      })
      const fulfillment = data[0]
      if (!fulfillment) return null

      const trackingNumbers = [
        ...(fulfillment.tracking_numbers ?? []),
        ...(fulfillment.labels ?? [])
          .map(({ tracking_number }) => tracking_number)
          .filter((number): number is string => Boolean(number)),
      ]
      const trackingUrls = [
        ...(fulfillment.tracking_links ?? []),
        ...(fulfillment.labels ?? [])
          .map(({ tracking_url }) => tracking_url)
          .filter((url): url is string => Boolean(url)),
      ]

      return {
        id: fulfillment.id,
        tracking_numbers: [...new Set(trackingNumbers)],
        tracking_urls: [...new Set(trackingUrls)],
      }
    })
  )

  return res.status(200).json({
    fulfillments: fulfillments.filter((fulfillment) => fulfillment !== null),
  })
}

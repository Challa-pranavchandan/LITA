"use server";

import { FetchError } from "@medusajs/js-sdk";
import { sdk } from "@/lib/medusa";

export type OrderTrackingFulfillment = {
  id: string;
  tracking_numbers: string[];
  tracking_urls: string[];
};

type OrderTrackingResult =
  | { fulfillments: OrderTrackingFulfillment[]; error?: never }
  | { fulfillments: []; error: string };

export async function getOrderTracking(
  orderId: string
): Promise<OrderTrackingResult> {
  try {
    const response = await sdk.client.fetch<{
      fulfillments: OrderTrackingFulfillment[];
    }>(`/store/orders/${encodeURIComponent(orderId)}/tracking`, {
      method: "GET",
      next: { revalidate: 0 },
    });
    return { fulfillments: response.fulfillments };
  } catch (error) {
    const message =
      error instanceof FetchError && error.status === 404
        ? "Order tracking details could not be found."
        : "Order tracking details could not be loaded. Please try again.";
    console.error("[medusa] Failed to fetch order tracking:", error);
    return { fulfillments: [], error: message };
  }
}

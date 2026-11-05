"use client";

import { useEffect, useState } from "react";
import { getOrder } from "@/lib/data/cart";
import {
  getOrderTracking,
  type OrderTrackingFulfillment,
} from "@/lib/data/order-tracking";
import { getCustomerOrderStatus } from "@/lib/order-status";

const REFRESH_INTERVAL = 15_000;

type LiveOrderStatusProps = {
  orderId: string;
  initialStatus: string;
  initialPaymentStatus: string | null | undefined;
  initialFulfillmentStatus: string | null | undefined;
  initialTracking: OrderTrackingFulfillment[];
  initialTrackingError: string | null;
};

function displayStatus(status?: string | null): string {
  return status?.replaceAll("_", " ") || "Pending";
}

function safeTrackingUrl(url: string): string | null {
  try {
    const parsedUrl = new URL(url);
    return ["http:", "https:"].includes(parsedUrl.protocol)
      ? parsedUrl.toString()
      : null;
  } catch {
    return null;
  }
}

export function LiveOrderStatus({
  orderId,
  initialStatus,
  initialPaymentStatus,
  initialFulfillmentStatus,
  initialTracking,
  initialTrackingError,
}: LiveOrderStatusProps) {
  const [status, setStatus] = useState(initialStatus);
  const [paymentStatus, setPaymentStatus] = useState(initialPaymentStatus);
  const [fulfillmentStatus, setFulfillmentStatus] = useState(
    initialFulfillmentStatus
  );
  const [tracking, setTracking] = useState(initialTracking);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [trackingError, setTrackingError] = useState(initialTrackingError);

  useEffect(() => {
    let active = true;
    let refreshing = false;

    const refreshStatus = async () => {
      if (refreshing || document.visibilityState !== "visible") return;
      refreshing = true;

      try {
        const [order, trackingResult] = await Promise.all([
          getOrder(orderId),
          getOrderTracking(orderId),
        ]);
        if (!active) return;
        if (!order) {
          setRefreshError(
            "Order status could not be refreshed. Showing the latest available information."
          );
          return;
        }

        setStatus(order.status);
        setPaymentStatus(order.payment_status);
        setFulfillmentStatus(order.fulfillment_status);
        setRefreshError(null);
        if (trackingResult.error) {
          setTrackingError(trackingResult.error);
        } else {
          setTracking(trackingResult.fulfillments);
          setTrackingError(null);
        }
      } finally {
        refreshing = false;
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshStatus();
      }
    };
    const interval = window.setInterval(refreshWhenVisible, REFRESH_INTERVAL);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [orderId]);

  const hasTracking = tracking.some(
    ({ tracking_numbers, tracking_urls }) =>
      tracking_numbers.length > 0 || tracking_urls.length > 0
  );

  return (
    <section
      aria-labelledby="order-status-heading"
      className="mt-8 border border-dust bg-wall p-5 sm:p-6"
    >
      <h2 id="order-status-heading" className="text-xl">
        Order status
      </h2>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-graphite">Order</dt>
          <dd className="mt-1 font-medium capitalize">
            {getCustomerOrderStatus({
              orderStatus: status,
              paymentStatus,
              fulfillmentStatus,
            })}
          </dd>
        </div>
        <div>
          <dt className="text-graphite">Payment</dt>
          <dd className="mt-1 font-medium capitalize">
            {displayStatus(paymentStatus)}
          </dd>
        </div>
        <div>
          <dt className="text-graphite">Fulfillment</dt>
          <dd className="mt-1 font-medium capitalize">
            {displayStatus(fulfillmentStatus ?? "not_fulfilled")}
          </dd>
        </div>
      </dl>

      <div className="mt-5 border-t border-dust pt-4">
        <h3 className="text-sm font-medium">Tracking</h3>
        {trackingError ? (
          <p role="alert" className="mt-2 text-sm text-red-700">
            {trackingError}
          </p>
        ) : hasTracking ? (
          <ul className="mt-2 space-y-3 text-sm">
            {tracking.map((fulfillment) => (
              <li key={fulfillment.id}>
                {fulfillment.tracking_numbers.map((number) => (
                  <p key={number} className="tabular-nums">
                    Tracking number: {number}
                  </p>
                ))}
                {fulfillment.tracking_urls.map((url) => {
                  const safeUrl = safeTrackingUrl(url);
                  return safeUrl ? (
                    <a
                      key={url}
                      href={safeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block underline underline-offset-4"
                    >
                      Track shipment
                    </a>
                  ) : (
                    <p key={url} className="mt-1 break-all text-graphite">
                      Tracking link: {url}
                    </p>
                  );
                })}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-graphite">
            Tracking details will appear here once your order ships.
          </p>
        )}
      </div>
      {refreshError && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {refreshError}
        </p>
      )}
      <p className="mt-3 text-xs text-graphite" aria-live="polite">
        Order and tracking updates refresh automatically every 15 seconds.
      </p>
    </section>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import type { HttpTypes } from "@medusajs/types";
import { getOrder } from "@/lib/data/cart";
import {
  getOrderTracking,
  type OrderTrackingFulfillment,
} from "@/lib/data/order-tracking";
import {
  getOrderState,
  formatOrderMoney,
  type OrderWithPaymentMeta,
} from "@/lib/order-state";
import { OrderTimelineStepper } from "./OrderTimelineStepper";
import { OrderStatusLine } from "./OrderStatusLine";
import { OrderSummaryCard } from "./OrderSummaryCard";
import { UpiPayPanel } from "@/components/upi/UpiPayPanel";
import type { UpiPaymentInstructions } from "@/lib/data/upi";

const REFRESH_INTERVAL = 15_000;

interface LiveOrderDetailProps {
  initialOrder: HttpTypes.StoreOrder;
  initialUpiPayment?: UpiPaymentInstructions | null;
  initialTracking?: OrderTrackingFulfillment[];
  initialTrackingError?: string | null;
  showUpiQuery?: boolean;
}

function safeTrackingUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export function LiveOrderDetail({
  initialOrder,
  initialUpiPayment,
  initialTracking = [],
  initialTrackingError = null,
  showUpiQuery = false,
}: LiveOrderDetailProps) {
  const [order, setOrder] = useState<HttpTypes.StoreOrder>(initialOrder);
  const [tracking, setTracking] = useState<OrderTrackingFulfillment[]>(initialTracking);
  const [trackingError, setTrackingError] = useState<string | null>(initialTrackingError);

  const orderWithMeta: OrderWithPaymentMeta = {
    ...order,
    upiPayment: initialUpiPayment,
  };

  const state = getOrderState(orderWithMeta);

  // Non-terminal states: only poll if state is "pending_payment" or "shipped"
  const isNonTerminal = state.key === "pending_payment" || state.key === "shipped";

  useEffect(() => {
    if (!isNonTerminal) return;

    let active = true;
    let refreshing = false;

    const refresh = async () => {
      if (refreshing || document.visibilityState !== "visible") return;
      refreshing = true;
      try {
        const [updatedOrder, trackingResult] = await Promise.all([
          getOrder(order.id),
          getOrderTracking(order.id),
        ]);

        if (!active) return;
        if (updatedOrder) {
          setOrder(updatedOrder);
        }
        if (trackingResult.error) {
          setTrackingError(trackingResult.error);
        } else {
          setTracking(trackingResult.fulfillments);
          setTrackingError(null);
        }
      } catch {
        // Silently continue polling on transient network hiccup
      } finally {
        refreshing = false;
      }
    };

    const interval = window.setInterval(refresh, REFRESH_INTERVAL);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [order.id, isNonTerminal]);

  const hasTracking = tracking.some(
    ({ tracking_numbers, tracking_urls }) =>
      tracking_numbers.length > 0 || tracking_urls.length > 0
  );

  const shipping = order.shipping_address;
  const items = order.items ?? [];

  // Determine whether to show the UPI payment block:
  // Must be in pending_payment or payment_expired (and not canceled), OR explicit query flag
  const canShowUpi =
    (state.showPayment || showUpiQuery) &&
    state.key !== "canceled" &&
    Boolean(initialUpiPayment);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
      {/* ── Left Column: Status, Timeline, Items, Shipping, Tracking ── */}
      <div className="lg:col-span-7 xl:col-span-8 space-y-8">
        {/* 1. Status Line with toggle */}
        <OrderStatusLine order={order} />

        {/* 2. Timeline Stepper (or Canceled Banner) */}
        {state.showTimeline || state.key === "canceled" ? (
          <OrderTimelineStepper order={order} />
        ) : null}

        {/* 3. UPI Payment Block (Show only for pending_payment/payment_expired) */}
        {canShowUpi && initialUpiPayment && (
          <div id="payment">
            <UpiPayPanel
              orderId={order.id}
              initialPayment={initialUpiPayment}
              orderItems={items}
            />
          </div>
        )}

        {/* 4. Tracking Block (Show only once a fulfillment exists with tracking data) */}
        {state.showTracking && hasTracking && (
          <section
            id="tracking"
            aria-labelledby="tracking-heading"
            className="bg-[#faf8f5] border border-[#eee7de] rounded-lg p-5 sm:p-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm">📦</span>
              <h2 id="tracking-heading" className="text-xs uppercase tracking-wider font-semibold text-neutral-800">
                Shipment Tracking
              </h2>
            </div>

            {trackingError ? (
              <p role="alert" className="text-xs text-rose-700">
                {trackingError}
              </p>
            ) : (
              <ul className="space-y-4 text-xs divide-y divide-[#eee7de]">
                {tracking.map((fulfillment) => (
                  <li key={fulfillment.id} className="pt-3 first:pt-0">
                    {fulfillment.tracking_numbers.map((num) => (
                      <p key={num} className="font-mono text-neutral-800 font-medium">
                        Tracking Number: <span className="select-all">{num}</span>
                      </p>
                    ))}
                    {fulfillment.tracking_urls.map((url) => {
                      const safe = safeTrackingUrl(url);
                      return safe ? (
                        <a
                          key={url}
                          href={safe}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1.5 inline-flex items-center gap-1 font-medium text-ink underline underline-offset-4 hover:opacity-75"
                        >
                          Track via Courier Service →
                        </a>
                      ) : null;
                    })}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* 5. Purchased Items List */}
        <section aria-labelledby="order-items-heading">
          <h2 id="order-items-heading" className="text-xs uppercase tracking-[0.15em] font-semibold text-neutral-500 mb-4">
            Acquired Artworks ({items.reduce((acc, i) => acc + i.quantity, 0)})
          </h2>

          <ul className="divide-y divide-[#eee7de] border-y border-[#eee7de]">
            {items.map((item) => (
              <li key={item.id} className="py-5 flex gap-4 sm:gap-6 items-center">
                {/* Thumbnail */}
                <div className="relative w-20 h-24 sm:w-24 sm:h-28 shrink-0 bg-[#f5f3f0] rounded border border-[#eee7de] overflow-hidden">
                  {item.thumbnail ? (
                    <Image
                      src={item.thumbnail}
                      alt={item.product_title || item.title || "Artwork thumbnail"}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-neutral-400">
                      Artwork
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h3
                    className="font-cormorant text-xl sm:text-2xl text-neutral-900 font-normal leading-snug truncate"
                    style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
                  >
                    {item.product_title || item.title}
                  </h3>
                  {item.subtitle && (
                    <p className="text-xs text-neutral-500 mt-0.5 truncate">{item.subtitle}</p>
                  )}
                  <p className="text-xs uppercase tracking-wider text-neutral-500 mt-2">
                    Quantity: <span className="font-medium text-neutral-800">{item.quantity}</span>
                  </p>
                </div>

                {/* Line Total */}
                <div className="text-right">
                  <span className="font-medium text-neutral-900 text-sm sm:text-base tabular-nums font-mono">
                    {formatOrderMoney(item.total, order.currency_code)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* 6. Delivery Address & Payment Method */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-[#faf8f5] border border-[#eee7de] rounded-lg p-5 sm:p-7">
          {/* Delivery Address */}
          <div>
            <h3 className="text-[11px] font-sans font-medium uppercase tracking-[0.2em] text-neutral-500 mb-2">
              Delivery Address
            </h3>
            {shipping ? (
              <address className="not-italic text-xs text-neutral-700 leading-relaxed space-y-0.5">
                <strong className="block text-sm font-medium text-neutral-900 mb-1">
                  {[shipping.first_name, shipping.last_name].filter(Boolean).join(" ")}
                </strong>
                <p>{shipping.address_1}</p>
                {shipping.address_2 && <p>{shipping.address_2}</p>}
                <p>
                  {[shipping.city, shipping.province].filter(Boolean).join(", ")}{" "}
                  {shipping.postal_code}
                </p>
                {shipping.phone && (
                  <p className="text-neutral-500 pt-1 font-mono">{shipping.phone}</p>
                )}
              </address>
            ) : (
              <p className="text-xs text-neutral-500 italic">No delivery address provided.</p>
            )}
          </div>

          {/* Payment Method */}
          <div className="sm:border-l sm:border-[#eee7de] sm:pl-6">
            <h3 className="text-[11px] font-sans font-medium uppercase tracking-[0.2em] text-neutral-500 mb-2">
              Payment Method
            </h3>
            <div className="space-y-1.5 text-xs text-neutral-700">
              <p className="font-medium text-sm text-neutral-900">
                {order.payment_collections?.[0]?.payments?.[0]?.provider_id === "pp_upimanual_upimanual" ||
                initialUpiPayment
                  ? "Direct UPI Transfer"
                  : "Cards / NetBanking / UPI"}
              </p>
              <p className="text-neutral-500 capitalize">
                Status: <span className="font-medium text-neutral-800">{order.payment_status?.replaceAll("_", " ") || "Pending"}</span>
              </p>
              {order.currency_code && (
                <p className="text-neutral-400 font-mono text-[11px]">
                  Billed in {order.currency_code.toUpperCase()}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Column: Sticky Summary Card ── */}
      <div className="lg:col-span-5 xl:col-span-4">
        <OrderSummaryCard order={order} />
      </div>
    </div>
  );
}

export default LiveOrderDetail;

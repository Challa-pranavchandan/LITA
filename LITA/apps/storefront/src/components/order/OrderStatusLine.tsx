"use client";

import React, { useState } from "react";
import type { HttpTypes } from "@medusajs/types";
import { getCustomerOrderStatus } from "@/lib/order-status";
import { getOrderState } from "@/lib/order-state";

interface OrderStatusLineProps {
  order: HttpTypes.StoreOrder;
}

function formatStatusText(str?: string | null): string {
  if (!str) return "Pending";
  return str.replaceAll("_", " ");
}

export function OrderStatusLine({ order }: OrderStatusLineProps) {
  const [showDetails, setShowDetails] = useState(false);
  const state = getOrderState(order);

  const displayOrder = getCustomerOrderStatus({
    orderStatus: order.status,
    paymentStatus: order.payment_status,
    fulfillmentStatus: order.fulfillment_status,
  });

  const displayPayment = formatStatusText(order.payment_status);
  const displayFulfillment = formatStatusText(order.fulfillment_status || "unfulfilled");

  return (
    <div className="bg-[#faf8f5] border border-[#eee7de] rounded-lg p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              state.tone === "green"
                ? "bg-emerald-600"
                : state.tone === "amber"
                ? "bg-amber-600"
                : state.tone === "danger"
                ? "bg-rose-600"
                : "bg-neutral-600"
            }`}
            aria-hidden="true"
          />
          <div className="text-sm font-medium text-neutral-900">
            <span>Status: </span>
            <span className="font-semibold">{displayOrder}</span>
            <span className="text-neutral-400 font-normal"> · </span>
            <span className="text-neutral-600 font-normal capitalize">Payment: {displayPayment}</span>
            <span className="text-neutral-400 font-normal"> · </span>
            <span className="text-neutral-600 font-normal capitalize">Fulfillment: {displayFulfillment}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowDetails((prev) => !prev)}
          className="text-xs font-medium uppercase tracking-wider text-neutral-500 hover:text-black underline underline-offset-4 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink"
        >
          {showDetails ? "Hide details" : "View status details"}
        </button>
      </div>

      {showDetails && (
        <dl className="mt-4 pt-4 border-t border-[#eee7de] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-white p-3 rounded border border-[#eee7de]">
            <dt className="text-[10px] font-sans font-medium uppercase tracking-wider text-neutral-500">
              Order Lifecycle
            </dt>
            <dd className="mt-1 font-medium capitalize text-neutral-900">
              {displayOrder}
            </dd>
          </div>

          <div className="bg-white p-3 rounded border border-[#eee7de]">
            <dt className="text-[10px] font-sans font-medium uppercase tracking-wider text-neutral-500">
              Payment Status
            </dt>
            <dd className="mt-1 font-medium capitalize text-neutral-900">
              {displayPayment}
            </dd>
          </div>

          <div className="bg-white p-3 rounded border border-[#eee7de]">
            <dt className="text-[10px] font-sans font-medium uppercase tracking-wider text-neutral-500">
              Fulfillment Status
            </dt>
            <dd className="mt-1 font-medium capitalize text-neutral-900">
              {displayFulfillment}
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}

export default OrderStatusLine;

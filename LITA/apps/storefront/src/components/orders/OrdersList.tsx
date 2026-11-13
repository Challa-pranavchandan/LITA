"use client";

import React, { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { HttpTypes } from "@medusajs/types";
import {
  getOrderState,
  formatOrderDate,
  formatOrderMoney,
} from "@/lib/order-state";
import { buyAgain } from "@/lib/data/cart";

interface OrdersListProps {
  orders: HttpTypes.StoreOrder[];
}

type FilterTab = "all" | "in_progress" | "delivered" | "canceled";

function getStatusBadge(order: HttpTypes.StoreOrder): {
  label: string;
  dotColor: string;
} {
  const state = getOrderState(order);
  switch (state.key) {
    case "canceled":
      return { label: "Canceled", dotColor: "bg-rose-600" };
    case "delivered":
      return { label: "Delivered", dotColor: "bg-emerald-600" };
    case "shipped":
      return { label: "In Transit", dotColor: "bg-neutral-600" };
    case "pending_payment":
      return { label: "Payment Pending", dotColor: "bg-amber-600" };
    case "payment_expired":
      return { label: "Payment Expired", dotColor: "bg-rose-600" };
    case "placed":
    default:
      return { label: "Order Placed", dotColor: "bg-neutral-600" };
  }
}

function matchesFilter(order: HttpTypes.StoreOrder, tab: FilterTab): boolean {
  const state = getOrderState(order);
  if (tab === "all") return true;
  if (tab === "in_progress") {
    return (
      state.key === "placed" ||
      state.key === "pending_payment" ||
      state.key === "shipped"
    );
  }
  if (tab === "delivered") {
    return state.key === "delivered";
  }
  if (tab === "canceled") {
    return state.key === "canceled" || state.key === "payment_expired";
  }
  return true;
}

export function OrdersList({ orders }: OrdersListProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [buyingOrderId, setBuyingOrderId] = useState<string | null>(null);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Compute counts for tabs
  const countAll = orders.length;
  const countInProgress = orders.filter((o) => matchesFilter(o, "in_progress")).length;
  const countDelivered = orders.filter((o) => matchesFilter(o, "delivered")).length;
  const countCanceled = orders.filter((o) => matchesFilter(o, "canceled")).length;

  const tabs: Array<{ id: FilterTab; label: string; count: number }> = [
    { id: "all", label: "All", count: countAll },
    { id: "in_progress", label: "In progress", count: countInProgress },
    { id: "delivered", label: "Delivered", count: countDelivered },
    { id: "canceled", label: "Canceled", count: countCanceled },
  ];

  const filteredOrders = orders.filter((o) => matchesFilter(o, activeTab));

  const handleBuyAgain = (order: HttpTypes.StoreOrder) => {
    setBuyingOrderId(order.id);
    setBuyError(null);

    startTransition(async () => {
      const lineItems = (order.items ?? []).map((i) => ({
        variantId: i.variant_id,
        quantity: i.quantity || 1,
      }));

      const res = await buyAgain(lineItems);
      if (res.ok) {
        router.push("/cart");
      } else {
        setBuyError(res.error || "Unable to add pieces to your bag. Please browse available works.");
        setBuyingOrderId(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Filter Tabs ── */}
      <div
        role="tablist"
        aria-label="Filter orders by status"
        className="flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-[#e5e5e5] pb-3"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium transition-colors px-3 py-1.5 rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink ${
                isActive
                  ? "bg-ink text-wall"
                  : "bg-[#f5f3f0] text-graphite hover:text-ink hover:bg-[#eae8e4]"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[11px] font-mono px-1 rounded-full ${
                  isActive ? "bg-wall/20 text-wall" : "text-graphite/70"
                }`}
              >
                ({tab.count})
              </span>
            </button>
          );
        })}
      </div>

      {buyError && (
        <div
          role="alert"
          className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-800 rounded"
        >
          {buyError}
        </div>
      )}

      {/* ── Empty State ── */}
      {filteredOrders.length === 0 ? (
        <div className="py-12 px-4 text-center border border-dashed border-[#e5e5e5] bg-[#fbfaf8] rounded-lg">
          <p className="font-cormorant text-2xl text-ink font-normal mb-2">
            No orders found
          </p>
          <p className="text-xs text-graphite max-w-sm mx-auto mb-6 leading-relaxed">
            {activeTab === "all"
              ? "You haven't placed any orders with the studio yet. Discover our latest catalog of curated fine art."
              : `There are currently no orders under "${tabs.find((t) => t.id === activeTab)?.label}".`}
          </p>
          <Link
            href="/artworks"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-full border border-ink text-xs uppercase tracking-wider font-medium text-ink hover:bg-ink hover:text-wall transition-colors duration-200"
          >
            Browse artworks
          </Link>
        </div>
      ) : (
        /* ── Orders Cards List ── */
        <div className="space-y-5">
          {filteredOrders.map((order) => {
            const items = order.items ?? [];
            const firstItem = items[0];
            const otherItemsCount = items.length > 1 ? items.length - 1 : 0;
            const shipToName = order.shipping_address
              ? [order.shipping_address.first_name, order.shipping_address.last_name]
                  .filter(Boolean)
                  .join(" ") || "Collector"
              : "Collector";

            const displayIdText = order.display_id ? `#${order.display_id}` : `#${order.id.slice(-6).toUpperCase()}`;
            const placedDate = formatOrderDate(order.created_at) || "Recently";
            const status = getStatusBadge(order);
            const isBuyingThis = buyingOrderId === order.id && isPending;

            return (
              <article
                key={order.id}
                className="border border-[#e8e4df] rounded-lg overflow-hidden bg-wall shadow-sm hover:border-[#d5d0c8] transition-colors"
              >
                {/* ── Header Row (Muted background, 2x2 grid on mobile) ── */}
                <div className="bg-[#faf8f5] border-b border-[#eee7de] px-4 py-3 sm:px-6 sm:py-3.5">
                  <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-between gap-y-3 gap-x-4 text-xs">
                    {/* 1. Date */}
                    <div>
                      <span className="block text-[10px] font-sans font-medium uppercase tracking-[0.15em] text-neutral-500">
                        Order Placed
                      </span>
                      <time className="font-medium text-neutral-900 mt-0.5 block">
                        {placedDate}
                      </time>
                    </div>

                    {/* 2. Total */}
                    <div>
                      <span className="block text-[10px] font-sans font-medium uppercase tracking-[0.15em] text-neutral-500">
                        Total
                      </span>
                      <span className="font-medium text-neutral-900 mt-0.5 block tabular-nums">
                        {formatOrderMoney(order.total, order.currency_code)}
                      </span>
                    </div>

                    {/* 3. Ship To */}
                    <div>
                      <span className="block text-[10px] font-sans font-medium uppercase tracking-[0.15em] text-neutral-500">
                        Ship To
                      </span>
                      <span className="font-medium text-neutral-900 mt-0.5 block truncate max-w-[140px] sm:max-w-[180px]">
                        {shipToName}
                      </span>
                    </div>

                    {/* 4. Order ID + Link */}
                    <div className="text-right sm:text-left flex flex-col sm:flex-row sm:items-center sm:gap-4">
                      <div>
                        <span className="block text-[10px] font-sans font-medium uppercase tracking-[0.15em] text-neutral-500">
                          Order #
                        </span>
                        <span className="font-mono text-neutral-900 mt-0.5 block font-medium">
                          {displayIdText}
                        </span>
                      </div>
                      <Link
                        href={`/order/${order.id}`}
                        className="hidden sm:inline-block text-xs uppercase tracking-wider text-ink font-medium underline underline-offset-4 hover:opacity-75 transition-opacity ml-auto"
                      >
                        View details
                      </Link>
                    </div>
                  </div>
                </div>

                {/* ── Body ── */}
                <div className="p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
                  {/* Item info */}
                  <div className="flex items-start gap-4">
                    {/* Thumbnail (64px) */}
                    <div className="relative w-16 h-16 shrink-0 rounded border border-[#eee7de] bg-[#f5f3f0] overflow-hidden">
                      {firstItem?.thumbnail ? (
                        <Image
                          src={firstItem.thumbnail}
                          alt={firstItem.product_title || firstItem.title || "Artwork thumbnail"}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs">
                          Art
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="min-w-0">
                      <h3
                        className="font-cormorant text-lg sm:text-xl text-ink font-normal leading-snug truncate"
                        style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
                      >
                        {firstItem?.product_title || firstItem?.title || "Bespoke Artwork"}
                      </h3>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Qty {firstItem?.quantity || 1}
                        {otherItemsCount > 0 && (
                          <span className="text-neutral-400">
                            {" "}· +{otherItemsCount} more {otherItemsCount === 1 ? "item" : "items"}
                          </span>
                        )}
                      </p>

                      {/* Status Dot + Label */}
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className={`w-2 h-2 rounded-full ${status.dotColor}`}
                          aria-hidden="true"
                        />
                        <span className="text-xs font-medium text-neutral-800">
                          {status.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ── Buttons (full-width on mobile) ── */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2 md:pt-0">
                    <button
                      type="button"
                      onClick={() => handleBuyAgain(order)}
                      disabled={isBuyingThis}
                      className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2 rounded-full border border-neutral-300 text-neutral-800 text-xs uppercase tracking-wider font-medium hover:border-black hover:bg-neutral-50 transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                    >
                      {isBuyingThis ? "Adding to bag…" : "Buy again"}
                    </button>

                    <Link
                      href={`/order/${order.id}`}
                      className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2 rounded-full bg-ink text-wall text-xs uppercase tracking-wider font-medium hover:bg-neutral-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink text-center"
                    >
                      View details
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default OrdersList;

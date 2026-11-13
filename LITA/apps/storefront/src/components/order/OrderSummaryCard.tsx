import React from "react";
import Link from "next/link";
import type { HttpTypes } from "@medusajs/types";
import { formatOrderMoney } from "@/lib/order-state";

interface OrderSummaryCardProps {
  order: HttpTypes.StoreOrder;
}

export function OrderSummaryCard({ order }: OrderSummaryCardProps) {
  const c = order.currency_code || "INR";
  const subtotal = order.subtotal ?? order.item_subtotal;
  const shipping = order.shipping_total ?? 0;
  const tax = order.tax_total ?? 0;
  const discount = order.discount_total ?? 0;
  const total = order.total;

  return (
    <aside
      aria-label="Order summary breakdown"
      className="sticky top-6 lg:top-8 bg-[#faf8f5] border border-[#eee7de] rounded-lg p-6 sm:p-7 space-y-6 shadow-sm"
    >
      <div className="border-b border-[#eee7de] pb-4">
        <h2 className="text-[11px] font-sans font-medium uppercase tracking-[0.2em] text-neutral-500">
          Order Summary
        </h2>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-xs uppercase tracking-wider text-neutral-600 font-medium">
            Total
          </span>
          <span className="font-cormorant text-3xl font-normal text-neutral-900 tracking-tight tabular-nums">
            {formatOrderMoney(total, c)}
          </span>
        </div>
      </div>

      {/* ── Breakdown ── */}
      <dl className="space-y-3 text-sm text-neutral-700 border-b border-[#eee7de] pb-5">
        <div className="flex justify-between items-center text-xs">
          <dt className="text-neutral-600">Subtotal</dt>
          <dd className="font-medium text-neutral-900 tabular-nums">
            {formatOrderMoney(subtotal, c)}
          </dd>
        </div>

        {discount > 0 && (
          <div className="flex justify-between items-center text-xs text-emerald-800">
            <dt>Promotion / Discount</dt>
            <dd className="font-medium tabular-nums">
              -{formatOrderMoney(discount, c)}
            </dd>
          </div>
        )}

        <div className="flex justify-between items-center text-xs">
          <dt className="text-neutral-600">Insured Shipping</dt>
          <dd className="font-medium text-neutral-900 tabular-nums">
            {shipping === 0 ? "Complimentary" : formatOrderMoney(shipping, c)}
          </dd>
        </div>

        {tax > 0 && (
          <div className="flex justify-between items-center text-xs">
            <dt className="text-neutral-600">GST / Tax</dt>
            <dd className="font-medium text-neutral-900 tabular-nums">
              {formatOrderMoney(tax, c)}
            </dd>
          </div>
        )}
      </dl>

      {/* ── Inclusions & Trust Note ── */}
      <div className="space-y-2 text-[11px] text-neutral-500">
        <div className="flex items-center gap-1.5">
          <span className="text-emerald-700">✓</span>
          <span>Insured fine-art crating &amp; courier delivery</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-emerald-700">✓</span>
          <span>Certificate of authenticity included</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>🔒</span>
          <span>Encrypted payment processing via Razorpay &amp; UPI</span>
        </div>
      </div>

      {/* ── Need Help Contact Link ── */}
      <div className="pt-2 border-t border-[#eee7de]">
        <Link
          href="/contact"
          className="text-xs uppercase tracking-wider text-neutral-600 hover:text-black underline underline-offset-4 transition-colors inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink"
        >
          Need help? Contact us →
        </Link>
      </div>
    </aside>
  );
}

export default OrderSummaryCard;

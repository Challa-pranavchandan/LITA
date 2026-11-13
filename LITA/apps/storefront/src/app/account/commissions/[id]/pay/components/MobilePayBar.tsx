"use client";

import React from "react";
import { formatMoney } from "@/lib/format";
import type { Commission } from "./types";

interface MobilePayBarProps {
  commission: Commission;
}

export function MobilePayBar({ commission }: MobilePayBarProps) {
  const isPaid = commission.status === "paid" || !!commission.paid_at;
  const canPay =
    commission.status === "awaiting_payment" ||
    commission.status === "awaiting_final_payment";
  const isQuoted = commission.status === "quoted" && !!commission.quoted_price;

  // Only render on mobile and only when payment/quote action is pending
  if (isPaid || (!canPay && !isQuoted)) {
    return null;
  }

  const depositAmount = commission.quoted_price
    ? Math.ceil(commission.quoted_price / 2)
    : null;
  const balanceAmount =
    commission.quoted_price && depositAmount !== null
      ? commission.quoted_price - depositAmount
      : null;

  const isFinal = commission.status === "awaiting_final_payment";
  const dueAmount = isFinal ? balanceAmount : depositAmount;
  const dueLabel = isFinal ? "Final balance due" : "50% deposit due";
  const actionLabel = isFinal ? "Pay balance" : isQuoted ? "Review quote" : "Pay now";

  const handleScrollToPayment = () => {
    const el = document.getElementById("payment-card-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <aside
      aria-label="Mobile quick payment bar"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#e8e4df] px-5 py-3.5 shadow-xl transition-transform"
    >
      <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
        <div>
          <span className="block text-[11px] uppercase tracking-wider text-neutral-500 font-medium">
            {dueLabel}
          </span>
          <span className="font-cormorant text-2xl font-normal text-neutral-900 leading-none">
            {dueAmount
              ? formatMoney(dueAmount, commission.currency_code || "INR")
              : commission.quoted_price
              ? formatMoney(commission.quoted_price, commission.currency_code || "INR")
              : "Pending"}
          </span>
        </div>

        <button
          type="button"
          onClick={handleScrollToPayment}
          className="px-6 py-3 rounded-full bg-[#5f2f3c] text-white text-xs uppercase tracking-wider font-medium hover:bg-[#4a242f] transition-all shadow-sm active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5f2f3c]"
        >
          {actionLabel}
        </button>
      </div>
    </aside>
  );
}

export default MobilePayBar;

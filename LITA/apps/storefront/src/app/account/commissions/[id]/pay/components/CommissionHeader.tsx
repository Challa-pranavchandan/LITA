"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { Commission } from "./types";

interface CommissionHeaderProps {
  commission: Commission;
}

function getHumanTitle(commission: Commission): string {
  if (commission.medium && commission.size) {
    return `${commission.medium} · ${commission.size}`;
  }
  if (commission.title && commission.title !== commission.id) {
    return commission.title;
  }
  if (commission.medium) {
    return `${commission.medium} Artwork`;
  }
  return "Bespoke Artwork Commission";
}

function getStatusBadgeConfig(status: Commission["status"]) {
  switch (status) {
    case "awaiting_payment":
      return {
        label: "Deposit Due",
        className: "bg-amber-50 text-amber-900 border-amber-300/80",
        dotColor: "bg-amber-500",
      };
    case "awaiting_final_payment":
      return {
        label: "Final Balance Due",
        className: "bg-amber-50 text-amber-900 border-amber-300/80",
        dotColor: "bg-amber-500",
      };
    case "quoted":
      return {
        label: "Quote Ready",
        className: "bg-amber-50 text-amber-900 border-amber-300/80",
        dotColor: "bg-amber-500",
      };
    case "accepted":
      return {
        label: "Quote Accepted",
        className: "bg-amber-50 text-amber-900 border-amber-300/80",
        dotColor: "bg-amber-500",
      };
    case "in_production":
      return {
        label: "In Production",
        className: "bg-sky-50 text-sky-900 border-sky-300/80",
        dotColor: "bg-sky-500",
      };
    case "in_discussion":
      return {
        label: "In Discussion",
        className: "bg-sky-50 text-sky-900 border-sky-300/80",
        dotColor: "bg-sky-500",
      };
    case "paid":
      return {
        label: "Paid in Full",
        className: "bg-emerald-50 text-emerald-900 border-emerald-300/80",
        dotColor: "bg-emerald-500",
      };
    case "converted":
      return {
        label: "Order Confirmed",
        className: "bg-emerald-50 text-emerald-900 border-emerald-300/80",
        dotColor: "bg-emerald-500",
      };
    case "cancelled":
      return {
        label: "Cancelled",
        className: "bg-neutral-100 text-neutral-700 border-neutral-300",
        dotColor: "bg-neutral-400",
      };
    case "rejected":
      return {
        label: "Declined",
        className: "bg-neutral-100 text-neutral-700 border-neutral-300",
        dotColor: "bg-neutral-400",
      };
    case "new":
    default:
      return {
        label: "Brief Submitted",
        className: "bg-neutral-100 text-neutral-700 border-neutral-300",
        dotColor: "bg-neutral-400",
      };
  }
}

export function CommissionHeader({ commission }: CommissionHeaderProps) {
  const [copied, setCopied] = useState(false);
  const displayTitle = getHumanTitle(commission);
  const statusBadge = getStatusBadgeConfig(commission.status);
  const orderRef = commission.order_id || commission.id;

  const handleCopyRef = async () => {
    try {
      await navigator.clipboard.writeText(orderRef);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is unavailable
    }
  };

  return (
    <header className="pb-8 border-b border-[#e8e4df]">
      {/* Navigation link */}
      <div className="mb-6">
        <Link
          href="/account"
          className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-neutral-500 hover:text-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5f2f3c] rounded"
        >
          <span aria-hidden="true">←</span>
          <span>Back to account dashboard</span>
        </Link>
      </div>

      {/* Eyebrow & Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <span className="text-[11px] uppercase tracking-[0.2em] text-[#5f2f3c] font-semibold">
            Bespoke Commission
          </span>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${statusBadge.className}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${statusBadge.dotColor}`}
              aria-hidden="true"
            />
            <span>{statusBadge.label}</span>
          </span>
        </div>

        {/* Order Reference Pill */}
        {orderRef && (
          <div className="inline-flex items-center gap-1.5 text-xs text-neutral-500 bg-[#faf8f5] px-2.5 py-1 rounded border border-[#eee7de]">
            <span className="text-neutral-400">Ref:</span>
            <span className="font-mono text-neutral-700">{orderRef}</span>
            <button
              type="button"
              onClick={handleCopyRef}
              aria-label="Copy order reference to clipboard"
              title="Copy reference code"
              className="p-0.5 ml-1 text-neutral-400 hover:text-neutral-900 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5f2f3c] rounded"
            >
              {copied ? (
                <span className="text-[10px] font-sans font-medium text-emerald-700 flex items-center gap-0.5">
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Copied
                </span>
              ) : (
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Display Title */}
      <h1 className="font-cormorant text-3xl sm:text-4xl lg:text-5xl font-normal text-neutral-900 leading-[1.15] tracking-tight">
        {displayTitle}
      </h1>
    </header>
  );
}

export default CommissionHeader;

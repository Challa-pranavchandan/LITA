"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { HttpTypes } from "@medusajs/types";
import { formatMoney } from "@/lib/format";
import type { Commission } from "@/lib/data/commission";
import { AcceptCommissionQuoteButton } from "@/components/commission/AcceptCommissionQuoteButton";
import CommissionPayButton from "@/components/commission/CommissionPayButton";

interface YourCommissionsSectionProps {
  isLoggedIn: boolean;
  commissions: Commission[];
  customer?: HttpTypes.StoreCustomer | null;
}

function formatDate(dateString?: string | null) {
  if (!dateString) return "";
  try {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

function getStatusBadge(status: Commission["status"]) {
  switch (status) {
    case "new":
    case "in_discussion":
      return {
        label: status === "new" ? "In Studio Review" : "In Discussion",
        className: "bg-neutral-100 text-neutral-700 border-neutral-200",
      };
    case "quoted":
      return {
        label: "Quote Ready",
        className: "bg-amber-50 text-amber-800 border-amber-200",
      };
    case "accepted":
      return {
        label: "Quote Accepted",
        className: "bg-emerald-50 text-emerald-800 border-emerald-200",
      };
    case "awaiting_payment":
      return {
        label: "Deposit Due",
        className: "bg-[#fbeeed] text-[#5f2f3c] border-[#f2d0ce] font-medium",
      };
    case "in_production":
      return {
        label: "In Production",
        className: "bg-blue-50 text-blue-800 border-blue-200",
      };
    case "awaiting_final_payment":
      return {
        label: "Final Balance Due",
        className: "bg-amber-50 text-amber-900 border-amber-300 font-medium",
      };
    case "paid":
    case "converted":
      return {
        label: "Completed & Paid",
        className: "bg-emerald-100 text-emerald-900 border-emerald-300 font-medium",
      };
    case "rejected":
    case "cancelled":
      return {
        label: status === "rejected" ? "Declined" : "Cancelled",
        className: "bg-neutral-100 text-neutral-500 border-neutral-200",
      };
    default:
      return {
        label: status,
        className: "bg-neutral-100 text-neutral-700 border-neutral-200",
      };
  }
}

export function YourCommissionsSection({
  isLoggedIn,
  commissions,
  customer,
}: YourCommissionsSectionProps) {
  // If user has at least 1 commission, default expand the first one
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    if (commissions.length > 0) {
      return new Set([commissions[0].id]);
    }
    return new Set();
  });

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="border border-[#E5E5E5] bg-white p-6 sm:p-7 space-y-4 shadow-xs">
      <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-3.5">
        <div className="flex items-center gap-2.5">
          <h3
            className="font-cormorant text-2xl font-normal text-ink"
            style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
          >
            Your Commissions
          </h3>
          {isLoggedIn && commissions.length > 0 && (
            <span className="text-[11px] font-sans font-semibold tracking-wider px-2 py-0.5 bg-[#FAF9F7] border border-[#E5E5E5] text-[#555555]">
              {commissions.length} {commissions.length === 1 ? "Project" : "Projects"}
            </span>
          )}
        </div>
        {isLoggedIn && (
          <Link
            href="/account"
            className="text-[11px] uppercase tracking-wider text-[#777777] hover:text-black transition-colors"
          >
            Account &rarr;
          </Link>
        )}
      </div>

      {/* State 1: Not logged in */}
      {!isLoggedIn && (
        <div className="bg-[#FAF9F7] border border-[#EBE8E3] p-5 space-y-3">
          <p className="text-xs text-[#555555] leading-relaxed">
            Already commissioned a bespoke piece with Livin In The Art? Sign in to review artist proposals, track production milestones, and settle installment payments.
          </p>
          <div>
            <Link
              href="/login?next=/commissions"
              className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[#111111] hover:text-[#5f2f3c] underline underline-offset-4 transition-colors"
            >
              <span>Sign in to view your commissions</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>
      )}

      {/* State 2: Logged in, 0 commissions */}
      {isLoggedIn && commissions.length === 0 && (
        <div className="bg-[#FAF9F7] border border-[#EBE8E3] p-5 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#555555] block">
            No active commissions yet
          </span>
          <p className="text-xs text-[#777777] leading-relaxed">
            When you submit your bespoke artwork specifications using the request form, your project dialogue, custom quotes, and creation timeline will appear here.
          </p>
        </div>
      )}

      {/* State 3: Logged in, has commissions (Accordion list) */}
      {isLoggedIn && commissions.length > 0 && (
        <div className="divide-y divide-[#EAEAEA] border border-[#EAEAEA] bg-white">
          {commissions.map((c) => {
            const isExpanded = expandedIds.has(c.id);
            const badge = getStatusBadge(c.status);
            const hasQuote = c.status === "quoted" && Boolean(c.quoted_price);
            const canPay =
              c.status === "awaiting_payment" ||
              c.status === "awaiting_final_payment";
            const isPaid = c.status === "paid" || Boolean(c.paid_at);
            const depositAmount = c.quoted_price
              ? Math.ceil(c.quoted_price / 2)
              : null;
            const balanceAmount =
              c.quoted_price && depositAmount !== null
                ? c.quoted_price - depositAmount
                : null;

            return (
              <div key={c.id} className="transition-colors">
                {/* Accordion Header / Trigger Button */}
                <button
                  type="button"
                  onClick={() => toggleExpand(c.id)}
                  aria-expanded={isExpanded}
                  className="w-full text-left p-4 sm:p-5 flex items-start sm:items-center justify-between gap-3 hover:bg-[#FAF9F7] cursor-pointer transition-colors group"
                >
                  <div className="space-y-1.5 min-w-0 pr-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-sm text-[#111111] truncate group-hover:text-black">
                        {c.title || `Commission #${c.id.slice(0, 8).toUpperCase()}`}
                      </span>
                      <span
                        className={`text-[10px] uppercase tracking-wider px-2 py-0.5 border ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#777777]">
                      <span>Submitted {formatDate(c.created_at)}</span>
                      {c.medium && (
                        <>
                          <span>•</span>
                          <span>{c.medium}</span>
                        </>
                      )}
                      {c.size && (
                        <>
                          <span>•</span>
                          <span>{c.size}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {c.quoted_price ? (
                      <span className="text-xs font-medium text-[#111111] tabular-nums hidden xs:inline-block">
                        {formatMoney(c.quoted_price, c.currency_code || "INR")}
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#888888] italic hidden xs:inline-block">
                        Quote in review
                      </span>
                    )}

                    <div
                      className={`w-6 h-6 flex items-center justify-center rounded-full bg-[#FAF9F7] border border-[#E5E5E5] text-[#555555] group-hover:border-[#111111] transition-transform duration-200 ${
                        isExpanded ? "rotate-180 bg-[#111111] text-white" : ""
                      }`}
                      aria-hidden="true"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </button>

                {/* Accordion Content / Extended Details */}
                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-5 pt-1 space-y-4 border-t border-[#F0F0F0] bg-[#FAFAFA]/70 text-xs text-[#444444]">
                    {/* Concept */}
                    <div className="space-y-1 bg-white p-3.5 border border-[#EAEAEA]">
                      <span className="text-[10px] uppercase font-semibold tracking-wider text-[#777777] block">
                        Vision &amp; Concept
                      </span>
                      <p className="text-xs text-[#222222] leading-relaxed whitespace-pre-wrap">
                        {c.idea}
                      </p>
                    </div>

                    {/* Specification Metadata Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      <div className="bg-white p-2.5 border border-[#EAEAEA]">
                        <span className="text-[10px] uppercase font-medium tracking-wider text-[#888888] block">
                          Medium
                        </span>
                        <span className="text-xs text-[#111111] font-medium mt-0.5 block truncate">
                          {c.medium || "Studio Choice"}
                        </span>
                      </div>

                      <div className="bg-white p-2.5 border border-[#EAEAEA]">
                        <span className="text-[10px] uppercase font-medium tracking-wider text-[#888888] block">
                          Dimensions
                        </span>
                        <span className="text-xs text-[#111111] font-medium mt-0.5 block truncate">
                          {c.size || "Custom Format"}
                        </span>
                      </div>

                      <div className="bg-white p-2.5 border border-[#EAEAEA] col-span-2 sm:col-span-1">
                        <span className="text-[10px] uppercase font-medium tracking-wider text-[#888888] block">
                          Desired Timeline
                        </span>
                        <span className="text-xs text-[#111111] font-medium mt-0.5 block truncate">
                          {c.deadline ? formatDate(c.deadline) : "Flexible"}
                        </span>
                      </div>
                    </div>

                    {/* Placement context / Requirements */}
                    {c.requirements && (
                      <div className="bg-white p-3 border border-[#EAEAEA] space-y-1">
                        <span className="text-[10px] uppercase font-semibold tracking-wider text-[#777777] block">
                          Placement Context &amp; Details
                        </span>
                        <p className="text-xs text-[#555555] leading-relaxed">
                          {c.requirements}
                        </p>
                      </div>
                    )}

                    {/* Reference Images */}
                    {c.images && c.images.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-semibold tracking-wider text-[#777777] block">
                          Reference Attachments ({c.images.length})
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {c.images.map((img, idx) => (
                            <a
                              key={img.key || idx}
                              href={img.url || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] bg-white border border-[#EAEAEA] text-[#333333] hover:border-black transition-colors"
                            >
                              <span>📎</span>
                              <span className="max-w-[140px] truncate">
                                {img.filename || `Reference ${idx + 1}`}
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Milestone / Payment Breakdown */}
                    {c.quoted_price && depositAmount !== null && balanceAmount !== null && (
                      <div className="border border-[#E2DFDA] bg-[#F7F5F0] p-3.5 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#111111]">
                            Total All-Inclusive Quote:
                          </span>
                          <span className="font-bold text-[#111111] tabular-nums">
                            {formatMoney(c.quoted_price, c.currency_code || "INR")}
                          </span>
                        </div>
                        <div className="border-t border-[#E8E5DF] pt-2 grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-[#666666] block">
                              50% Studio Deposit:
                            </span>
                            <span className="font-medium text-[#111111] tabular-nums block">
                              {formatMoney(depositAmount, c.currency_code || "INR")}
                            </span>
                            <span className="text-[10px] text-[#777777] block mt-0.5">
                              {c.deposit_paid_at ? (
                                <span className="text-emerald-700 font-medium">
                                  ✓ Paid on {formatDate(c.deposit_paid_at)}
                                </span>
                              ) : c.status === "awaiting_payment" ? (
                                <span className="text-amber-700 font-medium">
                                  ● Due to start creation
                                </span>
                              ) : (
                                "Due upon proposal acceptance"
                              )}
                            </span>
                          </div>

                          <div>
                            <span className="text-[#666666] block">
                              50% Final Balance:
                            </span>
                            <span className="font-medium text-[#111111] tabular-nums block">
                              {formatMoney(balanceAmount, c.currency_code || "INR")}
                            </span>
                            <span className="text-[10px] text-[#777777] block mt-0.5">
                              {c.final_paid_at || isPaid ? (
                                <span className="text-emerald-700 font-medium">
                                  ✓ Paid on {formatDate(c.final_paid_at || c.paid_at)}
                                </span>
                              ) : c.status === "awaiting_final_payment" ? (
                                <span className="text-amber-700 font-medium">
                                  ● Due prior to crating
                                </span>
                              ) : (
                                "Due upon creation approval"
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Interactive Action Bar */}
                    <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-[#EAEAEA]">
                      <div className="flex flex-wrap items-center gap-2">
                        {hasQuote && (
                          <AcceptCommissionQuoteButton
                            commissionId={c.id}
                            isCharcoalPortrait={c.medium === "Charcoal Portrait"}
                          />
                        )}

                        {canPay && (
                          <CommissionPayButton
                            commission={c}
                            customer={
                              customer
                                ? {
                                    email: customer.email,
                                    first_name: customer.first_name,
                                    last_name: customer.last_name,
                                    phone: customer.phone,
                                  }
                                : undefined
                            }
                          />
                        )}

                        {isPaid && (
                          <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xs inline-block">
                            Paid &amp; In Curation
                          </span>
                        )}
                      </div>

                      <Link
                        href={`/account/commissions/${c.id}/pay`}
                        className="inline-flex items-center justify-center gap-1.5 text-xs text-[#111111] underline underline-offset-4 hover:text-[#5f2f3c] transition-colors py-1 font-medium"
                      >
                        <span>Open Details &amp; Discussion</span>
                        <span>&rarr;</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

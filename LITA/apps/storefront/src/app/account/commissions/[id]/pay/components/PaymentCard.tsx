"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/format";
import {
  initCommissionPaymentSession,
  type Commission,
} from "@/lib/data/commission";
import type {
  CustomerProfile,
  UpiPaymentInstructions,
} from "./types";
import type { UpiPaymentStatus } from "@/lib/data/upi";
import CommissionPayButton from "@/components/commission/CommissionPayButton";
import { AcceptCommissionQuoteButton } from "@/components/commission/AcceptCommissionQuoteButton";
import { UpiPayPanel } from "@/components/upi/UpiPayPanel";

interface PaymentCardProps {
  commission: Commission;
  customer?: CustomerProfile;
  initialUpiPayment?: UpiPaymentInstructions | null;
  enableUpiManual?: boolean;
}

export function PaymentCard({
  commission,
  customer,
  initialUpiPayment,
  enableUpiManual = false,
}: PaymentCardProps) {
  const isPaid = commission.status === "paid" || !!commission.paid_at;
  const isDepositPaid =
    isPaid ||
    commission.status === "in_production" ||
    commission.status === "awaiting_final_payment" ||
    !!commission.deposit_paid_at;
  const isFinalPaid = isPaid || !!commission.final_paid_at;

  const canPay =
    commission.status === "awaiting_payment" ||
    commission.status === "awaiting_final_payment";
  const isAwaitingDeposit = commission.status === "awaiting_payment";
  const isAwaitingFinal = commission.status === "awaiting_final_payment";

  const depositAmount = commission.quoted_price
    ? Math.ceil(commission.quoted_price / 2)
    : null;
  const balanceAmount =
    commission.quoted_price && depositAmount !== null
      ? commission.quoted_price - depositAmount
      : null;

  const initialMethod =
    initialUpiPayment && initialUpiPayment.status === "submitted"
      ? "upi"
      : "razorpay";

  const [activeMethod, setActiveMethod] = useState<"razorpay" | "upi">(initialMethod);
  const [upiPayment, setUpiPayment] = useState<UpiPaymentInstructions | null>(
    initialUpiPayment || null
  );
  const [loadingUpi, setLoadingUpi] = useState(false);
  const [upiError, setUpiError] = useState<string | null>(null);

  const handleSelectUpi = async () => {
    setActiveMethod("upi");
    if (!upiPayment && commission.id) {
      setLoadingUpi(true);
      setUpiError(null);
      try {
        const res = await initCommissionPaymentSession(
          commission.id,
          "pp_upimanual_upimanual"
        );
        if (res.ok && res.sessionData?.reference_code) {
          const session = res.sessionData;
          setUpiPayment({
            reference_code: session.reference_code as string,
            amount: session.amount,
            currency_code: session.currency_code,
            status: (session.status as UpiPaymentStatus) || "awaiting_proof",
            expires_at:
              session.expires_at ||
              new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            reject_reason: null,
            vpa: session.vpa || "",
            payee_name: session.payee_name || "",
            upi_link: session.upi_link || "",
            proof_token: session.proof_token || "",
            has_screenshot: Boolean(session.has_screenshot),
            utr_last4: session.utr_last4 || null,
          });
        } else {
          setUpiError(res.error || "Unable to initialize UPI payment.");
        }
      } catch (err: unknown) {
        setUpiError(
          err instanceof Error ? err.message : "Failed to load UPI details."
        );
      } finally {
        setLoadingUpi(false);
      }
    }
  };

  return (
    <aside
      id="payment-card-section"
      aria-label="Commission payment summary"
      className="sticky top-6 lg:top-8 bg-[#faf8f5] border border-[#eee7de] rounded-lg p-6 sm:p-7 shadow-sm space-y-6"
    >
      {/* ── Heading & Large Serif Total ── */}
      <div className="border-b border-[#eee7de] pb-5">
        <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-neutral-500 block mb-1">
          Payment Summary
        </span>
        <div className="flex items-baseline justify-between gap-4 mt-2">
          <span className="text-xs uppercase tracking-wider text-neutral-600 font-medium">
            Total Investment
          </span>
          <span className="font-cormorant text-3xl sm:text-4xl font-normal text-neutral-900 tracking-tight">
            {commission.quoted_price
              ? formatMoney(
                  commission.quoted_price,
                  commission.currency_code || "INR"
                )
              : "Pending Quote"}
          </span>
        </div>
      </div>

      {/* ── Two-Milestone Mini Timeline ── */}
      {depositAmount !== null && balanceAmount !== null && (
        <div className="space-y-3 border-b border-[#eee7de] pb-5">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-500 block">
            Payment Schedule
          </span>

          <div className="space-y-3 pt-1">
            {/* Milestone 1: 50% Upfront */}
            <div className="flex items-start justify-between gap-3 text-xs">
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5">
                  {isDepositPaid ? (
                    <span
                      className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-600 text-white"
                      title="50% deposit paid"
                    >
                      <svg
                        className="w-2.5 h-2.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={3}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </span>
                  ) : isAwaitingDeposit ? (
                    <span
                      className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-amber-600 bg-amber-50"
                      title="Deposit currently due"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                    </span>
                  ) : (
                    <span className="flex items-center justify-center w-4 h-4 rounded-full border border-neutral-300 bg-white" />
                  )}
                </div>

                <div>
                  <span
                    className={`block ${
                      isDepositPaid
                        ? "text-neutral-900 font-medium"
                        : isAwaitingDeposit
                        ? "text-amber-900 font-semibold"
                        : "text-neutral-600"
                    }`}
                  >
                    50% upfront (to begin work)
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    {isDepositPaid
                      ? "Paid & confirmed"
                      : isAwaitingDeposit
                      ? "Due to initiate atelier work"
                      : "Deposit milestone"}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span
                  className={`block font-mono ${
                    isDepositPaid
                      ? "text-emerald-700 line-through text-[11px]"
                      : "text-neutral-900 font-medium"
                  }`}
                >
                  {formatMoney(depositAmount, commission.currency_code || "INR")}
                </span>
                {isDepositPaid && (
                  <span className="text-[10px] uppercase font-semibold text-emerald-700">
                    Paid
                  </span>
                )}
              </div>
            </div>

            {/* Milestone 2: 50% Before Packing */}
            <div className="flex items-start justify-between gap-3 text-xs">
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5">
                  {isFinalPaid ? (
                    <span
                      className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-600 text-white"
                      title="Final payment paid"
                    >
                      <svg
                        className="w-2.5 h-2.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={3}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </span>
                  ) : isAwaitingFinal ? (
                    <span
                      className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-amber-600 bg-amber-50"
                      title="Final balance currently due"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                    </span>
                  ) : (
                    <span className="flex items-center justify-center w-4 h-4 rounded-full border border-neutral-300 bg-white" />
                  )}
                </div>

                <div>
                  <span
                    className={`block ${
                      isFinalPaid
                        ? "text-neutral-900 font-medium"
                        : isAwaitingFinal
                        ? "text-amber-900 font-semibold"
                        : "text-neutral-600"
                    }`}
                  >
                    50% before packing
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    {isFinalPaid
                      ? "Paid & cleared"
                      : isAwaitingFinal
                      ? "Due prior to courier dispatch"
                      : "Requested upon completion"}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span
                  className={`block font-mono ${
                    isFinalPaid
                      ? "text-emerald-700 line-through text-[11px]"
                      : "text-neutral-900 font-medium"
                  }`}
                >
                  {formatMoney(balanceAmount, commission.currency_code || "INR")}
                </span>
                {isFinalPaid && (
                  <span className="text-[10px] uppercase font-semibold text-emerald-700">
                    Paid
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Inclusions as Checkmark Rows ── */}
      <div className="space-y-2 border-b border-[#eee7de] pb-5 text-xs text-neutral-700">
        <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-500 block mb-2">
          Atelier Inclusions
        </span>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2.2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>Museum-grade packaging</span>
          </div>
          <span className="text-neutral-500 font-mono text-[11px]">Complimentary</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2.2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>Insured courier in India</span>
          </div>
          <span className="text-neutral-500 font-mono text-[11px]">Included</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2.2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>GST (Goods &amp; Services Tax)</span>
          </div>
          <span className="text-neutral-500 font-mono text-[11px]">Included</span>
        </div>
      </div>

      {/* ── Payment Method & Action Area ── */}
      {isPaid ? (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-950 space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white flex-shrink-0">
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={3}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <p className="font-semibold text-sm">Paid in Full</p>
          </div>
          <p className="text-neutral-700 leading-relaxed">
            Your commission is completely funded and in fulfillment.
            {commission.payment_reference && (
              <> Reference: <span className="font-mono font-medium">{commission.payment_reference}</span></>
            )}
          </p>
          {commission.order_id && (
            <p className="pt-1">
              <Link
                href="/account"
                className="inline-flex items-center gap-1 font-medium text-emerald-800 hover:text-emerald-950 underline"
              >
                View in Account Orders →
              </Link>
            </p>
          )}
        </div>
      ) : commission.status === "in_production" ? (
        <div className="p-4 bg-sky-50 border border-sky-200 rounded-lg text-xs text-sky-950 space-y-2">
          <p className="font-semibold text-sm">Deposit Confirmed · Creating Piece</p>
          <p className="text-sky-900 leading-relaxed">
            Your 50% upfront payment is safely received. The atelier is handcrafting your
            bespoke artwork. The remaining 50% balance will be requested prior to final packing.
          </p>
        </div>
      ) : commission.status === "quoted" && commission.quoted_price ? (
        <div className="space-y-3 pt-1">
          <p className="text-xs leading-relaxed text-neutral-600">
            Accept this bespoke {commission.medium === "Charcoal Portrait" ? "fixed pricing" : "quote"} to initiate your order.
          </p>
          <AcceptCommissionQuoteButton
            commissionId={commission.id}
            isCharcoalPortrait={commission.medium === "Charcoal Portrait"}
          />
        </div>
      ) : canPay ? (
        <div className="space-y-4">
          {/* Payment Method Selector Tiles */}
          {enableUpiManual && (
            <fieldset className="space-y-2.5">
              <legend className="text-[11px] uppercase tracking-wider font-semibold text-neutral-500 block mb-1">
                Select Payment Method
              </legend>

              <div className="grid grid-cols-1 gap-2.5">
                {/* Razorpay Option */}
                <label
                  onClick={() => setActiveMethod("razorpay")}
                  className={`cursor-pointer border p-3.5 rounded-lg transition-all block ${
                    activeMethod === "razorpay"
                      ? "border-[#5f2f3c] bg-white ring-1 ring-[#5f2f3c] shadow-sm"
                      : "border-[#eee7de] bg-white/70 hover:border-neutral-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="commission_payment_method"
                      value="razorpay"
                      checked={activeMethod === "razorpay"}
                      onChange={() => setActiveMethod("razorpay")}
                      className="mt-0.5 text-[#5f2f3c] focus:ring-[#5f2f3c]"
                    />
                    <div className="space-y-0.5">
                      <span className="block text-xs font-semibold uppercase tracking-wider text-neutral-900">
                        Cards / NetBanking / UPI
                      </span>
                      <span className="block text-[11px] text-neutral-500 leading-snug">
                        Instant confirmation via Razorpay
                      </span>
                    </div>
                  </div>
                </label>

                {/* Direct UPI Option */}
                <label
                  onClick={handleSelectUpi}
                  className={`cursor-pointer border p-3.5 rounded-lg transition-all block ${
                    activeMethod === "upi"
                      ? "border-[#5f2f3c] bg-white ring-1 ring-[#5f2f3c] shadow-sm"
                      : "border-[#eee7de] bg-white/70 hover:border-neutral-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="commission_payment_method"
                      value="upi"
                      checked={activeMethod === "upi"}
                      onChange={handleSelectUpi}
                      className="mt-0.5 text-[#5f2f3c] focus:ring-[#5f2f3c]"
                    />
                    <div className="space-y-0.5">
                      <span className="block text-xs font-semibold uppercase tracking-wider text-neutral-900">
                        Direct UPI Transfer
                      </span>
                      <span className="block text-[11px] text-neutral-500 leading-snug">
                        Pay via QR / UPI ID &amp; submit UTR
                      </span>
                    </div>
                  </div>
                </label>
              </div>
            </fieldset>
          )}

          {/* Pay Button / Panels */}
          {activeMethod === "razorpay" && (
            <div className="pt-1">
              <CommissionPayButton
                commission={commission}
                customer={customer}
                fullWidth={true}
              />
            </div>
          )}

          {activeMethod === "upi" && (
            <div className="pt-2">
              {loadingUpi ? (
                <div className="border border-[#eee7de] bg-white rounded-lg p-6 text-center space-y-3">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-[#5f2f3c] border-r-transparent" />
                  <p className="text-xs uppercase tracking-wider text-neutral-600">
                    Generating bespoke UPI payment QR...
                  </p>
                </div>
              ) : upiError ? (
                <div className="border border-rose-200 bg-rose-50 rounded-lg p-4 space-y-2">
                  <p className="text-xs text-rose-800">{upiError}</p>
                  <button
                    type="button"
                    onClick={handleSelectUpi}
                    className="text-xs font-semibold text-rose-900 underline hover:no-underline"
                  >
                    Try Again
                  </button>
                </div>
              ) : upiPayment && commission.order_id ? (
                <div className="border border-[#eee7de] bg-white rounded-lg p-3">
                  <UpiPayPanel
                    orderId={commission.order_id}
                    initialPayment={upiPayment}
                  />
                </div>
              ) : (
                <div className="border border-[#eee7de] bg-white rounded-lg p-6 text-center space-y-3">
                  <p className="text-xs text-neutral-600">
                    Generate your private UPI payment reference to proceed.
                  </p>
                  <button
                    type="button"
                    onClick={handleSelectUpi}
                    className="px-6 py-2.5 bg-[#5f2f3c] text-white text-xs uppercase tracking-wider font-medium hover:bg-[#4a242f] transition-colors rounded-lg"
                  >
                    Generate UPI QR
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 bg-white border border-[#eee7de] rounded-lg text-xs text-neutral-600 leading-relaxed">
          {commission.status === "accepted"
            ? "Your fixed quote is accepted. The studio is preparing your payment order."
            : "The studio is reviewing your commission brief."}
        </div>
      )}

      {/* ── Estimated Timeline & Trust Footer ── */}
      <div className="pt-4 border-t border-[#eee7de] space-y-2.5 text-[11px] text-neutral-500">
        <div className="flex items-center gap-1.5 text-neutral-600">
          <svg
            className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>
            {commission.deadline
              ? `Target delivery: ${new Date(commission.deadline).toLocaleDateString()}`
              : "Estimated creation: 2–3 weeks from deposit confirmation"}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-neutral-400">
          <span aria-hidden="true">🔒</span>
          <span>256-Bit SSL Encrypted Checkout · Razorpay Certified Partner</span>
        </div>
      </div>
    </aside>
  );
}

export default PaymentCard;

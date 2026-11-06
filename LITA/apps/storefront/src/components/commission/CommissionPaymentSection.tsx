"use client";

import React, { useState } from "react";
import type { Commission } from "@/lib/data/commission";
import type { UpiPaymentInstructions, UpiPaymentStatus } from "@/lib/data/upi";
import { initCommissionPaymentSession } from "@/lib/data/commission";
import CommissionPayButton from "./CommissionPayButton";
import { UpiPayPanel } from "@/components/upi/UpiPayPanel";

export type CommissionPaymentSectionProps = {
  commission: Commission;
  customer?: {
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
  } | null;
  initialUpiPayment?: UpiPaymentInstructions | null;
  enableUpiManual?: boolean;
};

export function CommissionPaymentSection({
  commission,
  customer,
  initialUpiPayment,
  enableUpiManual = false,
}: CommissionPaymentSectionProps) {
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

  // If manual UPI is not enabled, directly render the standard Razorpay payment button
  if (!enableUpiManual) {
    return (
      <div className="pt-2">
        <CommissionPayButton commission={commission} customer={customer} />
      </div>
    );
  }

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
    <div className="space-y-6 pt-2">
      {/* Payment Method Selector */}
      <fieldset className="space-y-3">
        <legend className="text-xs uppercase tracking-wider font-semibold text-neutral-600 block mb-3">
          Select Payment Method
        </legend>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Razorpay Option */}
          <label
            onClick={() => setActiveMethod("razorpay")}
            className={`cursor-pointer border p-4 transition-all duration-200 block ${
              activeMethod === "razorpay"
                ? "border-[#5f2f3c] bg-white shadow-sm ring-1 ring-[#5f2f3c]"
                : "border-neutral-200 bg-[#faf8f5] hover:border-neutral-300"
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
              <div className="space-y-1">
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
            className={`cursor-pointer border p-4 transition-all duration-200 block ${
              activeMethod === "upi"
                ? "border-[#5f2f3c] bg-white shadow-sm ring-1 ring-[#5f2f3c]"
                : "border-neutral-200 bg-[#faf8f5] hover:border-neutral-300"
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
              <div className="space-y-1">
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

      {/* Payment Method Panels */}
      {activeMethod === "razorpay" && (
        <div className="pt-2">
          <CommissionPayButton commission={commission} customer={customer} />
        </div>
      )}

      {activeMethod === "upi" && (
        <div className="pt-2">
          {loadingUpi ? (
            <div className="border border-neutral-200 bg-white p-8 text-center space-y-3">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-[#5f2f3c] border-r-transparent" />
              <p className="text-xs uppercase tracking-wider text-neutral-600">
                Generating your bespoke UPI payment QR &amp; reference...
              </p>
            </div>
          ) : upiError ? (
            <div className="border border-rose-200 bg-rose-50 p-4 space-y-3">
              <p className="text-xs text-rose-800">{upiError}</p>
              <button
                type="button"
                onClick={handleSelectUpi}
                className="text-xs uppercase tracking-wider font-semibold text-rose-900 underline hover:no-underline"
              >
                Try Again
              </button>
            </div>
          ) : upiPayment && commission.order_id ? (
            <UpiPayPanel
              orderId={commission.order_id}
              initialPayment={upiPayment}
            />
          ) : (
            <div className="border border-neutral-200 bg-white p-6 text-center space-y-3">
              <p className="text-xs text-neutral-600">
                Click below to initialize your manual UPI payment reference.
              </p>
              <button
                type="button"
                onClick={handleSelectUpi}
                className="px-6 py-2.5 bg-[#111111] text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors"
              >
                Generate UPI QR
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CommissionPaymentSection;

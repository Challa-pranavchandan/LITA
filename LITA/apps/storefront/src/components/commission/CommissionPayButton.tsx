"use client";

import React, { useState } from "react";
import { formatMoney } from "@/lib/format";
import {
  Commission,
  initCommissionPaymentSession,
  completeCommissionPayment,
} from "@/lib/data/commission";
import { useRouter } from "next/navigation";

import type {
  RazorpayInstance,
  RazorpayOptions,
  RazorpayPaymentFailedResponse,
  RazorpaySuccessResponse,
} from "@modules/checkout/components/payment-button/razorpay-payment-button";

export type {
  RazorpayInstance,
  RazorpayOptions,
  RazorpayPaymentFailedResponse,
  RazorpaySuccessResponse,
};

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      return resolve(true);
    }
    const existing = document.getElementById("razorpay-checkout-js");
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.id = "razorpay-checkout-js";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

interface CommissionPayButtonProps {
  commission: Commission;
  customer?: {
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
  } | null;
  onSuccess?: () => void;
  className?: string;
}

export function CommissionPayButton({
  commission,
  customer,
  onSuccess,
  className = "",
}: CommissionPayButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusState, setStatusState] = useState<
    "idle" | "initializing" | "confirming" | "success" | "error"
  >("idle");

  const isPaid = commission.status === "paid" || !!commission.paid_at;

  if (isPaid) {
    return (
      <div className="inline-flex items-center gap-2 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded">
        <span>Payment Confirmed</span>
        {commission.payment_reference && (
          <span className="font-mono text-[10px] text-emerald-700">
            ({commission.payment_reference})
          </span>
        )}
      </div>
    );
  }

  const handlePay = async () => {
    setLoading(true);
    setErrorMessage(null);
    setStatusState("initializing");

    try {
      // 1. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || typeof window === "undefined" || !window.Razorpay) {
        throw new Error(
          "Failed to load Razorpay payment SDK. Please check your internet connection."
        );
      }

      // 2. Initialize payment session on server (amount comes from DB quoted_price)
      const res = await initCommissionPaymentSession(commission.id);
      if (!res.ok || !res.sessionData) {
        throw new Error(res.error || "Unable to initiate payment session.");
      }

      const session = res.sessionData;
      const key =
        session.key_id ||
        process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
        "";

      if (!key) {
        throw new Error("Razorpay Key ID is not configured.");
      }

      // 3. Open Razorpay modal
      const customerName = customer
        ? [customer.first_name, customer.last_name].filter(Boolean).join(" ")
        : undefined;

      const options: RazorpayOptions = {
        key,
        amount: session.amount,
        currency: session.currency_code,
        name: "Livin In The Art",
        description: `Commission: ${commission.title}`,
        order_id: session.razorpay_order_id,
        prefill: {
          name: customerName || undefined,
          email: customer?.email || undefined,
          contact: customer?.phone || undefined,
        },
        theme: {
          color: "#5f2f3c",
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            if (statusState === "initializing") {
              setStatusState("idle");
            }
          },
        },
        handler: async (response: RazorpaySuccessResponse) => {
          setStatusState("confirming");
          try {
            const verification = await completeCommissionPayment(
              commission.id,
              {
                session_id: session.session_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              }
            );

            if (!verification.ok) {
              throw new Error(
                verification.error ||
                  "Payment verification with studio failed. Our team will verify via webhook."
              );
            }

            setStatusState("success");
            setLoading(false);
            if (onSuccess) {
              onSuccess();
            } else {
              router.refresh();
            }
          } catch (verErr: unknown) {
            setErrorMessage(
              verErr instanceof Error ? verErr.message : "Verification failed."
            );
            setStatusState("error");
            setLoading(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (errResp: RazorpayPaymentFailedResponse | unknown) => {
        const errObj =
          errResp && typeof errResp === "object" && "error" in errResp
            ? (errResp as RazorpayPaymentFailedResponse).error
            : undefined;
        const desc =
          errObj?.description ||
          "Payment was declined or cancelled. Please try again.";
        setErrorMessage(desc);
        setStatusState("error");
        setLoading(false);
      });

      rzp.open();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to open payment modal."
      );
      setStatusState("error");
      setLoading(false);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {statusState === "confirming" && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-xs text-amber-900 rounded">
          Payment received! Confirming with studio atelier...
        </div>
      )}

      {statusState === "success" && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 rounded">
          Payment successfully verified! Your commission order is placed.
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded">
          {errorMessage}
        </div>
      )}

      {statusState !== "success" && (
        <div>
          <button
            type="button"
            onClick={handlePay}
            disabled={loading}
            className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-[#5f2f3c] text-white text-xs uppercase tracking-wider font-medium hover:bg-[#4a242f] transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {loading
              ? statusState === "confirming"
                ? "Verifying Payment..."
                : "Securing Order..."
              : commission.quoted_price
              ? `Pay Now · ${formatMoney(commission.quoted_price, commission.currency_code || "INR")}`
              : "Pay Now"}
          </button>
          <p className="text-[11px] text-neutral-500 mt-1.5">
            Includes custom artwork, museum packaging, insured transit in India, and GST.
          </p>
        </div>
      )}
    </div>
  );
}

export default CommissionPayButton;

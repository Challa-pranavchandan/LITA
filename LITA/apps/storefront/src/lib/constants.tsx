import { CreditCard } from "@medusajs/icons"
import React from "react"

/* Map of payment provider_id to their title and icon. Add in any payment providers you want to use. */
export const paymentInfoMap: Record<
  string,
  { title: string; icon: React.JSX.Element }
> = {
  ...(process.env.NODE_ENV !== "production"
    ? {
        pp_system_default: {
          title: "Manual Payment",
          icon: <CreditCard />,
        },
      }
    : {}),
  pp_razorpay_razorpay: {
    title: "UPI / Cards / Netbanking (Razorpay)",
    icon: <CreditCard />,
  },
  ...(process.env.NEXT_PUBLIC_ENABLE_UPI_MANUAL === "true"
    ? {
        pp_upimanual_upimanual: {
          title: "Pay by UPI",
          icon: (
            <svg
              aria-hidden="true"
              fill="none"
              height="20"
              viewBox="0 0 20 20"
              width="20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 3h5v5H3zM12 3h5v5h-5zM3 12h5v5H3zM12 12h2v2h-2zM15 12h2v5h-2zM12 15h2v2h-2z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          ),
        },
      }
    : {}),
}

// This only checks if it is native stripe or medusa payments for card payments, it ignores the other stripe-based providers
export const isStripeLike = (providerId?: string) => {
  return (
    providerId?.startsWith("pp_stripe_") || providerId?.startsWith("pp_medusa-")
  )
}

export const RAZORPAY_PROVIDER_ID = "pp_razorpay_razorpay"

export const isRazorpay = (providerId?: string) => {
  return (
    providerId === RAZORPAY_PROVIDER_ID ||
    providerId?.startsWith("pp_razorpay")
  )
}

export const isPaypal = (providerId?: string) => {
  return providerId?.startsWith("pp_paypal")
}
export const isManual = (providerId?: string) => {
  return providerId?.startsWith("pp_system_default")
}

// Add currencies that don't need to be divided by 100
export const noDivisionCurrencies = [
  "krw",
  "jpy",
  "vnd",
  "clp",
  "pyg",
  "xaf",
  "xof",
  "bif",
  "djf",
  "gnf",
  "kmf",
  "mga",
  "rwf",
  "xpf",
  "htg",
  "vuv",
  "xag",
  "xdr",
  "xau",
]

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

"use client"

import { RAZORPAY_PROVIDER_ID, isRazorpay } from "@lib/constants"
import { initiatePaymentSession, placeOrder } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@modules/common/components/ui"
import React, { useState } from "react"
import ErrorMessage from "../error-message"

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

export interface RazorpayOptions {
  key?: string
  amount: number | string
  currency: string
  name: string
  description?: string
  image?: string
  order_id: string
  handler?: (response: RazorpaySuccessResponse) => void | Promise<void>
  prefill?: {
    name?: string
    email?: string
    contact?: string
  }
  notes?: Record<string, string>
  theme?: {
    color?: string
  }
  modal?: {
    ondismiss?: () => void
    escape?: boolean
    backdropclose?: boolean
  }
}

export interface RazorpayInstance {
  open: () => void
  on: (event: string, callback: (response: any) => void) => void
  close: () => void
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance
  }
}

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      return resolve(true)
    }
    const existing = document.getElementById("razorpay-checkout-js")
    if (existing) {
      existing.addEventListener("load", () => resolve(true))
      existing.addEventListener("error", () => resolve(false))
      return
    }
    const script = document.createElement("script")
    script.id = "razorpay-checkout-js"
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export const RazorpayPaymentButton = ({
  cart,
  notReady,
  "data-testid": dataTestId,
}: {
  cart: HttpTypes.StoreCart
  notReady: boolean
  "data-testid"?: string
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [paymentCapturedId, setPaymentCapturedId] = useState<string | null>(null)

  const paymentSession = cart.payment_collection?.payment_sessions?.find(
    (s) => isRazorpay(s.provider_id)
  )

  const handlePayment = async () => {
    // Prevent duplicate modal open or order creation if payment was already received
    if (!cart || submitting || paymentCapturedId) return

    setErrorMessage(null)
    setSubmitting(true)

    try {
      // 1. Ensure Razorpay Checkout.js script is loaded
      const isLoaded = await loadRazorpayScript()
      if (!isLoaded || typeof window === "undefined" || !window.Razorpay) {
        setErrorMessage("Failed to load Razorpay SDK. Please check your internet connection.")
        setSubmitting(false)
        return
      }

      // 2. Ensure payment session exists with Razorpay order id and matching key
      let currentSession = paymentSession
      let orderId = currentSession?.data?.razorpay_order_id as string | undefined
      let sessionKey = currentSession?.data?.key_id as string | undefined

      const configuredKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID

      if (!orderId || !sessionKey || (configuredKey && sessionKey !== configuredKey)) {
        const updatedCollection = await initiatePaymentSession(cart, {
          provider_id: RAZORPAY_PROVIDER_ID,
        })
        currentSession = updatedCollection?.payment_sessions?.find((s) =>
          isRazorpay(s.provider_id)
        )
        orderId = currentSession?.data?.razorpay_order_id as string | undefined
        sessionKey = currentSession?.data?.key_id as string | undefined
      }

      if (!orderId) {
        setErrorMessage("Failed to initialize Razorpay order. Please refresh and try again.")
        setSubmitting(false)
        return
      }

      const key = sessionKey || configuredKey

      if (!key) {
        setErrorMessage("Razorpay key ID is missing. Set NEXT_PUBLIC_RAZORPAY_KEY_ID.")
        setSubmitting(false)
        return
      }

      const amount = (currentSession?.data?.amount as number) || Math.round(Number(cart.total || 0) * 100)
      const currency = (currentSession?.data?.currency as string) || "INR"

      const customerName = [
        cart.billing_address?.first_name || cart.shipping_address?.first_name || "",
        cart.billing_address?.last_name || cart.shipping_address?.last_name || "",
      ]
        .join(" ")
        .trim()

      const customerPhone =
        cart.billing_address?.phone || cart.shipping_address?.phone || undefined

      // 3. Configure Razorpay modal
      const options: RazorpayOptions = {
        key,
        order_id: orderId,
        amount,
        currency,
        name: process.env.NEXT_PUBLIC_SITE_NAME || "Livin In The Art",
        description: `Order for ${cart.email || "customer"}`,
        prefill: {
          name: customerName || undefined,
          email: cart.email || undefined,
          contact: customerPhone,
        },
        theme: {
          color: "#000000",
        },
        handler: async (response: RazorpaySuccessResponse) => {
          setSubmitting(true)
          setPaymentCapturedId(response.razorpay_payment_id)
          try {
            // A. Write verification fields into payment session data
            await initiatePaymentSession(cart, {
              provider_id: RAZORPAY_PROVIDER_ID,
              data: {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              },
            })

            // B. Complete the cart to create the Medusa order
            const res = await placeOrder()
            if (res && !res.ok) {
              setErrorMessage(
                `Payment was received successfully (Reference: ${response.razorpay_payment_id}). ` +
                "Your order will be confirmed shortly. Please do not submit payment again. " +
                "You can refresh the page or check your account."
              )
              setSubmitting(false)
            }
          } catch (err: any) {
            // In Next.js, redirect() throws an error with NEXT_REDIRECT digest.
            // Do not catch it as a payment failure.
            if (err?.digest?.startsWith?.("NEXT_REDIRECT") || err?.message === "NEXT_REDIRECT") {
              throw err
            }
            setErrorMessage(
              `Payment was received successfully (Reference: ${response.razorpay_payment_id}). ` +
              "Your order will be confirmed shortly. Please do not submit another payment."
            )
            setSubmitting(false)
          }
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false)
          },
        },
      }

      const rzp = new window.Razorpay(options)

      rzp.on("payment.failed", (res: any) => {
        const desc =
          res?.error?.description ||
          res?.error?.reason ||
          "Payment failed. Please choose another payment method or try again."
        setErrorMessage(desc)
        setSubmitting(false)
      })

      rzp.open()
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred while launching Razorpay.")
      setSubmitting(false)
    }
  }

  return (
    <>
      <Button
        disabled={notReady || submitting || Boolean(paymentCapturedId)}
        onClick={handlePayment}
        size="large"
        isLoading={submitting}
        data-testid={dataTestId || "razorpay-payment-button"}
      >
        {paymentCapturedId ? "Payment Received" : "Pay with Razorpay"}
      </Button>
      {paymentCapturedId && (
        <div className="p-3 mt-3 text-xs leading-relaxed text-amber-900 bg-amber-50 border border-amber-200 rounded">
          <p className="font-semibold">Payment Received (Reference: {paymentCapturedId})</p>
          <p className="mt-1">
            Your payment was received and your order will be confirmed shortly.
            Please do not submit a second payment.
          </p>
        </div>
      )}
      <ErrorMessage
        error={errorMessage}
        data-testid="razorpay-payment-error-message"
      />
    </>
  )
}

export default RazorpayPaymentButton

# Razorpay Payment Integration Guide

This document describes the Razorpay payment integration for **Livin In The Art (LITA)** across Medusa v2 (`@dtc/backend`) and the Next.js Storefront (`@dtc/storefront`).

---

## 1. Overview

- **Provider Identifier:** `pp_razorpay_razorpay`
- **Supported Payment Methods:** UPI (Google Pay, PhonePe, Paytm, BHIM), Credit/Debit Cards, Netbanking, Wallets
- **Target Market & Currency:** India only; Indian Rupee (`INR`, ₹) is the sole currency. Razorpay is the only active payment provider.
- **Math & Precision:** Medusa calculates prices in major units (₹499.00). Razorpay requires amounts in paise (₹499.00 = 49900 paise). All conversions are handled strictly in `src/modules/razorpay/service.ts` using `toPaise` and `fromPaise`.
- **Security & Authorization:** Server-enforced order ID and amount validation. Payment IDs are checked directly against Razorpay's API and Medusa's payment store to prevent replay attacks and cross-cart tampering.

---

## 2. Capture Mode & Auto-Capture Requirement

> [!IMPORTANT]
> **Auto-Capture Must Be Enabled in Razorpay Dashboard**
> In the Razorpay Dashboard (**Settings** -> **Payment Capture**), ensure **Auto-Capture** is set to **Automatic**. Uncaptured authorized payments are automatically refunded by Razorpay after a preset window (typically 5 to 7 days). Having auto-capture enabled guarantees immediate fund capture upon authorization.

In `RazorpayProviderService.ts`:
- `capturePayment` checks if the payment is already captured (`payment.status === "captured"`). If so, it short-circuits gracefully.
- If the payment is in `authorized` state, it executes `payments.capture(payment_id, paise, "INR")`. If capture fails, a `MedusaError(PAYMENT_AUTHORIZATION_ERROR)` is thrown rather than swallowed.

---

## 3. Environment Variables

### Backend (`apps/backend/.env`)

```env
# Razorpay API Credentials (from Razorpay Dashboard > Account & Settings > API Keys)
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx

# Razorpay Webhook Secret (configured in Razorpay Dashboard > Settings > Webhooks)
RAZORPAY_WEBHOOK_SECRET=xxx

# Optional development-only escape hatch:
# If true, allows backend to start with mock placeholders if keys are missing.
# Defaults to false (fails startup if keys are missing). NEVER enable in production!
# ALLOW_DEV_PAYMENT_PLACEHOLDERS=false
```

### Storefront (`apps/storefront/.env.local`)

```env
# Public Key ID for Razorpay Checkout modal (NEVER put the Key Secret here)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxx
NEXT_PUBLIC_DEFAULT_REGION=in
```

---

## 4. Webhook Configuration & Events

1. In the Razorpay Dashboard (Test or Live mode):
   Navigate to **Settings** -> **Webhooks** -> **Add New Webhook**.
2. **Webhook URL:**
   ```
   https://<your-backend-domain>/hooks/payment/pp_razorpay_razorpay
   ```
   *For local development, use an ngrok or Cloudflare tunnel URL, e.g.:*
   `https://xyz.ngrok-free.app/hooks/payment/pp_razorpay_razorpay`
3. **Secret:** Set a strong secret string and set `RAZORPAY_WEBHOOK_SECRET` in `apps/backend/.env`.
4. **Active Events to Subscribe to:**
   - `payment.authorized` (maps to `PaymentActions.AUTHORIZED`)
   - `payment.captured` (maps to `PaymentActions.SUCCESSFUL`)
   - `payment.failed` (maps to `PaymentActions.FAILED`)
   - `order.paid` (maps to `PaymentActions.SUCCESSFUL`)

*(Note: `refund.processed` and `refund.failed` can be left unsubscribed or logged as intentionally unhandled because Medusa's `PaymentActions` does not support refund transitions on payment sessions).*

Medusa v2 preserves the raw request body on `/hooks/payment/*` and routes the webhook to `RazorpayProviderService.getWebhookActionAndData`, which validates the HMAC SHA-256 signature using `x-razorpay-signature` with timing-safe comparison. Every unsupported or unverified webhook path logs a structured reason to the Medusa logger without leaking secrets.

---

## 5. Pay-Then-Close-Tab Recovery Architecture

### The Problem
In standard browser checkout, after the Razorpay modal succeeds, the storefront client receives `razorpay_payment_id` and calls `placeOrder` (Medusa's `completeCartWorkflow`). If the customer closes their browser tab, experiences network loss, or loses battery before `placeOrder` completes, Razorpay successfully captures the money, but the cart in Medusa would remain incomplete without an order.

### The Solution: Webhook-Driven Reconciliation
We implement a resilient recovery mechanism combining an event subscriber and a Medusa workflow:

1. **Subscriber (`src/subscribers/razorpay-payment-recovery.ts`):**
   Listens to Medusa's `payment.webhook_received` event. When a webhook arrives for `pp_razorpay_razorpay` with a successful payment confirmation (`payment.captured`, `payment.authorized`, or `order.paid`):
   - Extracts `session_id`, `payment_id`, `order_id`, and `amount`.
   - Dispatches `reconcileRazorpayOrderWorkflow`.

2. **Workflow (`src/workflows/reconcile-razorpay-order.ts`):**
   - **Step 1 (`reconcile-session`):** Queries Medusa graph to inspect the cart and payment collection. If an order already exists for the cart (the customer completed checkout normally), the step exits idempotently with `shouldComplete: false`. If no order exists, it annotates the payment session with `razorpay_payment_id`, `razorpay_order_id`, and `webhook_verified: true`, transitioning the session to authorized.
   - **Step 2 (`complete-cart`):** Calls Medusa's native `completeCartWorkflow` with the cart ID, creating the order and clearing the cart safely in the background.

---

## 6. End-to-End Payment Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant SF as Next.js Storefront
    participant Medusa as Medusa v2 Backend
    participant RZP as Razorpay API / Modal

    Customer->>SF: Selects "UPI / Cards / Netbanking (Razorpay)"
    SF->>Medusa: initiatePaymentSession(provider_id: "pp_razorpay_razorpay")
    Medusa->>RZP: orders.create({ amount: paise, currency: "INR", notes: { session_id } })
    RZP-->>Medusa: { id: "order_xyz", amount, currency }
    Medusa-->>SF: payment_session initialized with razorpay_order_id
    Customer->>SF: Clicks "Pay with Razorpay"
    SF->>RZP: window.Razorpay.open({ order_id, amount, prefill, ... })
    Customer->>RZP: Completes UPI/Card payment in Razorpay modal
    RZP-->>SF: handler({ razorpay_payment_id, razorpay_order_id, razorpay_signature })

    alt Normal Browser Flow
        SF->>Medusa: initiatePaymentSession with { razorpay_payment_id, razorpay_order_id, razorpay_signature }
        Medusa-->>SF: Session data updated
        SF->>Medusa: placeOrder() (cart.complete)
        Medusa->>RZP: payments.fetch(payment_id) & verifies status, amount, currency, order_id, replay
        Medusa-->>SF: Order confirmed (type: "order", order.id)
        SF->>Customer: Redirect to /order/:id confirmation page
    else Customer Closes Tab / Network Drops
        RZP-)Medusa: Webhook (payment.captured / order.paid)
        Medusa->>Medusa: razorpay-payment-recovery subscriber triggers
        Medusa->>Medusa: reconcileRazorpayOrderWorkflow verifies no order exists, enriches session, calls completeCartWorkflow
        Medusa->>Medusa: Order created in background; customer receives order confirmation email
    end
```

---

## 7. Automated and Manual Testing

### Automated Unit Tests

Run the dedicated Razorpay unit test suite:

```bash
cd apps/backend
npm run test:unit -- src/modules/razorpay/__tests__/razorpay-provider.unit.spec.ts
```

### Manual Test Mode Checklist

1. **Successful Payment via UPI:**
   - In Razorpay modal, select UPI, enter `success@razorpay`.
   - Verify modal closes, storefront redirects to order confirmation, and payment status in Medusa Admin is `captured`.
2. **Failed Payment via UPI:**
   - In Razorpay modal, select UPI, enter `failure@razorpay`.
   - Verify error notification is displayed, cart is not destroyed, and customer can retry.
3. **Tampered Signature Rejection:**
   - If signature is modified or forged, `authorizePayment` fails HMAC verification and returns `PaymentSessionStatus.ERROR`.
4. **Modal Dismissal and Retry:**
   - Open Razorpay modal, click the close button without completing payment.
   - Verify "Payment modal closed" notification appears, same session is preserved, and clicking "Pay with Razorpay" again does not create a duplicate Razorpay order.
5. **Pay Then Close Tab (Recovery):**
   - In checkout, click "Pay with Razorpay".
   - Enter `success@razorpay` and complete payment.
   - Immediately close the storefront browser tab before redirecting to `/order/:id`.
   - Trigger the `payment.captured` or `order.paid` webhook from the Razorpay dashboard (or CLI tunnel).
   - Verify Medusa's `razorpay-payment-recovery` subscriber picks up the event, executes `reconcileRazorpayOrderWorkflow`, and creates the order in Medusa Admin.

---

## 8. Go-Live Checklist

- [ ] Complete Razorpay business KYC and activate Live mode in Razorpay Dashboard.
- [ ] Confirm **Auto-Capture** is enabled in Razorpay Dashboard.
- [ ] Generate Live Mode API Keys (`rzp_live_...`) in Razorpay Dashboard.
- [ ] Add `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` to production environment variables.
- [ ] Add `NEXT_PUBLIC_RAZORPAY_KEY_ID` to production storefront environment variables. Confirm `RAZORPAY_KEY_SECRET` is NEVER exposed to the frontend bundle.
- [ ] Create a Live Webhook in Razorpay Dashboard pointing to `https://<production-backend-domain>/hooks/payment/pp_razorpay_razorpay`.
- [ ] Subscribe to: `payment.authorized`, `payment.captured`, `payment.failed`, `order.paid`.
- [ ] Verify `STORE_CORS` on the backend includes the production storefront URL with HTTPS.
- [ ] Verify Razorpay compliance requirements on storefront:
  - Terms of Service
  - Privacy Policy
  - Return / Refund Policy
  - Contact Us page with business details
- [ ] Perform a small live test payment (e.g. ₹1) and process a refund from Medusa Admin.

---

## 9. Production Checklist: Regions & Payment Providers

> [!IMPORTANT]
> **Production Region & Payment Configuration**
> In **Medusa Admin** > **Settings** > **Regions**:
> - The **India** region (`in`) must list **only** the Razorpay provider (`pp_razorpay_razorpay`). The manual payment provider (`pp_system_default`) must be removed from all active regions.
> - The currency must be strictly **INR** (`₹`).
> - No EUR/USD demo region may exist in the database.
>
> Run the backend validation script before deployment:
> ```bash
> cd apps/backend
> npm run check:prod-config
> ```
> This script exits non-zero if any non-Razorpay provider or non-INR currency is configured on any region.

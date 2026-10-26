# Razorpay Integration Plan: Medusa v2 + Next.js Storefront

**Audience:** coding agent working in two repos: the Medusa v2 backend and the Next.js storefront.
**Stack:** Medusa v2 (backend), Next.js (storefront), Supabase Postgres (Medusa DB), Cloudflare R2 (images; unrelated to payments).
**Goal:** Customers pay in INR via Razorpay Checkout (UPI, cards, netbanking, wallets). Medusa orders are created only after a verified payment.

> Rule for the agent: before writing code, check the installed Medusa version (`npx medusa --version`) and read the installed types for `AbstractPaymentProvider` in `node_modules/@medusajs/framework` and `@medusajs/types`. Method signatures below follow Medusa v2 docs, but exact input/output types can differ slightly between minor versions. Trust the installed types over this document.

---

## 0. Decision: custom provider (default) vs community plugin

- **Default: custom provider module** in `src/modules/razorpay`. Full control, no dependency on a single maintainer.
- **Alternative:** community plugin `medusa-plugin-razorpay-v2` (or `@sgftech/payment-razorpay`). Faster, but pin the version and read its source first. Use it only if the user explicitly asks.

This plan covers the custom provider.

---

## 1. Prerequisites

1. Razorpay account with **test mode** keys (`rzp_test_...`).
2. Backend must be reachable by Razorpay for webhooks. Locally use ngrok or a Cloudflare tunnel.
3. Medusa region with **INR** as currency, and a shipping/tax setup that works for India.
4. Decide capture mode in the Razorpay dashboard. **Recommended: auto-capture** (simplest; `capturePayment` becomes a no-op).

---

## 2. Backend (Medusa v2)

### 2.1 Install and env

```bash
npm i razorpay
```

`.env` (never commit):

```env
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx
RAZORPAY_WEBHOOK_SECRET=xxx
```

### 2.2 File layout

```
src/modules/razorpay/
  index.ts
  service.ts
```

### 2.3 `src/modules/razorpay/index.ts`

```ts
import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import RazorpayProviderService from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [RazorpayProviderService],
})
```

### 2.4 `src/modules/razorpay/service.ts`

Implement every abstract method the installed `AbstractPaymentProvider` requires. Skeleton:

```ts
import { AbstractPaymentProvider, BigNumber } from "@medusajs/framework/utils"
import Razorpay from "razorpay"
import crypto from "crypto"

type Options = {
  key_id: string
  key_secret: string
  webhook_secret: string
}

const toPaise = (amount: number | string) => Math.round(Number(amount) * 100)

class RazorpayProviderService extends AbstractPaymentProvider<Options> {
  static identifier = "razorpay"

  protected client_: Razorpay
  protected options_: Options

  constructor(container: Record<string, unknown>, options: Options) {
    super(container, options)
    this.options_ = options
    this.client_ = new Razorpay({
      key_id: options.key_id,
      key_secret: options.key_secret,
    })
  }

  static validateOptions(options: Record<any, any>): void {
    for (const k of ["key_id", "key_secret", "webhook_secret"]) {
      if (!options[k]) throw new Error(`Razorpay option "${k}" is required`)
    }
  }

  // Called when the customer selects Razorpay at checkout.
  async initiatePayment(input: any) {
    const { amount, currency_code, data, context } = input
    const order = await this.client_.orders.create({
      amount: toPaise(amount),
      currency: String(currency_code).toUpperCase(),
      receipt: context?.idempotency_key?.slice(0, 40),
      // IMPORTANT: webhook needs to map back to the Medusa payment session.
      notes: { session_id: data?.session_id ?? "" },
    })
    return {
      id: order.id,
      data: { razorpay_order_id: order.id, amount: order.amount, currency: order.currency },
    }
  }

  // Called on cart completion. Frontend must have written the three razorpay_* fields
  // into the payment session data before this runs.
  async authorizePayment(input: any) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = input.data ?? {}
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return { status: "requires_more" as const, data: input.data }
    }
    const expected = crypto
      .createHmac("sha256", this.options_.key_secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex")

    const a = Buffer.from(expected)
    const b = Buffer.from(String(razorpay_signature))
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { status: "error" as const, data: input.data }
    }
    // Optional hardening: fetch the payment and confirm status + amount match the order.
    // const p = await this.client_.payments.fetch(razorpay_payment_id)
    return { status: "authorized" as const, data: input.data }
  }

  // Auto-capture on => payment already captured. Otherwise call payments.capture().
  async capturePayment(input: any) {
    return { data: input.data }
  }

  async refundPayment(input: any) {
    const { data, amount } = input
    await this.client_.payments.refund(data.razorpay_payment_id, {
      amount: toPaise(amount),
    })
    return { data }
  }

  async cancelPayment(input: any) {
    return { data: input.data } // Razorpay orders cannot be cancelled; they expire.
  }

  async deletePayment(input: any) {
    return { data: input.data }
  }

  async retrievePayment(input: any) {
    const id = input.data?.razorpay_payment_id
    if (!id) return { data: input.data }
    const payment = await this.client_.payments.fetch(id)
    return { data: { ...input.data, ...payment } }
  }

  async updatePayment(input: any) {
    // Cart total changed after the order was created: create a NEW Razorpay order
    // (orders are immutable) and return the new order id in data.
    const { amount, currency_code, data } = input
    const order = await this.client_.orders.create({
      amount: toPaise(amount),
      currency: String(currency_code).toUpperCase(),
      notes: { session_id: data?.session_id ?? "" },
    })
    return { data: { ...data, razorpay_order_id: order.id, amount: order.amount } }
  }

  async getPaymentStatus(input: any) {
    const id = input.data?.razorpay_payment_id
    if (!id) return { status: "pending" as const }
    const p = await this.client_.payments.fetch(id)
    if (p.status === "captured") return { status: "captured" as const }
    if (p.status === "authorized") return { status: "authorized" as const }
    if (p.status === "failed") return { status: "error" as const }
    return { status: "pending" as const }
  }

  // Webhook entry point (route auto-registered by Medusa:
  // POST /hooks/payment/razorpay_razorpay).
  async getWebhookActionAndData(payload: any) {
    const { data, rawData, headers } = payload
    const signature = headers?.["x-razorpay-signature"]
    const expected = crypto
      .createHmac("sha256", this.options_.webhook_secret)
      .update(rawData) // MUST be the raw body, not re-serialized JSON
      .digest("hex")
    if (!signature || signature !== expected) {
      return { action: "not_supported" as const }
    }

    const entity = data?.payload?.payment?.entity
    const sessionId = entity?.notes?.session_id
    if (!entity || !sessionId) return { action: "not_supported" as const }

    const amount = new BigNumber(Number(entity.amount) / 100) // paise -> major units

    switch (data.event) {
      case "payment.authorized":
        return { action: "authorized" as const, data: { session_id: sessionId, amount } }
      case "payment.captured":
        return { action: "captured" as const, data: { session_id: sessionId, amount } }
      case "payment.failed":
        return { action: "failed" as const, data: { session_id: sessionId, amount } }
      default:
        return { action: "not_supported" as const }
    }
  }
}

export default RazorpayProviderService
```

**Things the agent must verify against installed types/docs, not assume:**

1. Whether `amount` passed to the provider is in **major units** (₹499 => `499`). Add a temporary `console.log` in `initiatePayment`, run one checkout, and confirm. Convert to paise exactly once.
2. Whether `data.session_id` is available in `initiatePayment` input (the built-in Stripe provider in `@medusajs/payment-stripe` is the reference implementation: read it in `node_modules`). If not, use the approach Stripe uses to link provider objects to payment sessions.
3. Exact return shapes and the `status` union for each method.
4. That `rawData` is exposed in the webhook payload. If not, add a raw-body middleware for `/hooks/payment/*` in `src/api/middlewares.ts` (`bodyParser: { preserveRawBody: true }`).

### 2.5 Register in `medusa-config.ts`

```ts
modules: [
  // ...existing modules
  {
    resolve: "@medusajs/medusa/payment",
    options: {
      providers: [
        {
          resolve: "./src/modules/razorpay",
          id: "razorpay",
          options: {
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
            webhook_secret: process.env.RAZORPAY_WEBHOOK_SECRET,
          },
        },
      ],
    },
  },
],
```

Provider ID in the storefront and DB: **`pp_razorpay_razorpay`**.

If the payment module is already configured (e.g. Stripe), add the Razorpay entry to the existing `providers` array. Do not declare the module twice.

### 2.6 Enable in Admin

Medusa Admin -> Settings -> Regions -> (India region) -> Payment providers -> enable **Razorpay**. Confirm region currency is INR.

### 2.7 Webhook setup

1. Razorpay Dashboard -> Settings -> Webhooks -> Add.
2. URL: `https://<public-backend-host>/hooks/payment/razorpay_razorpay`
3. Events: `payment.authorized`, `payment.captured`, `payment.failed`.
4. Set a secret and put it in `RAZORPAY_WEBHOOK_SECRET`.

---

## 3. Storefront (Next.js)

Assumes the official Medusa Next.js starter storefront. If the structure differs, inspect first and adapt.

### 3.1 Env

```env
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxx   # public key id only, never the secret
```

### 3.2 Locate and extend

Search the repo for how Stripe is handled (`grep -ri stripe src/`). Typical places in the starter:

- `src/lib/constants.tsx`: `paymentInfoMap` (label/icon per provider id) and `isStripe`-style helpers. Add `pp_razorpay_razorpay` with a label ("UPI / Cards / Netbanking") and add an `isRazorpay` helper.
- `src/modules/checkout/components/payment/index.tsx`: payment method selection. Make sure Razorpay shows as an option and calls `initiatePaymentSession(cart, { provider_id: "pp_razorpay_razorpay" })`.
- `src/modules/checkout/components/payment-button/index.tsx`: add a `RazorpayPaymentButton` branch.

### 3.3 Load Checkout.js

Use `next/script` with `strategy="lazyOnload"` for `https://checkout.razorpay.com/v1/checkout.js`, or inject it from the button component on demand. Declare `window.Razorpay` types.

### 3.4 `RazorpayPaymentButton` behavior

1. Read the payment session for `pp_razorpay_razorpay` from `cart.payment_collection.payment_sessions`. Get `data.razorpay_order_id`, `data.amount`, `data.currency`.
2. Open the modal:

```ts
const rzp = new window.Razorpay({
  key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  order_id: session.data.razorpay_order_id,
  amount: session.data.amount,        // paise, as returned by Razorpay
  currency: session.data.currency,
  name: "<Store name>",
  prefill: { name, email, contact },   // from cart.shipping_address / cart.email
  handler: async (res) => {
    // res: { razorpay_payment_id, razorpay_order_id, razorpay_signature }
    // 1. Write these 3 fields into the payment session data (server action
    //    calling the Medusa store API / JS SDK as the starter does).
    // 2. Then place the order (cart.complete / placeOrder server action).
  },
  modal: { ondismiss: () => setSubmitting(false) },
})
rzp.on("payment.failed", (r) => setError(r.error.description))
rzp.open()
```

3. **Persisting the three `razorpay_*` fields:** Medusa's store API for payment sessions may not allow arbitrary `data` updates after initiation. The agent must check the current store API / JS SDK:
   - Preferred: call `initiatePaymentSession` again for the same provider with `data: { razorpay_payment_id, razorpay_order_id, razorpay_signature }`, which routes through the provider's `updatePayment`. Make `updatePayment` merge incoming `data` and **only create a new Razorpay order when the amount actually changed**.
   - Alternative if that is blocked: add a small custom store API route in the backend (`src/api/store/razorpay/verify/route.ts`) that verifies the signature and writes the result into the payment session via the Payment Module, then call `cart.complete`.
   Pick whichever works on the installed version and document the choice in the PR.
4. After `placeOrder` succeeds, redirect to the order confirmation page exactly as the starter does for other providers.
5. Handle: modal dismissed, payment failed, double-click (disable button while submitting), and page refresh mid-payment (the webhook is the safety net).

---

## 4. Order-of-operations summary

1. Customer selects Razorpay -> `initiatePaymentSession` -> backend `initiatePayment` creates a Razorpay order (amount in paise, `notes.session_id`).
2. Storefront opens Razorpay modal with `order_id`.
3. Customer pays -> handler receives `razorpay_payment_id/order_id/signature`.
4. Storefront stores those on the payment session, then completes the cart.
5. Backend `authorizePayment` verifies HMAC signature (`order_id|payment_id` with key secret) -> order is created.
6. Razorpay webhook (`payment.captured`) arrives -> `getWebhookActionAndData` -> Medusa marks the payment captured. If the user closed the tab after paying, the webhook still completes the flow.

---

## 5. Testing checklist (test mode)

- [ ] Backend boots with no provider validation errors; Razorpay visible in Admin region settings.
- [ ] Checkout shows Razorpay option for INR region only.
- [ ] Successful payment (test card / test UPI `success@razorpay`) creates an order; payment shows as captured in Admin.
- [ ] Amount in Razorpay dashboard equals cart total (catches the paise/rupee bug).
- [ ] Failed payment (test failure card / `failure@razorpay`) leaves cart intact, shows error, allows retry.
- [ ] Tampered signature is rejected by `authorizePayment` (unit test).
- [ ] Invalid webhook signature is ignored; valid one updates payment state.
- [ ] Cart total changed after session creation (add item/discount) -> new Razorpay order, correct amount.
- [ ] Refund from Admin triggers `refundPayment` and appears in Razorpay dashboard.
- [ ] Close modal mid-payment, then retry: no duplicate orders.
- [ ] Pay, then close the tab before redirect: webhook still results in a consistent order/payment state.

Add unit tests for: signature verification (valid/invalid), `toPaise` rounding, webhook event mapping.

---

## 6. Go-live checklist

- [ ] Complete Razorpay KYC and activate live mode.
- [ ] Swap to `rzp_live_` keys in backend and storefront envs; create a **live** webhook with its own secret.
- [ ] Backend and storefront served over HTTPS; CORS (`STORE_CORS`) includes the storefront domain.
- [ ] Secrets only in env/secret manager; confirm key secret never reaches the browser bundle.
- [ ] Log provider errors with Razorpay order/payment ids (no secrets, no full card data).
- [ ] Do one real low-value live payment and refund it.
- [ ] Add Razorpay's required storefront pages if not present (refund/cancellation policy, terms, contact), since Razorpay checks these.

---

## 7. Notes

- Supabase and R2 are not involved in this feature. Medusa stores payment data in its own Postgres tables via its modules; do not write to the DB directly.
- Do not hand-roll currency math beyond the single `toPaise` helper; keep all conversion in the provider.
- Keep the provider free of storefront assumptions so it can be reused or published later.

## 8. Deliverables

1. `src/modules/razorpay/{index,service}.ts` + unit tests.
2. `medusa-config.ts` registration; `.env.example` updated with the three Razorpay vars.
3. Storefront: `isRazorpay` helper, `paymentInfoMap` entry, `RazorpayPaymentButton`, Checkout.js loading, env var.
4. (If needed) `src/api/middlewares.ts` raw-body config and/or `src/api/store/razorpay/verify/route.ts`.
5. Short `docs/razorpay.md`: env vars, webhook URL, how to test, go-live steps.

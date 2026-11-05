# LITA: Direct UPI payment (manual verification)

Nov 4, 2026 · @Pranav

Add UPI as a second payment option beside Razorpay: the order is placed unpaid, the customer pays your UPI ID or QR and submits the UTR or a screenshot, and you verify it in Medusa Admin and capture the payment. Razorpay code stays as it is; the work below is nine prompts, run in order, each additive and behind a feature flag.

## How it works

The order exists from the moment the customer clicks Place order, but money is only marked received when you capture it in Admin.

1. At checkout the customer picks "Pay by UPI (manual)" next to Razorpay.
2. The order is placed with an authorized, uncaptured payment and a reference code such as `LITA-7K3Q9M`. Stock is reserved.
3. The order page shows a Pay now panel: UPI deep link (mobile), QR code (desktop), your UPI ID, the exact amount and the reference code.
4. The customer pays in their UPI app, then submits the 12-digit UTR and optionally a screenshot.
5. You get a studio email and an Admin queue entry. You compare the UTR and amount with your bank or UPI app, then click Verify (captures the payment) or Reject (customer can resubmit).
6. If nothing is submitted or verified within 48 hours, a scheduled job cancels the order and releases stock.

| UPI status | Meaning | Moves to |
| --- | --- | --- |
| awaiting\_proof | Order placed, nothing submitted yet | submitted, expired |
| submitted | UTR or screenshot received, waiting for you | verified, rejected, expired |
| verified | You confirmed the money; payment captured | final |
| rejected | Proof did not match; reason emailed | submitted (resubmit), expired |
| expired | Deadline passed; order cancelled | final |

## Design decisions

- **A second payment provider, not a change to Razorpay.** A new Medusa provider `pp_upimanual_upimanual` sits beside `pp_razorpay_razorpay`. Its `authorizePayment` succeeds so the cart completes, but it never captures; only your Admin action does. Razorpay, its webhook recovery workflow and its 52 tests are not touched.
- **Proof lives in its own module.** A new `upi_payment` module (reference code, UTR, screenshot key, status, expiry) keeps Medusa's order and payment tables clean. It follows the same module, workflow, route pattern as `commission` and `inquiry`.
- **Feature flag.** Everything is off unless `ENABLE_UPI_MANUAL=true` (backend) and `NEXT_PUBLIC_ENABLE_UPI_MANUAL=true` (storefront). With the flag off, behaviour is identical to today.
- **Server decides the amount.** The QR, deep link and expected amount come from the order total on the server. The client never supplies an amount.
- **Guests can pay.** Proof endpoints accept either the logged-in owner or a signed token (HMAC of reference code plus order id) issued at order placement, so guest checkout keeps working without opening up order lookup.
- **UTR is unique.** A database unique index stops the same UTR being used for two orders. You still match the UTR against your own bank or UPI app before verifying.
- **Screenshots go to a private R2 prefix** (`upi-proofs/<reference>/...`) through presigned PUT, and are shown to you with short-lived presigned GET links, reusing `lib/r2.ts`.
- **The B1 guarantee changes on purpose.** Today production allows Razorpay only. After this work production allows Razorpay and `pp_upimanual_upimanual`; the guard, the config check script and their tests get an allowlist, and nothing else (such as `pp_system_default`) is allowed.
- **Use a business UPI ID.** Collecting store payments on a personal UPI ID can hit app limits and complicates GST records. Confirm the exact setup with your CA.

## Existing files that get a small additive edit

Everything else is new files. Each edit below is a few lines and is a no-op when the flag is off.

| File | Edit |
| --- | --- |
| `apps/backend/medusa-config.ts` | Register the `upi_payment` module and, when flagged, the UPI payment provider |
| `apps/backend/src/api/middlewares.ts` | Add routes for the new store and admin endpoints |
| `apps/backend/src/api/middlewares/rate-limit.ts` | Add `upi_proof` and `upi_upload` to the `RateLimitAction` type |
| `apps/backend/src/scripts/check-production-config.ts` | Allow `pp_upimanual_upimanual` alongside Razorpay |
| `apps/backend/src/modules/resend/emails/templates.ts` | Append new templates; existing ones unchanged |
| `apps/backend/src/subscribers/order-placed.ts` | Mention "payment pending" when the order used UPI |
| `apps/storefront/src/lib/payment-guard.ts` | Allowlist the UPI provider (flag-gated) |
| `apps/storefront/src/lib/constants.tsx` | Add a `paymentInfoMap` entry for the UPI provider |
| `apps/storefront/src/components/CheckoutFlow.tsx` | Add the UPI option; Razorpay stays the default |
| `apps/storefront/src/app/order/[id]/page.tsx` | Render the Pay now panel when the order used UPI |
| `apps/storefront/src/__tests__/payment-guard.test.js` | Extend the 25 tests for the allowlist |
| `.env.example` and `.env.template` (both apps) | New variables with placeholders only |

## Prompt 0: session preamble

Paste this first in every new session, then one prompt at a time. After each prompt run `npm run lint`, `npm run test`, `npm run build`, commit on its own branch (for example `feature/upi-manual-1-module`) and tick it off.

```text
You are working in the LITA monorepo (Medusa v2.21.2 backend + Next.js 15 storefront, npm workspaces, Turborepo). India-only, INR-only, region "in". Razorpay (pp_razorpay_razorpay) is live and must keep working exactly as it does today.

We are adding a SECOND payment option: direct UPI with manual verification (provider id pp_upimanual_upimanual). The customer pays our UPI ID/QR, submits the UTR and optionally a screenshot, and an admin verifies and captures the payment in Medusa Admin.

Before doing anything:
1. Read AGENTS.md and PROJECT_PROGRESS.md (sections 5, 6, 8) and docs/razorpay.md.
2. Read apps/backend/src/modules/commission and apps/backend/src/modules/inquiry (module + model + migration pattern), apps/backend/src/workflows/inquiries.ts (workflow pattern), apps/backend/src/lib/r2.ts (presigned uploads), apps/backend/src/api/middlewares.ts and apps/backend/src/api/middlewares/rate-limit.ts.
3. Use the Medusa docs/MCP for any Medusa v2 API question. Do not guess payment-provider or workflow signatures.

Rules:
- Additive only. Do not change Razorpay behaviour, its provider, webhook, reconcile workflow or tests. Every edit to an existing file must be a no-op when ENABLE_UPI_MANUAL is not "true" (backend) and NEXT_PUBLIC_ENABLE_UPI_MANUAL is not "true" (storefront).
- npm only, never a second lockfile. Install inside the app that needs it (cd apps/backend && npm install <pkg>).
- Backend style: no semicolons, double quotes, 2-space indent, kebab-case files. No emojis in code, comments or commits.
- Business logic in workflows; routes validate input and run a workflow.
- Never edit an existing migration; generate a new one with npx medusa db:generate <module>.
- Never print or commit secrets. New env vars go into .env.example and .env.template with placeholders only.
- Never disable a @medusajs/* lint rule. No destructive DB commands.
- The amount shown or charged is always computed on the server from the order total. Never trust a client amount.

How to work: give a short plan (files to add/change, risks) first, then implement, add or update tests for every behaviour change, run npm run lint, npm run test, npm run build from the repo root and report the real results. Finish with: files changed, how to verify manually, anything you could not verify.

Confirm you have read the files above, then wait for the next prompt.
```

## Prompt 1: UPI payment module and migration

Creates the table that holds each UPI payment attempt. Nothing is wired into checkout yet, so this is safe to merge alone.

```text
Goal: add a custom Medusa module "upi_payment" that stores one record per UPI order payment.

1. Create apps/backend/src/modules/upi-payment/ following the commission module pattern (models/upi-payment.ts, service.ts, index.ts exporting UPI_PAYMENT_MODULE = "upi_payment").
2. Model UpiPayment (model.define("upi_payment")):
   - id: model.id({ prefix: "upi" }).primaryKey()
   - reference_code: model.text().unique()   // e.g. LITA-7K3Q9M, shown to the customer and used as the UPI note
   - order_id: model.text().nullable().index()
   - cart_id: model.text().nullable().index()
   - payment_session_id: model.text().nullable()
   - customer_id: model.text().nullable().index()
   - email: model.text()
   - amount: model.number()                 // INR in major units, same unit as the Medusa order total
   - currency_code: model.text().default("inr")
   - status: model.enum(["awaiting_proof","submitted","verified","rejected","expired"]).default("awaiting_proof")
   - utr: model.text().nullable().unique()   // 12 digits; unique so one UTR cannot back two orders
   - payer_vpa: model.text().nullable()
   - screenshot_key: model.text().nullable() // R2 object key under upi-proofs/<reference_code>/
   - submitted_at, verified_at, rejected_at: model.dateTime().nullable()
   - verified_by: model.text().nullable()    // admin user id
   - reject_reason: model.text().nullable()
   - expires_at: model.dateTime()
   - attempts: model.number().default(0)     // proof submissions, capped at 5
3. Service: UpiPaymentModuleService extends MedusaService({ UpiPayment }).
4. Register the module in apps/backend/medusa-config.ts next to the other custom modules. Registering the module is harmless when the feature flag is off (empty table).
5. Generate the migration: cd apps/backend && npx medusa db:generate upi_payment. Do NOT run db:migrate against the remote database; tell me the command to run.
6. Add a helper src/lib/upi.ts with pure, unit-testable functions:
   - generateReferenceCode(): "LITA-" + 6 chars from an unambiguous alphabet (no 0/O/1/I), crypto.randomInt based
   - isValidUtr(value): exactly 12 digits after trim
   - buildUpiLink({ vpa, name, amount, reference }): upi://pay?pa=<vpa>&pn=<name>&am=<amount with 2 decimals>&cu=INR&tn=<reference>&tr=<reference>, every value URL-encoded
   - signProofToken(reference, orderId) and verifyProofToken(token, reference, orderId): HMAC-SHA256 with JWT_SECRET, timingSafeEqual, no expiry needed (it dies when the record is final)
7. Unit tests in src/__tests__/upi-lib.unit.spec.ts: reference alphabet and uniqueness over 10,000 generations, UTR validation (11, 12, 13 digits, letters, spaces), link encoding and 2-decimal amount, token round trip and tamper rejection.

Acceptance: lint, unit tests and build pass; the new migration file exists; no existing migration changed; the module is registered; nothing else behaves differently.
```

## Prompt 2: payment provider, config and guard allowlists

The only prompt that touches existing guard code. Read the risk note first.

```text
Goal: add a payment provider pp_upimanual_upimanual that lets a cart complete without capturing money, and teach the existing production guards to allow it when the flag is on.

Part A - backend provider
1. Create apps/backend/src/modules/upi-manual/ (index.ts with ModuleProvider(Modules.PAYMENT, ...), service.ts) modelled on modules/razorpay/service.ts, identifier "upimanual".
2. Options: { vpa, payee_name, expiry_hours }. validateOptions requires vpa and payee_name.
3. initiatePayment: reject currency other than INR (same message style as the Razorpay B8c guard). Return { id: <session id or generated>, data: { method: "upi_manual", vpa, payee_name } }. Strip any client-supplied keys named reference_code, status, verified, amount.
4. authorizePayment: return status AUTHORIZED (so completeCartWorkflow creates the order) with the data unchanged. It must never mark the payment captured.
5. capturePayment: return the data with captured_at set. It is only reached from the admin Verify workflow (Prompt 6), never from the storefront.
6. refundPayment: return the data with a refund entry appended (amount, refunded_at). It does NOT move money; the docs and admin UI must say refunds are sent manually from the business UPI app first.
7. cancelPayment, deletePayment, updatePayment, retrievePayment, getPaymentStatus, getWebhookActionAndData: minimal correct implementations; getWebhookActionAndData returns { action: PaymentActions.NOT_SUPPORTED }.
8. Register in apps/backend/medusa-config.ts inside the @medusajs/medusa/payment providers array ONLY when process.env.ENABLE_UPI_MANUAL === "true", with options from UPI_VPA, UPI_PAYEE_NAME, UPI_ORDER_EXPIRY_HOURS (default 48). If the flag is on and UPI_VPA or UPI_PAYEE_NAME is missing, fail startup with a clear MedusaError, same style as the Razorpay credential guard.

Part B - guards (flag-gated, additive)
9. apps/storefront/src/lib/payment-guard.ts: add UPI_MANUAL_PROVIDER_ID = "pp_upimanual_upimanual" and isUpiManualProvider(id). isSupportedProvider and assertAllowedProvider accept it only when process.env.NEXT_PUBLIC_ENABLE_UPI_MANUAL === "true". Razorpay logic and the pp_system_default rule stay exactly as they are.
10. apps/backend/src/scripts/check-production-config.ts: allow pp_upimanual_upimanual in regions only when ENABLE_UPI_MANUAL === "true"; any other provider still fails the script with exit code 1.
11. apps/storefront/src/lib/constants.tsx: add a paymentInfoMap entry for the UPI provider (title "Pay by UPI", a UPI/QR style icon from @medusajs/icons or inline SVG). Do not remove existing entries.
12. Update apps/storefront/src/__tests__/payment-guard.test.js: keep all 25 existing tests unchanged and passing; add tests for flag off (UPI rejected in production), flag on (UPI accepted, pp_system_default still rejected), and Razorpay unaffected.
13. Backend unit tests in modules/upi-manual/__tests__/upi-manual-provider.unit.spec.ts: non-INR rejected, authorize returns AUTHORIZED, client keys stripped, capture sets captured_at, refund appends an entry, config validation.
14. Env: add ENABLE_UPI_MANUAL, UPI_VPA, UPI_PAYEE_NAME, UPI_ORDER_EXPIRY_HOURS to apps/backend/.env.example and .env.template (placeholders, flag false); add NEXT_PUBLIC_ENABLE_UPI_MANUAL=false to both storefront env files. Do not touch any real .env.

Manual step for me afterwards: Medusa Admin > Settings > Regions > India > add the UPI provider alongside Razorpay. Tell me exactly this at the end.

Acceptance: with flags off, startup and tests behave exactly as before; with flags on, the provider registers and check:prod-config passes with both providers and fails with pp_system_default.
```

**Risk note.** This deliberately loosens the B1 rule "Razorpay is the only way to place an order in production". It is safe only because this provider never captures; an order paid this way stays unpaid in Admin until you verify it.

## Prompt 3: store API for proof submission and uploads

The customer-facing endpoints. Business logic lives in workflows, routes only validate and call them.

```text
Goal: backend endpoints and workflows so a customer (logged in or guest) can see UPI payment instructions for their order and submit proof.

1. Workflow src/workflows/upi-payments.ts (follow workflows/inquiries.ts style, steps with compensation where a write happens):
   - ensureUpiPaymentForOrderWorkflow(order_id): idempotent. Loads the order with Query Graph (id, email, customer_id, total, currency_code, payment_collections.payment_sessions.provider_id). If no session uses pp_upimanual_upimanual, throw NOT_FOUND. If an upi_payment already exists for the order_id, return it. Otherwise create one: reference_code from generateReferenceCode() (retry on unique collision up to 5 times), amount = order total (major units), status awaiting_proof, expires_at = now + UPI_ORDER_EXPIRY_HOURS (default 48). Emit upi_payment.status_changed with { id, status: "awaiting_proof" }.
   - submitUpiProofWorkflow({ reference_code, utr?, screenshot_key?, payer_vpa? }): validate state and data (below), update the record to status submitted, set submitted_at, increment attempts, emit upi_payment.status_changed.
2. Subscriber src/subscribers/upi-order-placed.ts on order.placed: if the order used the UPI provider, run ensureUpiPaymentForOrderWorkflow. Because events are async, the GET endpoint below also runs the same idempotent workflow, so the order page never races the subscriber.
3. Routes (all under src/api/store/upi-payments/):
   - GET by-order/[order_id]/route.ts: runs ensureUpiPaymentForOrderWorkflow and returns ONLY { reference_code, amount, currency_code, status, expires_at, reject_reason, vpa, payee_name, upi_link, proof_token, has_screenshot, utr_last4 }. Never return email, customer_id or the full UTR. proof_token = signProofToken(reference_code, order_id). The order id is already the capability the existing order page relies on; note this in a code comment and rate limit the route.
   - [reference]/upload-url/route.ts (POST): requires header x-upi-token (verifyProofToken) OR a logged-in customer who owns the record. Body { filename, contentType, size }. Allow image/jpeg, image/png, image/webp, max 5 MB. Return a presigned PUT URL (reuse lib/r2.ts, 5 minute expiry) for key upi-proofs/<reference_code>/<uuid>-<sanitized filename>. Refuse unless status is awaiting_proof, submitted or rejected.
   - [reference]/proof/route.ts (POST): same auth. Body { utr?, screenshot_key?, payer_vpa?, turnstile_token?, website? }. Rules: honeypot field website must be empty (silently return 200 with no write if filled, same as inquiries); Turnstile verified with lib/turnstile.ts; at least one of utr or screenshot_key; utr must pass isValidUtr; screenshot_key must start with upi-proofs/<reference_code>/; refuse when status is verified or expired (409 / 410); refuse after 5 attempts (429-style message); refuse when expires_at has passed (410). A UTR already stored on another record returns 409 with the message "This UTR is already linked to another order" (catch the unique-index error, do not leak the other order).
4. src/api/middlewares.ts: add routes with validateAndTransformBody (zod, trimmed, max lengths) and createRateLimitMiddleware("upi_proof", 5, 15 min) for proof, ("upi_upload", 10, 15 min) for upload-url, ("upi_lookup", 30, 15 min) for the GET. Add those three names to RateLimitAction in src/api/middlewares/rate-limit.ts. Use authenticate("customer", ["bearer","session"], { allowUnauthenticated: true }) on these routes.
5. Tests: src/api/store/upi-payments/__tests__/upi-payments.unit.spec.ts covering missing/invalid token (401), wrong reference, honeypot, invalid UTR, duplicate UTR (409), screenshot key outside the prefix, expired (410), verified (409), attempts cap, GET projection contains no email, idempotent ensure workflow, upload MIME and size rules.

Acceptance: with ENABLE_UPI_MANUAL not true the routes return 404; lint, tests, build pass; no Razorpay file changed.
```

## Prompt 4: checkout option

Adds the choice at checkout. Razorpay remains the default and its code path is untouched.

```text
Goal: let the customer choose "Pay by UPI (QR / UPI ID)" at checkout when NEXT_PUBLIC_ENABLE_UPI_MANUAL === "true".

1. Read apps/storefront/src/components/CheckoutFlow.tsx, src/lib/data/cart.ts (startPayment, initiatePaymentSession, placeOrder) and src/lib/payment-guard.ts. Show me how the existing non-production manual-payment branch places an order; reuse that pattern for the UPI branch instead of inventing a new one.
2. In CheckoutFlow.tsx add a second payment option below Razorpay, only when the provider pp_upimanual_upimanual is returned by listPaymentProviders and the flag is on. Razorpay stays pre-selected. Label: "Pay by UPI (QR / UPI ID)". Helper text: "Pay from any UPI app after placing your order. Your order is held for 48 hours while we confirm your payment." Use the existing visual style (gallery tokens, no new colours).
3. When UPI is selected: startPayment(UPI provider id) runs through the existing server-side guard (Prompt 2 allowlist), the button reads "Place order and pay by UPI", and on success redirect to /order/<id>?pay=upi. Do not open the Razorpay modal and do not load the Razorpay script for this path.
4. Errors: show the existing error component with honest messages (provider unavailable, cart changed). Keep the order summary, totals and address steps unchanged.
5. Do not change CartView, CartDrawer, address validation or the Razorpay payment button component.
6. Tests in src/__tests__/upi-checkout.test.js (node:test, same style as payment-guard.test.js): option hidden when flag off, visible when flag on and provider present, Razorpay remains default, UPI path never calls the Razorpay script loader, server guard rejects UPI when flag is off in production.

Acceptance: flag off = checkout identical to today; flag on = both options work; npm run lint, test, build pass.
```

## Prompt 5: pay-now panel on the order page

Where the customer actually pays and submits proof.

```text
Goal: on /order/[id], when the order used UPI, show a Pay now panel with QR, deep link, UTR form and screenshot upload.

1. Install the QR library in the storefront only: cd apps/storefront && npm install qrcode && npm install -D @types/qrcode.
2. Server actions in src/lib/data/upi.ts ("use server", same style as lib/data/commission.ts): getUpiPayment(orderId) -> GET /store/upi-payments/by-order/:id; getUpiUploadUrl(reference, token, file meta); submitUpiProof(reference, token, payload). Pass the proof token only between the server action and the client component; never put it in the URL.
3. Component src/components/upi/UpiPayPanel.tsx (client). Layout, in the gallery style:
   - Heading "Complete your payment", amount in INR (use formatMoney), reference code with copy button, countdown to expires_at.
   - Mobile (navigator.userAgent test): a primary "Open UPI app" button using the upi_link from the server.
   - Desktop: QR generated client-side with qrcode.toDataURL from the same upi_link, plus the UPI ID and payee name with copy buttons. Always show the exact amount and say the reference code must be put in the payment note.
   - Proof form: UTR input (12 digits, numeric keypad, inline validation using the same rule as the backend), optional payer UPI ID, optional screenshot drop zone (reuse the presigned PUT upload code and progress UI from CommissionRequestForm.tsx; JPG/PNG/WEBP, 5 MB), Turnstile component and the hidden honeypot field used by InquiryForm.tsx.
   - States from the server status: awaiting_proof (form), submitted ("We are checking your payment. This usually takes a few hours during studio hours." with the last 4 UTR digits), verified (confirmation, no form), rejected (show reject_reason and re-open the form), expired (explain the order was cancelled and link to /artworks). Poll the status every 30 seconds while the tab is visible and stop on verified or expired.
4. src/app/order/[id]/page.tsx: add the panel above the order summary only when ?pay=upi is present or the order payment provider is the UPI one. Do not change the rest of the page, and do not change getOrder.
5. next.config.js: when the CSP moves from report-only to enforced later, connect-src must include the R2 endpoint (commission uploads already need it). Add a code comment, do not change the policy now.
6. Accessibility and copy: buttons and inputs labelled, live region for status changes, no claim that payment is confirmed until status is verified.
7. Tests in src/__tests__/upi-panel.test.js: state rendering for each status, UTR validation, mobile vs desktop branch, QR built from the server link (not from client-built amounts), no proof token in any URL.

Acceptance: Razorpay orders show no panel; a UPI order shows the right state for every status; lint, test, build pass.
```

## Prompt 6: admin verification screen

The screen you work in every day: see submitted payments, match them with your bank or UPI app, verify or reject.

```text
Goal: an Admin page "UPI Payments" and workflows that verify (capture) or reject a UPI payment.

1. Workflows in src/workflows/upi-payments.ts (extend the file from Prompt 3):
   - verifyUpiPaymentWorkflow({ id, admin_user_id, amount_confirmed }): require amount_confirmed === true. Load the record and its order (Query Graph). Allowed from status submitted, and also from awaiting_proof (the customer paid but never submitted proof; the admin may confirm from the bank statement). Refuse verified (idempotent no-op returning the record), rejected and expired. Check record.amount equals the current order total; on mismatch throw and tell the admin. Capture the order payment with Medusa's capturePaymentWorkflow (find the payment id from the order payment collection; confirm the exact input in the 2.21.2 docs). Then set status verified, verified_at, verified_by, emit upi_payment.status_changed. If capture fails, leave the record unchanged and surface the error.
   - rejectUpiPaymentWorkflow({ id, reason }): reason required, 3-300 chars. Allowed from submitted or awaiting_proof. Set status rejected, rejected_at, reject_reason, clear utr and screenshot_key so the customer can resubmit and the unique UTR is released. Emit upi_payment.status_changed.
2. Admin routes src/api/admin/upi-payments/: GET (filters ?status= and ?q= matching reference, email, UTR; newest first; each row includes order display_id, order total, a presigned GET URL for the screenshot with 10 minute expiry, and counts per status), POST [id]/verify (body { amount_confirmed: true }), POST [id]/reject (body { reason }). Validate with zod in src/api/middlewares.ts. Record admin id from req.auth_context.actor_id.
3. Admin UI src/admin/routes/upi-payments/page.tsx using @medusajs/ui like the commissions and inquiries pages: defineRouteConfig({ label: "UPI Payments", icon: CreditCard }), TanStack Query, status filter tabs with counts (Submitted first and visually highlighted), search box, table (reference, order #, customer email, amount, UTR, submitted time, expires in, status badge), and a detail drawer with the screenshot preview, copyable UTR and payer UPI ID, a link to the Medusa order, and two actions:
   - Verify: dialog with a required checkbox "I confirmed ₹<amount> with UTR <utr> in my bank or UPI app". Disabled until ticked.
   - Reject: dialog with a required reason and quick reasons (amount mismatch, UTR not found, duplicate, unreadable screenshot).
   Toasts on success and failure; refetch after each action.
4. Show a clear warning banner on the page: refunds for UPI orders are sent manually from the business UPI app first, then recorded in Medusa.
5. Tests: src/api/admin/upi-payments/__tests__/upi-admin.unit.spec.ts for verify (amount_confirmed false rejected, amount mismatch, capture called once, idempotent second call, expired/rejected refused), reject (reason required, UTR released), list filters and presigned screenshot URL.

Acceptance: verifying a test order flips the Medusa order payment status to captured and the record to verified; rejecting lets the customer resubmit; lint, test, build pass.
```

## Prompt 7: emails

Uses the existing Resend notification pipeline and editorial layout.

```text
Goal: customer and studio emails for the UPI flow, reusing apps/backend/src/modules/resend/emails/editorial-layout.ts and the pattern in subscribers/commission-status-changed.ts.

1. Append new templates to apps/backend/src/modules/resend/emails/templates.ts without changing existing ones:
   - upi-payment-instructions (customer, on awaiting_proof): reference code, exact amount, UPI ID, deadline, button to the order page /order/<id>?pay=upi.
   - upi-proof-received-studio (studio inbox, on submitted): reference, order number, amount, last 4 UTR digits, button to Admin > UPI Payments. Send to STUDIO_EMAIL.
   - upi-payment-verified (customer, on verified): payment received, link to the order.
   - upi-payment-rejected (customer, on rejected): the reject reason and a button to resubmit.
   - upi-payment-expired (customer, on expired): order cancelled, link to the shop.
   Escape all user-supplied text (UTR is digits only; reject reason and names must be HTML-escaped).
2. Subscriber src/subscribers/upi-payment-status-changed.ts on upi_payment.status_changed. Load the record, map status to template, send through the Notification module on the email channel. Log only ids and status in production, never the email body, UTR or links.
3. src/subscribers/order-placed.ts: when the order used the UPI provider, send a "payment pending" variant of the existing order confirmation instead of "order confirmed and paid", wording such as "We have received your order and will confirm it once your UPI payment is verified". Keep the Razorpay path byte-for-byte the same.
4. Add tests to src/subscribers/__tests__/notification-subscribers.unit.spec.ts or a new file: each status sends the right template, studio email on submitted, no UTR or secrets in logs, HTML escaping, Razorpay order email unchanged.

Acceptance: with RESEND_API_KEY unset, emails are logged without links in production mode (existing behaviour); lint, test, build pass.
```

## Prompt 8: expiry job and refunds

Without this, unpaid UPI orders would hold stock forever.

```text
Goal: automatically cancel UPI orders that are not paid in time, and define how refunds work.

1. Scheduled job src/jobs/expire-upi-payments.ts (hourly, config { name, schedule: "0 * * * *" }). It runs only in worker or shared mode (see docs/infrastructure.md) and only when ENABLE_UPI_MANUAL === "true". Find records with status awaiting_proof or rejected and expires_at in the past. Records in submitted are NEVER auto-expired: the customer did their part, so show them as overdue in Admin instead and leave the decision to the admin.
2. expireUpiPaymentWorkflow({ id }): re-check status inside the workflow (a verify may have just happened), cancel the Medusa order with cancelOrderWorkflow (confirm the exact name and input in the 2.21.2 docs) so inventory reservations are released, set status expired, emit upi_payment.status_changed. Idempotent; compensation leaves the record unchanged if cancel fails. Use a distributed lock keyed upi_payment:<id> so verify and expire cannot run at the same time (the Redis locking provider is already configured).
3. Admin: in the UPI Payments table add a "Submitted for more than 24 hours" highlight and a manual Cancel order action for awaiting_proof records.
4. Refunds: the UPI provider's refundPayment only records the refund. Add a short admin helper text on the order page widget or the UPI page: "Send the refund from the business UPI app first, then click Refund in Medusa to record it". Add a docs section in docs/upi-manual.md with the exact steps and a refund log convention (UTR of the refund in the refund note).
5. Configuration: UPI_ORDER_EXPIRY_HOURS (default 48, min 6, max 168) read once in a small config helper shared by the provider and the job.
6. Tests: src/jobs/__tests__/expire-upi-payments.unit.spec.ts and workflow tests: expired only when awaiting_proof or rejected, submitted untouched, verify-then-expire race resolves to verified, order cancelled once, second run is a no-op, lock used.

Acceptance: a test order left unpaid past the deadline is cancelled and its stock released; a verified order is never cancelled; lint, test, build pass.
```

## Prompt 9: tests, docs and production checks

Closes the work and records it the way the earlier blockers were recorded.

```text
Goal: finish and document the UPI manual payment feature.

1. Write docs/upi-manual.md: purpose, flow and status table, env variables, how to enable (flags, Admin region step), daily admin routine (open UPI Payments, match UTR and amount in the bank app, verify or reject), refund procedure, expiry rules, security notes (server-side amount, signed proof token, unique UTR, private R2 prefix), and known limits (no automatic confirmation, depends on the admin checking the bank).
2. Add an integration-style test script src/scripts/test-upi-flow.ts (same idea as test-commission-flow.ts) that runs: create a cart-like order fixture, ensure the UPI record, submit proof, verify, assert the payment is captured, and run again to prove idempotency. It must refuse to run when NODE_ENV is production.
3. Update PROJECT_PROGRESS.md: add a numbered item in section 5 describing this feature (modules, routes, workflows, files, tests), an entry in the master TODO list, and a note under B1 that production now allows pp_razorpay_razorpay and pp_upimanual_upimanual only, with the reason. Update AGENTS.md directory notes only if a new top-level folder was added.
4. Update docs/razorpay.md section 9 (Production Checklist: Regions & Payment Providers) so the allowed set is "Razorpay, plus UPI manual when ENABLE_UPI_MANUAL is true".
5. Run the full suite from the repo root: npm run lint, npm run test, npm run build, and from apps/backend: npm run test:unit and npm run check:prod-config (with the flag on and off). Report the real results and the number of new tests.
6. List every file you changed that existed before this feature, with a one-line reason each, so I can confirm Razorpay code is unchanged (git diff --stat should show no edits under apps/backend/src/modules/razorpay, workflows/reconcile-razorpay-order.ts or subscribers/razorpay-payment-recovery.ts).

Acceptance: all checks green, Razorpay files untouched, docs written.
```

## Go-live checklist and limits

Test everything in a staging or local environment with the flags on before enabling it in production.

- [ ] Business UPI ID and payee name decided; `UPI_VPA`, `UPI_PAYEE_NAME` set in the backend env
- [ ] `ENABLE_UPI_MANUAL=true` on the server and the worker; `NEXT_PUBLIC_ENABLE_UPI_MANUAL=true` on the storefront
- [ ] Migration for `upi_payment` applied (`npx medusa db:migrate`, over the direct database connection)
- [ ] Medusa Admin > Settings > Regions > India lists Razorpay and the UPI provider, nothing else
- [ ] `npm run check:prod-config` passes with the flag on
- [ ] R2 CORS allows PUT from the storefront origin; the `upi-proofs/` prefix is not publicly readable
- [ ] Test order: place, pay a small amount, submit UTR, verify, confirm the order shows captured and the emails arrive
- [ ] Test rejection and resubmission, and a test order left to expire
- [ ] Worker instance is running so the expiry job and email subscribers fire
- [ ] Terms and shipping pages mention UPI orders are held for 48 hours and confirmed manually; refund timeline stated
- [ ] CA confirms GST invoice handling for payments received directly on UPI

**Limits to accept.** Confirmation is manual, so a customer waits until you check. Anyone can type a UTR, so you must match UTR, amount and time against your own bank or UPI app before verifying; the app cannot do that for you. Refunds are sent by you first and recorded after. At low order volume this is fine; if volume grows, Razorpay's UPI (or a payment-link provider with UPI) removes the manual step.

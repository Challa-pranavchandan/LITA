# LITA - Blocker Fix Prompts

Copy one prompt at a time into your AI coding assistant (Claude Code, Cursor, etc.) from the repo root. Each prompt is self-contained, but they assume you paste **Prompt 0** first in a new session.

Blocker IDs (B1 to B10) match section 6.2 of `PROJECT_PROGRESS.md`.

## Recommended order

| Step | Prompt | Why this order |
| :--- | :--- | :--- |
| 0 | Prompt 0 - Session preamble | Paste at the start of every new session |
| 1 | B7 - Clean build baseline | Everything else needs a build you can trust |
| 2 | B1 - Remove manual payment path | Smallest money-safety fix |
| 3 | B2 - Revalidate endpoint | Quick auth fix |
| 4 | B3 - Trade application data leak | Privacy fix |
| 5 | B8a to B8d - Razorpay hardening | Code-side payment safety |
| 6 | B4 - Redis, workers, locking | Needed before emails and webhooks are reliable |
| 7 | B5a to B5d - Notifications and emails | Depends on B4 for reliable events |
| 8 | B6 - Contact, inquiry, newsletter | Reuses the email foundation from B5a |
| 9 | B10 - Commission payment path | Reuses Razorpay and emails |
| 10 | B8e - Razorpay verification and go-live runbook | Needs staging from the infra work |
| 11 | B9 - Legal, tax, content | Needs your lawyer and CA, can run in parallel with everything |

After each prompt: run the checks listed in "Definition of done", commit on its own branch, and tick the matching box in `PROJECT_PROGRESS.md`.

---

## Prompt 0 - Session preamble (paste first, every session)

```text
You are working in the LITA monorepo (Medusa v2 backend + Next.js 15 storefront, npm workspaces, Turborepo). The store is India-only and INR-only; there is one default region "in".

Before doing anything:
1. Read PROJECT_PROGRESS.md (especially sections 5, 6 and 8) and AGENTS.md.
2. Use the Medusa docs / MCP server for any Medusa v2 API question instead of guessing. The installed Medusa version is 2.21.2.

Repo rules you must follow:
- Package manager is npm. Never create a second lockfile. Install dependencies inside the app that needs them (cd apps/backend && npm install <pkg>).
- Backend code style: no semicolons, double quotes, 2-space indent, kebab-case file names. No emojis in code, comments or commit messages.
- Business logic goes in Medusa workflows, not in route handlers. Routes validate input and run a workflow.
- Never edit an existing migration. If a model changes, run: cd apps/backend && npx medusa db:generate <module> and commit the new migration.
- Never print, commit or copy real secret values. Document new variables in the .env.example / .env.template files with placeholders only.
- Never disable a @medusajs/* ESLint rule to make lint pass.
- Do not run destructive database commands against my database.
- Do not touch apps/backend/.medusa, .next, dist, out, .turbo, or lockfiles by hand.

How to work:
- First give me a short plan (files you will change, risks). Then implement.
- Add or update tests for every behaviour change.
- At the end, run: npm run lint, npm run test, npm run build (from the repo root) and report the real results. If something fails for reasons unrelated to your change, say so instead of hiding it.
- Finish with a summary: files changed, how to verify manually, anything you could not verify.

Confirm you have read the files above, then wait for my next prompt.
```

---

## B7 - Clean build baseline

**Problem:** `next.config.js` has `typescript.ignoreBuildErrors: true` and `eslint.ignoreDuringBuilds: true`. The storefront imports packages that are not declared (`@headlessui/react`, `react-instantsearch`, `instantsearch.js`, `@medusajs/instantsearch-adapter`, `@stripe/stripe-js`, `@stripe/react-stripe-js`, `ansi-colors`, and some that only resolve through hoisting: `clsx`, `lodash`, `@radix-ui/react-slider`, `react-country-flag`, `@medusajs/icons`). There are two lockfiles. The storefront has no `lint` or `test` script.

```text
Goal: a fresh clone must pass `npm ci && npm run lint && npm run test && npm run build` with NO ignored errors.

Step 1 - Map what is actually used.
- The live storefront routes are the ones directly under apps/storefront/src/app (about, account, artworks, cart, checkout, collections, commissions, contact, gallery, journal, login, order, privacy, register, saved, shipping, terms, trade, trade-program, verify-email, forgot-password, reset-password, auth, api). The tree apps/storefront/src/app/[countryCode] is leftover Medusa starter code for a multi-country store.
- Build an import reachability list starting from every file in src/app EXCLUDING src/app/[countryCode], src/app/api/payment-return and src/app/[countryCode]/** . Report which files under src/modules, src/lib, src/components and src/types are reachable and which are not. Show me this list before deleting anything.
- Note that src/components/CheckoutFlow.tsx imports from src/modules/checkout/components/payment-button/razorpay-payment-button.tsx, so some src/modules files are live. Do not delete anything reachable.

Step 2 - Remove dead code (only what is unreachable).
- Delete the unreachable starter code: the [countryCode] route tree, api/payment-return (Stripe), stripe-wrapper, PayPal/iDEAL/Bancontact icons and entries in paymentInfoMap that are not needed, medusa-cta, product-onboarding-cta, lib/data/onboarding.ts (it redirects to localhost:7001), and the instantsearch search UI if nothing live uses it.
- Do NOT delete the search code if a live route uses it; instead tell me and stop on that item.
- Delete the stub routes apps/backend/src/api/store/custom/route.ts and apps/backend/src/api/admin/custom/route.ts.

Step 3 - Dependencies.
- Delete apps/storefront/package-lock.json (its package name is "art-store"; the root package-lock.json is the only lockfile).
- For every remaining import that is not in apps/storefront/package.json, either add it with `cd apps/storefront && npm install <pkg>` (pin sensible versions) or remove the import. Re-run the import scan to prove nothing is undeclared.
- Replace the `ansi-colors` usage in apps/storefront/check-env-variables.js with plain console output so the dependency is not needed.
- Add eslint and eslint-config-next as devDependencies if the existing .eslintrc.json needs them.
- Run `npm install` at the repo root once to refresh the single lockfile.

Step 4 - Turn the safety nets on.
- In apps/storefront/next.config.js remove `typescript.ignoreBuildErrors` and `eslint.ignoreDuringBuilds`.
- Add scripts to apps/storefront/package.json: "lint" (next lint or eslint), "typecheck" (tsc --noEmit, already present), "test" (node --test over src/__tests__). Make sure turbo.json has outputs declared for any new task.
- Fix every TypeScript and ESLint error that appears. Prefer real fixes; no `any` or `@ts-ignore` sprinkling unless you explain why in a comment.

Acceptance criteria:
- From a fresh clone: npm ci, npm run lint, npm run test, npm run build all succeed.
- `grep -rn "ignoreBuildErrors\|ignoreDuringBuilds" apps/storefront/next.config.js` returns nothing.
- Only one package-lock.json exists in the repo.
- The existing storefront tests (auth.test.js, next-config.test.js) still pass; update next-config.test.js if the config changed.

Report: list of deleted files, list of added/removed dependencies, list of errors fixed.
```

---

## B1 - Remove the manual payment path

**Problem:** `CheckoutFlow.tsx` accepts `pp_system_default` and labels it "Manual Payment (Pay Offline / Test)". The seed creates a region with `pp_system_default`. In production this lets a buyer place an order without paying.

```text
Goal: in production, the only way to place an order is through Razorpay.

1. apps/storefront/src/components/CheckoutFlow.tsx
   - Change isSupportedProvider so pp_system_default is accepted only when process.env.NODE_ENV !== "production". Razorpay (isRazorpay) is always accepted.
   - Hide the "Manual Payment (Pay Offline / Test)" label and the generic "Place order" button path in production.
   - If no supported provider is available in production, show the existing "Payment isn't switched on" message.

2. apps/storefront/src/lib/data/cart.ts (and anywhere else that starts a payment session or places an order)
   - Add a server-side guard: when NODE_ENV is production and the requested provider_id is not a Razorpay provider, throw an error before calling Medusa. A client must not be able to call the server action with pp_system_default and succeed.

3. Backend safety net (so the check does not depend on the storefront)
   - Create apps/backend/src/scripts/check-production-config.ts, runnable with `npx medusa exec ./src/scripts/check-production-config.ts`.
   - It must read all regions (with their payment_providers and currency_code) through the query/module API (no raw SQL) and exit non-zero with a clear message if ANY region has a payment provider other than pp_razorpay_razorpay, or if any region currency is not "inr".
   - Add an npm script "check:prod-config" in apps/backend/package.json.

4. Seed data
   - apps/backend/src/migration-scripts/initial-data-seed.ts creates a Europe/EUR/USD region with pp_system_default. Do not edit the migration-script in a way that changes history for existing databases; instead tell me the safest way to stop it running against a new production database (for example: replace it with an India/INR seed, or guard it so it only runs when SEED_DEMO_DATA=true) and implement that option.

5. Docs
   - Add a "Production checklist" note to docs/razorpay.md: in Admin > Settings > Regions, the India region must list only Razorpay, and no EUR/USD demo region may exist.

Tests / acceptance:
- Unit test for the storefront guard (production + pp_system_default is rejected; production + Razorpay is accepted; non-production + pp_system_default is accepted).
- Running `npm run check:prod-config` against a database that still has pp_system_default exits non-zero.
- Manual: build the storefront with NODE_ENV=production and confirm the Manual Payment option never renders.
```

---

## B2 - Revalidate endpoint authentication

**Problem:** `apps/storefront/src/app/api/revalidate/route.ts` checks `secret !== process.env.REVALIDATE_SECRET`. If the env var is unset and no secret is sent, `undefined !== undefined` is false, so the call is authorised. The GET handler puts the secret in the URL. `.env.example` contains a real-looking secret and the backend env files do not list `REVALIDATE_SECRET`.

```text
Goal: the revalidate endpoint is impossible to call without a correct, non-empty secret.

1. Create apps/storefront/src/lib/security/revalidate-auth.ts exporting verifyRevalidateSecret(provided: string | null | undefined): boolean
   - Returns false if process.env.REVALIDATE_SECRET is missing, empty, or shorter than 32 characters.
   - Returns false if provided is missing or empty.
   - Compares in constant time: hash both values with SHA-256 and use crypto.timingSafeEqual on the digests.

2. Rewrite apps/storefront/src/app/api/revalidate/route.ts
   - Keep only POST. Remove the GET handler completely (secrets in URLs end up in logs).
   - Read the secret from the request header "x-revalidate-secret" (preferred). For backward compatibility you may also accept body.secret, but prefer the header.
   - Use verifyRevalidateSecret; respond 401 with a generic message on failure. Never echo the secret.
   - Keep the existing cache clearing behaviour (clearCatalogCache, tags, paths).
   - Keep the response small; do not leak internal details.

3. Update apps/backend/src/subscribers/catalog-revalidate.ts
   - Send the secret in the x-revalidate-secret header instead of the body.
   - Keep the "REVALIDATE_SECRET not set" warning, and make sure the message never prints the secret.

4. Environment files
   - apps/storefront/.env.example and .env.template: replace the real-looking value with a placeholder like REVALIDATE_SECRET=replace-with-32-plus-random-chars and add a comment on how to generate one (node -e "console.log(require('crypto').randomBytes(32).toString('hex'))").
   - apps/backend/.env.example and .env.template: add REVALIDATE_SECRET with the same comment, and STOREFRONT_URL if missing.

5. Production guard
   - In apps/backend/medusa-config.ts add REVALIDATE_SECRET (min 32 chars) to the production startup checks, following the existing JWT_SECRET pattern.

Tests / acceptance:
- Unit tests for verifyRevalidateSecret: unset env, empty env, short env, missing provided value, wrong value, correct value.
- A test that the old bug cannot return: env unset + request without secret => false.
- Manual: curl -X POST without the header returns 401; with the header returns 200.
- Tell me to rotate the old secret value (lita_gallery_revalidate_secret_2026) everywhere it was ever used.
```

---

## B3 - Trade application data leak

**Problem:** `GET /store/trade-applications?email=...` (apps/backend/src/api/store/trade-applications/route.ts) works without authentication and returns name, phone, company and message for any email. The route also loads only the newest 100 applications and filters in memory. `middlewares.ts` sets `allowUnauthenticated: true` for this GET.

```text
Goal: only a logged-in customer can read their own trade applications, and the query is correct at any scale.

1. apps/backend/src/api/middlewares.ts
   - For GET /store/trade-applications use authenticate("customer", ["bearer", "session"]) WITHOUT allowUnauthenticated.
   - For POST /store/trade-applications keep it public (it is the application form) but tighten PostTradeApplicationSchema: trim and lowercase email, max lengths (name 120, company 120, role 100, phone 30, website 200 and must be a valid URL when present, message 4000).

2. apps/backend/src/api/store/trade-applications/route.ts
   - GET: remove the ?email= query parameter entirely. Resolve the customer from auth_context.actor_id, load the customer email through the Customer module, and list applications filtered by that email IN THE QUERY (not in memory). Emails were stored with original casing in the past, so filter case-insensitively (for example with the $ilike operator) and store the email lowercased on every new write.
   - Return only the fields the customer needs (id, status, company, role, message, created_at, updated_at). Do not return internal notes.
   - POST: lowercase the email before saving. If the same email already has a pending application, return the existing one (200) instead of creating a duplicate.
   - Keep route handlers thin: move the "find applications for email" and "create or reuse pending application" logic into a workflow or module service method.

3. Storefront apps/storefront/src/lib/data/trade.ts
   - getCustomerTradeApplication must call the endpoint with the customer's auth header (see lib/data/cookies.ts getAuthHeaders) and no email parameter. Update all callers (AccountDashboard.tsx, the localized profile page, TradeApplicationModal prefill).

4. Rate limiting hook
   - Leave a clearly marked TODO that this POST needs the shared rate limiter and captcha from prompt B6. Do not build them here.

Tests / acceptance:
- Backend unit or integration test: GET without auth => 401; GET with customer A returns only A's applications; GET with customer B does not see A's.
- Regression test: the ?email= parameter is ignored/removed.
- More than 100 applications in the table still returns the correct rows for a customer.
- Manual: curl "http://localhost:9000/store/trade-applications?email=someone@example.com" with only the publishable key returns 401.
```

---

## B8 - Razorpay hardening (four prompts, then the runbook in B8e)

Context for all B8 prompts: the provider is `apps/backend/src/modules/razorpay/service.ts`, tests are in `src/modules/razorpay/__tests__/razorpay-provider.unit.spec.ts`, the recovery workflow is `src/workflows/reconcile-razorpay-order.ts`, and the subscriber is `src/subscribers/razorpay-payment-recovery.ts`. Keep all existing tests green.

### B8a - Refund must never silently succeed

```text
In apps/backend/src/modules/razorpay/service.ts, refundPayment currently returns { data: input.data } when razorpay_payment_id is missing. That lets Medusa record a refund that never reached Razorpay.

Change it so:
- Missing razorpay_payment_id => throw MedusaError(INVALID_DATA, "Cannot refund: no Razorpay payment id on this payment").
- A Razorpay API error => log it (payment id only, never secrets) and throw MedusaError(PAYMENT_AUTHORIZATION_ERROR or the most appropriate type) with a clear message; do not swallow it.
- Validate the amount: it must be > 0 and must not exceed the captured amount (fetch the payment from Razorpay first and compare in paise using toPaise).
- Make refunds idempotent where Razorpay supports it (for example by passing a receipt or notes with the Medusa refund id), and explain in a code comment how a retry after a timeout avoids a double refund.

Add unit tests: no payment id, API failure, amount greater than captured, partial refund success, full refund success.
```

### B8b - Stop the browser from setting trusted fields

```text
Problem: authorizePayment skips the HMAC signature check when session data contains webhook_verified = true. updatePayment spreads client-supplied data into the session, and the storefront calls initiatePaymentSession with a data object from the browser, so a client may be able to inject webhook_verified (and, in the "amount unchanged" branch, razorpay_order_id).

Step 1 - Investigate first, and show me your findings before changing code:
- Read the installed @medusajs/payment 2.21.2 source in node_modules and explain exactly what `input.data` contains when the provider's updatePayment and initiatePayment are called: is it the stored session data, the client-supplied data, or a merge? Also explain how paymentModule.updatePaymentSession (used by reconcile-razorpay-order.ts) reaches the provider.
- Write a failing unit test that proves whether a client-supplied webhook_verified or razorpay_order_id can currently survive into session data.

Step 2 - Fix (choose the design that your findings support, and explain why):
- Option A (recommended): replace the plain boolean webhook_verified with a signed marker. The reconcile workflow computes webhook_verification = HMAC_SHA256(webhook_secret, `${session_id}|${razorpay_payment_id}|${razorpay_order_id}`) and stores it. authorizePayment accepts the signature-skip path only if that marker verifies in constant time. A client cannot forge it because it does not know the webhook secret. Strip any client-supplied webhook_verified / webhook_verification before they are stored from client input.
- Option B: remove the signature-skip path; in the recovery case verify server-side by fetching the Razorpay order (client_.orders.fetch) and checking notes.session_id equals this session and amount/currency match.
- In both options, an allowlist applies to client data: only razorpay_payment_id, razorpay_signature and razorpay_order_id may come from the browser, and razorpay_order_id from the browser must equal the order id already stored for this session (never overwrite it). amount, currency, status, key_id and session_id are always server-controlled.

Step 3 - Tests:
- Forged webhook_verified from the client is rejected.
- Client-supplied razorpay_order_id that differs from the stored one is rejected or ignored.
- The legitimate recovery path (reconcile workflow) still authorizes.
- The legitimate modal path (payment id + order id + valid signature) still authorizes.
- All 40 existing unit tests still pass.
```

### B8c - INR enforcement at initiation

```text
In apps/backend/src/modules/razorpay/service.ts, initiatePayment and updatePayment create Razorpay orders for whatever currency_code they receive; INR is only enforced at authorization.

- Reject any currency other than "inr" (case-insensitive) in initiatePayment and updatePayment with MedusaError(INVALID_DATA, "Razorpay is configured for INR only").
- Reject amounts below Razorpay's minimum (1 INR = 100 paise) and non-finite or negative amounts.
- Make toPaise robust to floating point: add tests such as 499.99, 0.1 + 0.2 style values, and large values (for example 1500000.00) to prove the paise value is an exact integer.
- Add a unit test that the storefront payment button's fallback amount calculation (Math.round(Number(cart.total) * 100) in razorpay-payment-button.tsx) never differs from the server's paise value; the server value is the only value used to open the modal, so remove the client fallback and show an error if the session has no amount.
```

### B8d - Prove the replay protection against a real database

```text
Problem: checkPaymentReplay calls paymentModule.listPayments({ data: { razorpay_payment_id } }). I do not know if a filter on a JSON column works in the Payment module. If it silently returns an empty list, replay protection is off.

1. Read how the Payment module handles filters on the json `data` column in 2.21.2 and tell me whether this filter is supported.
2. Write a module integration test (apps/backend/src/modules/razorpay/__tests__, run through the existing test:integration:modules setup with a real PostgreSQL database, using @medusajs/test-utils) that creates two payment sessions/payments, authorizes the first with a payment id, then tries to reuse that payment id on the second, and asserts that the second is rejected.
3. If the JSON filter does NOT work, implement a reliable alternative without raw SQL. Preferred: a tiny custom module "razorpay-claim" with one model (razorpay_payment_id with a unique index, session_id, created_at). In authorizePayment, "claim" the payment id; a unique violation means replay. Generate the migration with `npx medusa db:generate razorpay-claim`. Explain how this behaves if the same session retries authorizePayment (it must be idempotent for the same session).
4. Note in your report that a payment id is also bound to one Razorpay order, and each session creates its own order, so the order_id equality check already blocks most cross-session reuse; explain what replay protection adds beyond that.
```

### B8e - Razorpay verification and go-live runbook

```text
Create docs/razorpay-go-live-runbook.md and make the code support it.

Part 1 - Runbook (documentation, no secrets):
- Test-mode matrix with exact steps and expected results: success, failed card, user closes the modal, pay-then-close-tab (webhook recovery creates the order), double click on pay, cart total changes after the Razorpay order is created, expired Razorpay order, refund from Medusa Admin (full and partial), refund done in Razorpay dashboard (what Medusa shows and why).
- Go-live checklist: KYC approved, Live mode, Settings > Payment Capture set to Automatic, live key id and secret, live webhook at https://<backend-domain>/hooks/payment/pp_razorpay_razorpay with events payment.authorized, payment.captured, payment.failed, order.paid, and the matching secret; the five env variables (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET on the backend; NEXT_PUBLIC_RAZORPAY_KEY_ID on the storefront) and the rule that key mode (test/live) must match across both apps.
- A 1 INR live payment and refund procedure, and what to check in Medusa Admin, Razorpay dashboard and logs.
- Rule: refunds are made only from Medusa Admin.

Part 2 - Code support:
- Webhook idempotency: send the same payment.captured webhook twice (unit test with the subscriber/workflow) and prove only one order is created and the second run exits cleanly. Make reconcile-razorpay-order.ts safe when the storefront completes the cart at the same moment (use the locking module once B4 is done; until then document the limitation).
- Log (do not act on) refund.processed and refund.failed events with a structured warning that includes payment id and order id, so mismatches are visible in monitoring.
- Add a startup guard in medusa-config.ts: in production, RAZORPAY_KEY_ID must start with "rzp_live_" unless ALLOW_RAZORPAY_TEST_IN_PRODUCTION=true, and ALLOW_DEV_PAYMENT_PLACEHOLDERS must be false (fail startup otherwise).
- Update scripts/test-razorpay.ts if needed so it works against test mode and clearly refuses to run with live keys.
```

---

## B4 - Redis event bus, workflow engine, locking, cache, worker mode

**Problem:** `REDIS_URL` appears in `.env.example` but `medusa-config.ts` has no Redis modules. Production would use the in-process event bus (events lost on restart), non-durable workflows, and no cross-instance locking.

```text
Goal: production runs on Redis-backed infrastructure; local development still works without Redis.

First, use the Medusa docs / MCP server for Medusa 2.21.2 to confirm the exact module package names and option shapes for: Redis event bus, Redis workflow engine, locking module with the Redis provider, and the caching module with a Redis provider (note @medusajs/caching 2.21.2 is already a dependency). Also confirm projectConfig.redisUrl (sessions) and projectConfig.workerMode. Show me the confirmed config before editing.

Then in apps/backend/medusa-config.ts:
1. Read REDIS_URL. If it is set, register the Redis modules (event bus, workflow engine, locking with the Redis provider as default, caching with Redis) and set projectConfig.redisUrl. If it is NOT set and NODE_ENV !== "production", keep the in-memory defaults and log one clear warning at startup.
2. In the production startup guard, require REDIS_URL and fail with a clear message if it is missing. Support TLS URLs (rediss://) for managed Redis (Upstash, Redis Cloud, Railway).
3. Add workerMode support: projectConfig.workerMode from MEDUSA_WORKER_MODE ("shared" default, "server", or "worker") and document DISABLE_MEDUSA_ADMIN=true for the worker instance.
4. Keep the existing module list (journal, gallery, trade, commission, feedback, razorpay payment provider, R2 file provider) unchanged.

Also:
- Update apps/backend/.env.example and .env.template with REDIS_URL, MEDUSA_WORKER_MODE and DISABLE_MEDUSA_ADMIN comments. Use placeholders only.
- Add npm scripts or documentation so one deployment runs a "server" instance (HTTP, admin) and one runs a "worker" instance (subscribers, scheduled jobs, workflow retries) from the same build.
- Update src/__tests__/medusa-config.unit.spec.ts: production without REDIS_URL fails; with REDIS_URL registers the four Redis modules; development without REDIS_URL still loads.
- Add docs/infrastructure.md describing the topology (storefront, backend server, backend worker, Postgres, Redis) and the required env vars per service.

Acceptance:
- Local: npm run backend:dev starts without Redis.
- With a local Redis (docker run -p 6379:6379 redis): backend starts, and a subscriber test proves an event survives a backend restart (emit an event, restart before it is processed, verify it still runs).
- Two backend instances running together do not both complete the same cart (document how you tested the lock; at minimum describe the manual test).
```

---

## B5 - Notifications and customer emails (four prompts)

**Problem:** the order page promises a confirmation email, but there is no `order.placed` subscriber. Only password reset exists, via a direct Resend call that logs the reset link when no API key is set. Default sender is `onboarding@resend.dev`.

### B5a - Notification foundation with Resend

```text
Goal: a reusable email pipeline through Medusa's Notification module, using Resend.

Use the Medusa docs / MCP for the Notification module and the recommended Resend provider pattern for 2.21.2 and confirm the API before coding.

1. Create a custom notification provider module at apps/backend/src/modules/resend (service extends the notification provider base class) supporting the "email" channel. Options: api_key, from. It must call the Resend REST API, treat HTTP errors as failures (throw), and never log the API key or full email bodies.
2. Register it in medusa-config.ts under the Notification module. In production, RESEND_API_KEY and RESEND_FROM_EMAIL are required (extend the startup guard) and RESEND_FROM_EMAIL must not be an onboarding@resend.dev address. In development without a key, use the "local" log-only behaviour and print a clear message, but only when NODE_ENV !== "production".
3. Create a small template system in apps/backend/src/modules/resend/templates: one TypeScript function per email that returns { subject, html, text }. Share a layout (header with the LITA wordmark, footer with studio contact details from env variables) matching the editorial look of subscribers/password-reset.ts. Escape every dynamic value to prevent HTML injection. No new heavy dependencies.
4. Create a helper workflow (or step) apps/backend/src/workflows/send-email.ts that takes { to, template, data, idempotency_key } and sends through the Notification module using the core sendNotificationsStep. Use idempotency keys so a retried event does not send twice.
5. Migrate apps/backend/src/subscribers/password-reset.ts to the new workflow. Remove the code path that logs the reset URL when the API key is missing in production (in development it may still print the link).
6. Update apps/backend/.env.example and .env.template: RESEND_API_KEY, RESEND_FROM_EMAIL, STUDIO_NOTIFICATION_EMAIL, STUDIO_NAME, STUDIO_ADDRESS (placeholders only).
7. Update scripts/test-resend.ts to send through the new provider.

Tests / acceptance:
- Unit tests for the Resend provider (success, 4xx, 5xx, missing key) with fetch mocked.
- Unit tests for template escaping (a name like <script>alert(1)</script> is escaped).
- Manual: npm run test:resend delivers a test email.
- Add to docs/email.md the DNS steps to verify the sending domain in Resend: SPF, DKIM and a DMARC policy, and how to test deliverability.
```

### B5b - Order emails

```text
Using the pipeline from B5a, add order emails. Confirm the exact Medusa event names in the 2.21.2 docs first (order.placed, order.fulfillment_created or shipment.created, order.canceled, and the correct event or workflow hook for refunds / payment captured).

Create subscribers in apps/backend/src/subscribers:
1. order-placed: send "Your LITA order #<display_id>" to the customer. Include: items with artwork title, artist/medium if available, quantity, unit price and total in INR formatted for India (Indian digit grouping, for example Rs 1,25,000), shipping address, shipping method, payment method and Razorpay payment reference, estimated delivery text, a link to /account for order history, and studio contact details. Load the order via the query API with the fields you need; do not trust event payload data beyond the id.
2. order-shipped: carrier, tracking number and tracking link when present in the fulfillment data.
3. order-canceled and order-refunded: amount, reason, and expected refund timeline text that comes from a config value (do not invent bank timelines).
4. Also send a copy of every new order to STUDIO_NOTIFICATION_EMAIL with the buyer name, address and items so the studio can start packing.

Rules:
- Use idempotency keys like order-placed:<order_id> so retries never duplicate emails.
- Failures must not block the order: log with the order id and rethrow only where the event bus should retry.
- Money amounts: confirm whether Medusa v2 stores INR as major units (it does for the Razorpay provider here: toPaise multiplies by 100) and format accordingly. Add a tested formatInr helper.
- Update the storefront order page text so it only promises an email once this feature is live.

Tests / acceptance:
- Unit tests for each template with a realistic order fixture.
- Integration or manual test: place a test-mode Razorpay order, confirm the customer email and the studio copy arrive once, not twice.
```

### B5c - Trade and commission emails

```text
Using the pipeline from B5a, add emails for the Trade and Commission modules.

Trade (apps/backend/src/modules/trade, admin route POST /admin/trade-applications/:id):
- Emit a custom event trade-application.created from the store POST route (through a workflow) and trade-application.status_changed from the admin update route (through a workflow). Do not put business logic in the route handlers.
- Applicant emails: "We received your application", "Welcome to the LITA Trade Program" (approved), and a respectful decline (rejected) with the re-apply path.
- Studio email on every new application.

Commission (apps/backend/src/modules/commission, existing admin and store routes):
- Emit events for: request created, admin message sent, quote set (status quoted), customer accepted, converted to order.
- Customer emails: request received, new message from the studio (with a link to /account commissions tab), quote ready with the INR amount, order created.
- Studio emails: new request, customer message, quote accepted.
- Never include private reference image presigned URLs in emails (they expire); link to the account page instead.

Rules: idempotency keys on every send; escape all user-provided text; only send to the email stored on the customer/application record; add unit tests for the templates and for the event emission (the status change only emits when the status actually changes).
```

### B5d - Newsletter (also see B6)

```text
Decide and implement newsletter storage as part of B6. Do not start this prompt before B6 is planned; it exists so you do not forget the email side: welcome email, double opt-in confirmation, and one-click unsubscribe link in every marketing email.
```

---

## B6 - Contact, inquiry and newsletter that never lose data

**Problem:** `apps/storefront/src/app/api/inquiry/route.ts` only logs to the console when `INQUIRY_WEBHOOK_URL` is unset and still returns success. Newsletter signups use the same route. No rate limiting, honeypot or captcha. The in-memory limiter (`lib/security/rate-limit.ts`) only guards login and register and does nothing useful on serverless.

```text
Goal: every contact message, artwork inquiry and newsletter signup is stored in the database, emails the studio, is protected against bots, and the UI only says "sent" when it really was stored.

Part 1 - Backend module and API
- Create a custom Medusa module apps/backend/src/modules/inquiry with a model "inquiry" (kind: contact | artwork | commission_general | trade_general, name, email, phone, artwork_handle, budget, message, status: new | replied | archived, source_url, ip_hash, user_agent, metadata) and a model "newsletter_subscriber" (email unique, status: pending | confirmed | unsubscribed, confirm_token_hash, confirmed_at, unsubscribed_at, source). Generate the migration with npx medusa db:generate inquiry.
- Workflows in src/workflows: create-inquiry (validate, store, send studio email and customer acknowledgement through B5a), subscribe-newsletter (store pending, send confirmation email with a signed single-use token), confirm-newsletter, unsubscribe-newsletter.
- Store routes: POST /store/inquiries, POST /store/newsletter/subscribe, GET /store/newsletter/confirm?token=..., POST /store/newsletter/unsubscribe. Zod validation in middlewares.ts with strict max lengths. Do not store raw IP addresses; store a salted hash.
- Admin: add a page src/admin/routes/inquiries/page.tsx listing inquiries with status filter and a status update action (follow the patterns used by the feedback and trade admin pages).

Part 2 - Bot and abuse protection
- Add Cloudflare Turnstile verification: the storefront widget sends a token; the backend verifies it against Cloudflare's siteverify endpoint with TURNSTILE_SECRET_KEY. Reject missing or invalid tokens with 400. Add NEXT_PUBLIC_TURNSTILE_SITE_KEY to the storefront env templates. In development, allow Turnstile's documented test keys.
- Add a hidden honeypot field (already used by the feedback route) to every public form.
- Make apps/storefront/src/lib/security/rate-limit.ts pluggable: when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set, use @upstash/ratelimit with a sliding window; otherwise fall back to the in-memory limiter ONLY in development (in production, fail closed with a startup/log error if Upstash is not configured). Add a "contact", "inquiry", "newsletter", "feedback", "trade" and "reset" action to the limiter type and apply it to: /api/inquiry (or its replacement), the trade application POST, the feedback POST, password reset requests, and the commission upload-url route (the backend routes can use the same idea through a small middleware keyed by hashed IP).

Part 3 - Storefront
- Replace apps/storefront/src/app/api/inquiry/route.ts with a thin proxy to the backend (or call the backend directly from the forms) and remove INQUIRY_WEBHOOK_URL as the primary path. If the backend call fails, return a 502 and show an honest error; never return ok when nothing was stored.
- Update the forms: NewsletterForm.tsx, InquiryForm.tsx, the contact page, CommissionRequestForm if it uses this route. Add Turnstile, disabled-while-sending state, clear success and error messages.
- Add pages /newsletter/confirmed and /newsletter/unsubscribed.

Tests / acceptance:
- Backend tests: valid inquiry stored and emails queued; invalid token rejected; honeypot silently accepted but not stored; newsletter double opt-in flow; unsubscribe token cannot be reused.
- Rate limit test: the 6th request in the window returns 429 with a Retry-After header.
- Manual: with the backend stopped, submitting a form shows an error and not a success message.
- Studio inbox receives the email and the row appears in Admin > Inquiries.
```

---

## B9 - Legal, tax and content

**Problem:** `privacy/page.tsx` says "Uprise Art" and uses `hello@example.com`, and claims analytics you do not run. `terms` (about 2 KB) and `shipping` (about 1 KB) are too thin. The India region and its tax setup live in your database, not in the repo.

This blocker needs a lawyer and a CA. The prompts below produce drafts and configuration, not legal advice.

### B9a - Business details as configuration

```text
Goal: no legal or business detail is hardcoded in page copy.

1. Extend apps/storefront/src/lib/config.ts siteConfig with: legalName, tradeName, registeredAddress, gstin, pan (optional), contactEmail, contactPhone, grievanceOfficerName, grievanceOfficerEmail, grievanceOfficerPhone, returnsEmail, businessHours. Read them from env variables (NEXT_PUBLIC_LEGAL_NAME etc.), and add them with placeholder values to apps/storefront/.env.example and .env.template.
2. In production builds, fail the build (extend check-env-variables.js) if any of these required values are missing or still contain the placeholder text.
3. Show these details in the Footer (legal name, address, GSTIN, contact) and in the policy pages through siteConfig.
4. Replace every hello@example.com and "Uprise Art" mention in src with siteConfig values. Report each place you changed.
```

### B9b - Draft the policy pages (for lawyer review)

```text
Rewrite these pages for an Indian original-artwork and commission business, using siteConfig values and clearly marked [LAWYER TO CONFIRM] notes wherever a legal or numeric decision is needed. Do not invent facts (return windows, refund timelines, legal citations) - use placeholders like [X] days and list them in a "Decisions needed" section at the end of your reply.

Pages and content:
- /privacy: what is collected (name, email, phone, address, payment reference but NOT card data because Razorpay handles it, uploaded reference images, newsletter email, cookies), purposes, processors (Razorpay, Resend, Supabase, Cloudflare, hosting), retention, user rights and how to exercise them, grievance contact, children, changes. Remove the analytics claim unless analytics is actually installed.
- /terms: eligibility, pricing in INR and tax, order acceptance, availability of one-of-a-kind originals, payment via Razorpay, authenticity and certificate of authenticity, copyright (artist keeps copyright, buyer gets the physical work unless a license is stated), commissions (process, deposit, revisions, cancellation, timelines), limitation of liability, governing law and jurisdiction placeholders.
- /shipping (rename or keep the URL) split into Shipping, Returns and Refunds: processing time, insured shipping, packaging, delivery timelines within India, damage in transit process (photo evidence window), returns eligibility for originals and for prints, custom/commission orders being non-returnable [LAWYER TO CONFIRM], refund method and timing placeholders.
- Footer links to all of them; add a cookie notice only if non-essential cookies exist.
- Make each page production quality: headings, last-updated date from a single constant, mobile friendly, correct metadata title/description.

Also add a checkbox "I agree to the Terms and Privacy Policy" at checkout and on the commission request form, linking to the pages (the checkout currently only mentions the shipping policy).
```

### B9c - GST and tax configuration

```text
Goal: tax is configured in code or a repeatable script, not by memory.

I will give you the decisions from my CA. Until then, build the mechanism and use placeholders. Questions for my CA that you should list at the top of your answer: are prices tax-inclusive; HSN code(s) and GST rate(s) for originals, prints and framing; do I need state-wise CGST/SGST vs IGST based on shipping state; is shipping taxed; invoice numbering and format; is GST registration threshold relevant.

1. Check how Medusa v2 2.21.2 models this: tax regions (country and provinces), tax rates, tax-inclusive pricing on the region or price preferences, and product tax overrides. Explain the best fit for state-wise GST.
2. Create apps/backend/src/scripts/seed-india-tax.ts, idempotent, driven by a config object at the top of the file (rates per product type or product tag, provinces if needed). It must not run automatically.
3. Create apps/backend/src/scripts/verify-india-store.ts that prints: store default currency, supported currencies (must be only INR), regions and their payment providers, tax regions and rates, shipping options and their prices, and flags anything that is not India/INR/Razorpay.
4. Replace the EUR/USD demo seed so a new database gets an India/INR region (see PROJECT_PROGRESS.md S15).
5. Make sure the cart and checkout show tax clearly (tax line and "inclusive of GST" wording if applicable) and that order emails and the order page show the same numbers as Medusa.

Acceptance: running the verify script against my database prints a clean report; a test order with a known price shows the expected tax split.
```

### B9d - Real content checklist

```text
Audit the content and make a checklist file docs/content-launch-checklist.md covering: every seeded/demo product, journal post and gallery item that must be removed (seed-demo-products.ts, seed-journal-posts.ts, initial-data-seed.ts data), real artwork data required per product (title, artist, medium, dimensions, year, edition, certificate of authenticity, price, stock, weight and package dimensions for shipping), image requirements (size, format, alt text), About page copy and photos that still use stock images (public/about/*), and email/phone details. Do not delete production data; produce the list and a safe cleanup script that only removes items whose handles/slugs match the demo seed lists and asks for confirmation (dry-run by default).
```

---

## B10 - Commission payment path

**Problem:** an accepted commission becomes a draft order through `convert-commission-to-order.ts`, but the customer has no way to pay for it. The commission guide only mentions "confirm/pay the draft order or send a payment link".

```text
Goal: after the studio converts an accepted commission, the customer pays securely with Razorpay from their account page, and the commission and order statuses update automatically.

Step 1 - Design (show me before coding; I will confirm the business questions):
Business questions to list for me: full payment or an advance (for example 50%) plus balance; deadline for paying after quote acceptance; what happens if the customer does not pay; whether the commission price includes shipping and GST.
Technical investigation using the Medusa 2.21.2 docs/MCP:
- How to turn a draft order into a real order (convert draft order workflow) and how to create a payment collection for an existing order (the order payment collection workflow) and payment sessions for it.
- Whether the existing Razorpay provider works for order payment collections (it only has cart-based assumptions in reconcile-razorpay-order.ts: it looks up cart_payment_collection). Describe what must change.
- Compare Option A (recommended): Razorpay Standard Checkout modal on a storefront page /account/commissions/<id>/pay using a payment collection on the order, versus Option B: Razorpay Payment Links created by the backend. Recommend one and explain the webhook handling for it.

Step 2 - Implementation of the chosen option (assuming Option A; adapt if you recommend B):
Backend
- Extend convert-commission-to-order.ts (or add a follow-up workflow) so that after conversion the order has a payment collection for the quoted amount in INR, with compensation/rollback steps. Keep the double-conversion guard.
- New store route POST /store/commissions/:id/payment-session (customer auth required, must own the commission, commission status must be "converted" and the order unpaid) that creates or reuses the Razorpay payment session and returns what the storefront modal needs. The amount must come from the server-side order, never from the client.
- Handle the Razorpay webhook for order payment collections: payment.captured / order.paid must capture the payment for the order collection. Update razorpay-payment-recovery.ts / reconcile workflow so a session that belongs to an ORDER collection (no cart) is handled instead of logging "No cart linked".
- Add commission statuses or fields needed: "awaiting_payment" and "paid" (new migration through npx medusa db:generate commission; never edit the existing migration), paid_at, order_id link, payment_reference.
- Emit events so B5c emails fire: payment request sent, payment received.

Storefront
- Add the pay page and a "Pay now" button in the Commissions tab of AccountDashboard.tsx. Reuse RazorpayPaymentButton logic where possible. Show amount, GST note, and clear success, failure and "payment received, confirming" states.
- After payment, show the order in the customer's order history.

Admin
- Show payment status and Razorpay reference on the commission detail screen (src/admin/routes/commissions/page.tsx).

Tests / acceptance:
- Unit tests for the new workflow steps and the route guards (not your commission => 404, wrong status => 400, already paid => 409).
- Test that a client cannot change the amount.
- Test mode end-to-end: request -> quote -> accept -> convert -> pay -> order paid -> commission status paid, plus a pay-then-close-tab case where the webhook completes it.
```

---

## Definition of done (use after every prompt)

```text
Verify the work you just did:
1. Run npm run lint, npm run test and npm run build from the repo root and paste the final lines of each.
2. List every file you changed or created, and any new environment variable (with where it is documented).
3. Describe the manual steps to verify the change in a browser or with curl.
4. State anything you could not verify and why.
5. Propose the exact checkbox lines to tick in PROJECT_PROGRESS.md section 8, and any new risks you found. Do not edit unrelated sections.
```

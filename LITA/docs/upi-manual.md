# Direct UPI payments

## Purpose and payment flow

Direct UPI is an optional, manually verified payment method alongside
Razorpay. It is intended for customers who want to pay the business VPA from
any UPI app. Medusa creates the order after authorizing the UPI session, but
authorization is not proof of receipt: treat the order as unpaid and do not
fulfill it until an administrator matches the transfer and verifies it.

1. The customer chooses **Pay by UPI (QR / UPI ID)** at checkout and places the
   order.
2. The order page shows the exact order total, a reference code, the business
   VPA, a UPI deep link/QR code, and the payment deadline.
3. The customer pays from their UPI app, using the reference code as the
   payment note, then submits the 12-digit UTR and/or a screenshot.
4. The studio checks the transfer in its business bank/UPI app and verifies or
   rejects it in **Medusa Admin > UPI Payments**.
5. Verification captures the Medusa payment. A rejected proof can be corrected
   and resubmitted before the original expiry deadline.

| Status | Meaning | Next action |
| --- | --- | --- |
| `awaiting_proof` | Order exists; no proof has been submitted. | Customer pays and submits proof, or admin confirms directly against the bank statement. |
| `submitted` | Customer submitted a UTR and/or screenshot. | Admin matches the transfer and verifies or rejects it. Submitted payments never auto-expire. |
| `verified` | Admin matched the transfer and Medusa captured the payment. | Proceed with normal fulfillment. |
| `rejected` | Admin rejected the submitted proof; proof fields and UTR were cleared. | Customer may submit corrected proof before expiry. |
| `expired` | An eligible unpaid order was cancelled after its deadline. | The order cannot be paid through this record. |

## Configuration and enablement

Set these variables in the backend environment; placeholders belong in the
tracked `.env.example` and `.env.template`, never real credentials:

| Variable | Purpose |
| --- | --- |
| `ENABLE_UPI_MANUAL` | Backend feature flag. Must be exactly `true` to register the provider, enable its routes, and run expiry processing. |
| `UPI_VPA` | Business UPI ID shown to customers. Required when the backend flag is enabled. |
| `UPI_PAYEE_NAME` | Payee name shown to customers. Required when the backend flag is enabled. |
| `UPI_ORDER_EXPIRY_HOURS` | Order hold duration in hours; defaults to `48`, allowed range is `6`–`168`. |
| `NEXT_PUBLIC_ENABLE_UPI_MANUAL` | Storefront flag. Must be exactly `true` to show the checkout option. |

To enable the feature:

1. Configure the backend variables and enable `ENABLE_UPI_MANUAL=true`.
2. Set `NEXT_PUBLIC_ENABLE_UPI_MANUAL=true` in the storefront environment.
3. Apply the generated migration in the target environment from `apps/backend`:
   `npx medusa db:migrate`.
4. In **Medusa Admin > Settings > Regions > India**, add
   `pp_upimanual_upimanual` alongside `pp_razorpay_razorpay`. Keep the region
   currency as INR.
5. Run `npm run check:prod-config` from `apps/backend` with the intended flag
   setting. With UPI enabled, only Razorpay and the UPI manual provider are
   accepted; with it disabled, only Razorpay is accepted.
6. Run the backend in worker or shared mode so the hourly expiry job runs.

The storefront flag does not register the backend provider by itself. Keep both
flags off until the backend configuration, migration, and India region are
ready.

For a fixture-backed flow smoke test, run `npm run test:upi-flow` from
`apps/backend`. It exercises idempotent record creation, proof submission,
amount verification, and the UPI provider capture marker without writing test
orders or payments to the database. It refuses to run when
`NODE_ENV=production`.

## Daily admin routine

1. Open **Medusa Admin > UPI Payments** and start with the **Submitted** tab.
2. For each proof, compare the exact order amount and UTR with the business
   bank statement or UPI app. Open the screenshot when needed; never treat a
   customer screenshot alone as confirmation.
3. Use **Verify** only after the amount and transfer are visible in the business
   account. The confirmation checkbox is required. Verification captures the
   Medusa payment.
4. Use **Reject** when the transfer cannot be matched or the amount/proof is
   wrong. Give a clear reason so the customer can correct and resubmit.
5. Check overdue submitted payments manually. They are intentionally not
   auto-expired; verify them if paid or decide whether to cancel the order.
6. Review awaiting-proof and rejected payments approaching expiry. The hourly
   job cancels eligible overdue orders and releases their inventory
   reservations; an admin can also manually cancel an awaiting-proof order.

## Refund procedure

The UPI provider does not send money. **Send the refund from the business UPI
app first, then click Refund in Medusa to record it.** Never record the refund
in Medusa before the transfer has been sent.

Record the refund transfer's UTR in the Medusa refund note using this format:

```text
UPI refund UTR: <12-digit-UTR>
```

The provider's `refundPayment` operation records a refund entry in Medusa only;
it does not initiate a bank or UPI transfer.

## Expiry rules

The hourly `expire-upi-payments` job runs only when `ENABLE_UPI_MANUAL=true` and
Medusa is in worker or shared mode. It cancels overdue `awaiting_proof` and
`rejected` orders through Medusa's cancel-order workflow, releasing inventory
reservations. `submitted` records are never automatically expired. An admin
must review those payments and verify or cancel the order manually.

Verification and expiry use a distributed lock per UPI payment and re-check
status before acting. A verified payment is not cancelled. A failed order
cancellation leaves the UPI payment record unchanged so that a later job run
can retry.

## Security notes

- The amount is always read from the Medusa order on the server; a client cannot
  set or change it.
- Proof tokens are signed with HMAC-SHA256 and bind the reference code to the
  order ID. Tokens are not placed in URLs.
- A UTR must contain exactly 12 digits and is unique across UPI payment records,
  preventing one transfer reference from backing multiple orders.
- Screenshot keys are restricted to the private
  `upi-proofs/<reference_code>/` R2 prefix. Upload URLs are presigned and
  short-lived; accepted uploads are limited to JPEG, PNG, or WebP images up to
  5 MB.
- Store routes validate proof ownership/token, enforce rate limits, cap proof
  submissions at five attempts, and use Turnstile and a honeypot.
- Never log proof tokens, full UTRs, customer email addresses, or notification
  links in production.

## Known limits

There is no automatic bank reconciliation or payment confirmation. The customer
can submit proof, but only an administrator who checks the business bank
statement or UPI app can confirm receipt. An order remains unpaid until that
manual verification succeeds. Refund transfers are also manual.

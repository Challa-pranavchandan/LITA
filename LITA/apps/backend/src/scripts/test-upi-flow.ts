import assert from "node:assert/strict"
import { UpiManualProviderService } from "../modules/upi-manual/service"
import {
  ensureUpiPaymentRecord,
  prepareUpiPaymentVerification,
  submitUpiProofRecord,
  type UpipaymentsQuery,
  type UpipaymentsService,
} from "../workflows/upi-payments"

type FixturePayment = {
  id: string
  reference_code: string
  order_id: string | null
  cart_id: string | null
  payment_session_id: string | null
  customer_id: string | null
  email: string
  amount: number
  currency_code: string
  status: "awaiting_proof" | "submitted" | "verified" | "rejected" | "expired"
  expires_at: Date
  attempts: number
  utr: string | null
  payer_vpa: string | null
  screenshot_key: string | null
  submitted_at: Date | null
  verified_at: Date | null
  verified_by: string | null
  rejected_at: Date | null
  reject_reason: string | null
}

async function runUpiFlowTest() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("The UPI flow test refuses to run in production.")
  }

  const order = {
    id: "order_upi_fixture",
    email: "upi-fixture@example.test",
    customer_id: "cus_upi_fixture",
    cart_id: "cart_upi_fixture",
    total: 1525,
    currency_code: "inr",
    payment_collections: [
      {
        payment_sessions: [
          {
            id: "payses_upi_fixture",
            provider_id: "pp_upimanual_upimanual",
          },
        ],
        payments: [
          {
            id: "pay_upi_fixture",
            provider_id: "pp_upimanual_upimanual",
          },
        ],
      },
    ],
  }
  const records: FixturePayment[] = []
  const query: UpipaymentsQuery = {
    graph: async () => ({ data: [order] }),
  }
  const paymentService = {
    listUpiPayments: async (filters) =>
      records.filter((payment) =>
        Object.entries(filters).every(
          ([key, value]) =>
            value === undefined ||
            payment[key as keyof FixturePayment] === value
        )
      ),
    createUpiPayments: async (input) => {
      const payment: FixturePayment = {
        ...input,
        id: "upi_fixture",
        utr: null,
        payer_vpa: null,
        screenshot_key: null,
        submitted_at: null,
        verified_at: null,
        verified_by: null,
        rejected_at: null,
        reject_reason: null,
      }
      records.push(payment)
      return payment
    },
    updateUpiPayments: async (input) => {
      const index = records.findIndex(({ id }) => id === input.id)
      assert.notEqual(index, -1, "Expected the fixture payment to exist")
      records[index] = { ...records[index], ...input }
      return records[index]
    },
    deleteUpiPayments: async (id) => {
      const index = records.findIndex((payment) => payment.id === id)
      if (index !== -1) records.splice(index, 1)
    },
  } satisfies UpipaymentsService

  const firstEnsure = await ensureUpiPaymentRecord(
    { order_id: order.id },
    query,
    paymentService
  )
  const secondEnsure = await ensureUpiPaymentRecord(
    { order_id: order.id },
    query,
    paymentService
  )
  assert.equal(firstEnsure.created, true)
  assert.equal(secondEnsure.created, false)
  assert.equal(records.length, 1)

  const referenceCode = firstEnsure.payment.reference_code
  assert.equal(typeof referenceCode, "string")
  const proof = await submitUpiProofRecord(
    {
      reference_code: String(referenceCode),
      utr: "123456789012",
    },
    paymentService
  )
  assert.equal(proof.payment.status, "submitted")

  const verificationInput = {
    id: String(firstEnsure.payment.id),
    admin_user_id: "user_upi_fixture",
    amount_confirmed: true,
  }
  const prepared = await prepareUpiPaymentVerification(
    verificationInput,
    query,
    paymentService
  )
  assert.equal(prepared.order_total, order.total)

  const provider = new UpiManualProviderService(
    {},
    {
      vpa: "payments@example.test",
      payee_name: "LITA Test",
      expiry_hours: 48,
    }
  )
  const captured = await provider.capturePayment({
    data: { verified: true, payment_id: "pay_upi_fixture" },
  })
  assert.ok(captured.data?.captured_at, "Expected a captured timestamp")
  await paymentService.updateUpiPayments({
    id: String(firstEnsure.payment.id),
    status: "verified",
    verified_at: new Date(),
    verified_by: verificationInput.admin_user_id,
  })

  const repeatedVerification = await prepareUpiPaymentVerification(
    verificationInput,
    query,
    paymentService
  )
  const finalEnsure = await ensureUpiPaymentRecord(
    { order_id: order.id },
    query,
    paymentService
  )
  assert.equal(repeatedVerification.already_verified, true)
  assert.equal(finalEnsure.created, false)
  assert.equal(finalEnsure.payment.status, "verified")
  assert.equal(records.length, 1)

  console.log(
    "UPI fixture flow passed: ensured idempotently, submitted proof, captured, and verified idempotently."
  )
}

runUpiFlowTest().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown failure"
  console.error(`UPI flow test failed: ${message}`)
  process.exitCode = 1
})

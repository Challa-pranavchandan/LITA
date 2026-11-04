import {
  ensureUpiPaymentRecord,
  submitUpiProofRecord,
  type UpipaymentsQuery,
  type UpipaymentsService,
} from "../upi-payments"

function makePayment(overrides: Record<string, unknown> = {}) {
  return {
    id: "upi_123",
    reference_code: "LITA-ABC234",
    order_id: "order_123",
    customer_id: "cus_123",
    cart_id: "cart_123",
    payment_session_id: "payses_123",
    email: "customer@example.com",
    amount: 1525,
    currency_code: "inr",
    status: "awaiting_proof",
    expires_at: new Date(Date.now() + 60 * 60 * 1000),
    attempts: 0,
    utr: null,
    screenshot_key: null,
    payer_vpa: null,
    submitted_at: null,
    rejected_at: null,
    reject_reason: null,
    ...overrides,
  }
}

function makeDependencies({
  existing = [],
  updateError,
}: {
  existing?: Array<Record<string, unknown>>
  updateError?: Error
} = {}) {
  const records = [...existing]
  const query: UpipaymentsQuery = {
    graph: jest.fn().mockResolvedValue({
      data: [
        {
          id: "order_123",
          email: "customer@example.com",
          customer_id: "cus_123",
          cart_id: "cart_123",
          total: 1525,
          currency_code: "inr",
          payment_collections: [
            {
              payment_sessions: [
                { id: "payses_123", provider_id: "pp_upimanual_upimanual" },
              ],
            },
          ],
        },
      ],
    }),
  }
  const service: UpipaymentsService = {
    listUpiPayments: jest.fn(async (filters) =>
      records.filter((record) =>
        Object.entries(filters).every(([key, value]) => record[key] === value)
      ) as never
    ),
    createUpiPayments: jest.fn(async (input) => {
      const created = makePayment({ ...input })
      records.push(created)
      return created as never
    }),
    updateUpiPayments: jest.fn(async (input) => {
      if (updateError) throw updateError
      const index = records.findIndex((record) => record.id === input.id)
      const updated = { ...records[index], ...input }
      records[index] = updated
      return updated as never
    }),
    deleteUpiPayments: jest.fn(),
  }

  return { query, records, service }
}

describe("UPI payment workflow operations", () => {
  it("ensures an order payment idempotently", async () => {
    const { query, records, service } = makeDependencies()

    const first = await ensureUpiPaymentRecord(
      { order_id: "order_123" },
      query,
      service
    )
    const second = await ensureUpiPaymentRecord(
      { order_id: "order_123" },
      query,
      service
    )

    expect(first.payment).toMatchObject({
      id: "upi_123",
      order_id: "order_123",
      amount: 1525,
      status: "awaiting_proof",
      currency_code: "inr",
    })
    expect(first.created).toBe(true)
    expect(second.created).toBe(false)
    expect(second.payment.id).toBe(first.payment.id)
    expect(records).toHaveLength(1)
    expect(service.createUpiPayments).toHaveBeenCalledTimes(1)
  })

  it("rejects orders without the UPI payment session", async () => {
    const { query, service } = makeDependencies()
    jest.mocked(query.graph).mockResolvedValueOnce({
      data: [
        {
          id: "order_123",
          total: 100,
          currency_code: "inr",
          payment_collections: [
            { payment_sessions: [{ id: "ps_1", provider_id: "pp_razorpay_razorpay" }] },
          ],
        },
      ],
    })

    await expect(
      ensureUpiPaymentRecord({ order_id: "order_123" }, query, service)
    ).rejects.toThrow("does not have a manual UPI payment session")
  })

  it.each([
    ["invalid UTR", { utr: "12345" }, "UTR must contain exactly 12 digits"],
    [
      "foreign screenshot key",
      { screenshot_key: "upi-proofs/other/proof.png" },
      "outside this payment's upload directory",
    ],
    ["missing proof fields", {}, "Submit a UTR or a payment screenshot"],
  ])("rejects %s", async (_label, input, message) => {
    const { service } = makeDependencies({ existing: [makePayment()] })

    await expect(
      submitUpiProofRecord(
        { reference_code: "LITA-ABC234", ...input },
        service
      )
    ).rejects.toThrow(message)
  })

  it.each([
    ["expired", makePayment({ expires_at: new Date(Date.now() - 1000) }), "has expired"],
    ["verified", makePayment({ status: "verified" }), "already been verified"],
    ["attempt limit", makePayment({ attempts: 5 }), "submission limit reached"],
  ])("refuses a %s payment", async (_label, payment, message) => {
    const { service } = makeDependencies({ existing: [payment] })

    await expect(
      submitUpiProofRecord(
        { reference_code: "LITA-ABC234", utr: "123456789012" },
        service
      )
    ).rejects.toThrow(message)
  })

  it("returns a conflict for a duplicate UTR", async () => {
    const duplicateError = Object.assign(new Error("unique violation on utr"), {
      code: "23505",
      constraint: "upi_payment_utr_unique",
    })
    const { service } = makeDependencies({
      existing: [makePayment()],
      updateError: duplicateError,
    })

    await expect(
      submitUpiProofRecord(
        { reference_code: "LITA-ABC234", utr: "123456789012" },
        service
      )
    ).rejects.toThrow("This UTR is already linked to another order")
  })

  it("increments attempts, updates status, and preserves proof fields", async () => {
    const { service } = makeDependencies({ existing: [makePayment()] })

    const result = await submitUpiProofRecord(
      {
        reference_code: "LITA-ABC234",
        utr: "123456789012",
        payer_vpa: " payer@example ",
      },
      service
    )

    expect(result.payment).toMatchObject({
      status: "submitted",
      attempts: 1,
      utr: "123456789012",
      payer_vpa: "payer@example",
    })
    expect(result.rollback).toMatchObject({
      id: "upi_123",
      status: "awaiting_proof",
      attempts: 0,
    })
  })
})

import {
  ensureUpiPaymentRecord,
  prepareUpiPaymentVerification,
  type UpipaymentsQuery,
  type UpipaymentsService,
} from "../upi-payments"

describe("UPI Commission Installment Payments & Verification", () => {
  it("uses the payment session installment amount for commissions rather than order total", async () => {
    const records: Array<Record<string, unknown>> = []
    const query: UpipaymentsQuery = {
      graph: jest.fn().mockResolvedValue({
        data: [
          {
            id: "order_com_123",
            email: "collector@example.com",
            customer_id: "cus_123",
            total: 10000, // full quoted price
            currency_code: "inr",
            metadata: { commission_id: "com_123" },
            payment_collections: [
              {
                id: "paycol_123",
                amount: 5000,
                payment_sessions: [
                  {
                    id: "payses_upi_1",
                    amount: 5000, // 50% deposit
                    provider_id: "pp_upimanual_upimanual",
                  },
                ],
              },
            ],
          },
        ],
      }),
    }

    const service: UpipaymentsService = {
      listUpiPayments: jest.fn().mockResolvedValue([]),
      createUpiPayments: jest.fn(async (input) => {
        const created = { id: "upi_com_1", ...input }
        records.push(created)
        return created as never
      }),
      updateUpiPayments: jest.fn(),
      deleteUpiPayments: jest.fn(),
    }

    const result = await ensureUpiPaymentRecord(
      { order_id: "order_com_123" },
      query,
      service
    )

    expect(result.created).toBe(true)
    expect(result.payment.amount).toBe(5000)
    expect(result.payment.order_id).toBe("order_com_123")
    expect(service.createUpiPayments).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 5000,
        payment_session_id: "payses_upi_1",
      })
    )
  })

  it("verifies and prepares capture for a commission installment where payment amount != order total", async () => {
    const payment = {
      id: "upi_com_1",
      reference_code: "LITA-COM123",
      order_id: "order_com_123",
      amount: 5000,
      currency_code: "inr",
      status: "submitted",
    }

    const query: UpipaymentsQuery = {
      graph: jest.fn().mockResolvedValue({
        data: [
          {
            id: "order_com_123",
            total: 10000, // full quoted price
            currency_code: "inr",
            metadata: { commission_id: "com_123" },
            payment_collections: [
              {
                payments: [
                  {
                    id: "pay_medusa_upi_1",
                    amount: 5000,
                    provider_id: "pp_upimanual_upimanual",
                  },
                ],
              },
            ],
          },
        ],
      }),
    }

    const service = {
      listUpiPayments: jest.fn().mockResolvedValue([payment]),
    } as unknown as UpipaymentsService

    const prepared = await prepareUpiPaymentVerification(
      { id: "upi_com_1", admin_user_id: "admin_123", amount_confirmed: true },
      query,
      service
    )

    expect(prepared.already_verified).toBe(false)
    expect(prepared.payment_id).toBe("pay_medusa_upi_1")
    expect(prepared.order_total).toBe(10000)
    expect(prepared.capture_amount).toBe(5000)
    expect(prepared.commission_id).toBe("com_123")
  })

  it("rejects non-commission orders when payment amount does not match order total", async () => {
    const payment = {
      id: "upi_std_1",
      reference_code: "LITA-STD123",
      order_id: "order_std_123",
      amount: 5000,
      currency_code: "inr",
      status: "submitted",
    }

    const query: UpipaymentsQuery = {
      graph: jest.fn().mockResolvedValue({
        data: [
          {
            id: "order_std_123",
            total: 10000,
            currency_code: "inr",
            // No commission_id in metadata
            payment_collections: [
              {
                payments: [
                  {
                    id: "pay_1",
                    amount: 5000,
                    provider_id: "pp_upimanual_upimanual",
                  },
                ],
              },
            ],
          },
        ],
      }),
    }

    const service = {
      listUpiPayments: jest.fn().mockResolvedValue([payment]),
    } as unknown as UpipaymentsService

    await expect(
      prepareUpiPaymentVerification(
        { id: "upi_std_1", admin_user_id: "admin_123", amount_confirmed: true },
        query,
        service
      )
    ).rejects.toThrow("UPI payment amount mismatch")
  })
})

import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { GET as listUpiPayments } from "../route"
import {
  prepareUpiPaymentVerification,
  rejectUpiPaymentRecord,
  type UpipaymentsQuery,
  type UpipaymentsService,
} from "../../../../workflows/upi-payments"
import { getPresignedDownloadUrl } from "../../../../lib/r2"

jest.mock("../../../../lib/r2", () => ({
  getPresignedDownloadUrl: jest.fn(),
}))

const signScreenshot = getPresignedDownloadUrl as jest.Mock

const basePayment = {
  id: "upi_123",
  reference_code: "LITA-ABC234",
  order_id: "order_123",
  cart_id: "cart_123",
  payment_session_id: "payses_123",
  customer_id: "cus_123",
  email: "customer@example.com",
  amount: 1250,
  currency_code: "inr",
  status: "submitted" as
    | "awaiting_proof"
    | "submitted"
    | "verified"
    | "rejected"
    | "expired",
  utr: "123456789012" as string | null,
  payer_vpa: "payer@example",
  screenshot_key: "upi-proofs/LITA-ABC234/proof.png" as string | null,
  submitted_at: new Date("2026-11-04T10:00:00.000Z"),
  verified_at: null,
  verified_by: null,
  rejected_at: null,
  reject_reason: null,
  expires_at: new Date("2026-11-06T10:00:00.000Z"),
  attempts: 1,
  created_at: new Date("2026-11-04T09:00:00.000Z"),
}

function createWorkflowDependencies(
  overrides: Partial<typeof basePayment> = {},
  orderOverrides: Record<string, unknown> = {}
) {
  const payment = { ...basePayment, ...overrides }
  const paymentService: UpipaymentsService = {
    listUpiPayments: jest.fn().mockResolvedValue([payment]),
    createUpiPayments: jest.fn(),
    updateUpiPayments: jest.fn(async (input) => ({ ...payment, ...input })),
    deleteUpiPayments: jest.fn(),
  }
  const query: UpipaymentsQuery = {
    graph: jest.fn().mockResolvedValue({
      data: [
        {
          id: "order_123",
          total: 1250,
          currency_code: "inr",
          payment_collections: [
            {
              payments: [
                { id: "pay_123", provider_id: "pp_upimanual_upimanual" },
              ],
            },
          ],
          ...orderOverrides,
        },
      ],
    }),
  }
  return { payment, paymentService, query }
}

function createResponse() {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
  }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  return res
}

describe("UPI admin verification operations", () => {
  it("requires explicit amount confirmation", async () => {
    const { paymentService, query } = createWorkflowDependencies()

    await expect(
      prepareUpiPaymentVerification(
        {
          id: basePayment.id,
          admin_user_id: "admin_123",
          amount_confirmed: false,
        },
        query,
        paymentService
      )
    ).rejects.toThrow("Confirm the amount")
    expect(paymentService.listUpiPayments).not.toHaveBeenCalled()
    expect(query.graph).not.toHaveBeenCalled()
  })

  it("refuses verification when the current order total differs", async () => {
    const { paymentService, query } = createWorkflowDependencies({}, { total: 1300 })

    await expect(
      prepareUpiPaymentVerification(
        {
          id: basePayment.id,
          admin_user_id: "admin_123",
          amount_confirmed: true,
        },
        query,
        paymentService
      )
    ).rejects.toThrow("UPI payment amount mismatch")
  })

  it("returns an already verified payment without loading or capturing its order", async () => {
    const { payment, paymentService, query } = createWorkflowDependencies({
      status: "verified",
    })

    const result = await prepareUpiPaymentVerification(
      {
        id: payment.id,
        admin_user_id: "admin_123",
        amount_confirmed: true,
      },
      query,
      paymentService
    )

    expect(result).toMatchObject({ payment, already_verified: true })
    expect(query.graph).not.toHaveBeenCalled()
  })

  it.each(["expired", "rejected"])(
    "refuses verification of a %s payment",
    async (status) => {
      const { payment, paymentService, query } =
        createWorkflowDependencies({ status } as Partial<typeof basePayment>)

      await expect(
        prepareUpiPaymentVerification(
          {
            id: payment.id,
            admin_user_id: "admin_123",
            amount_confirmed: true,
          },
          query,
          paymentService
        )
      ).rejects.toThrow(`in ${status} status`)
      expect(query.graph).not.toHaveBeenCalled()
    }
  )

  it("allows verification of an awaiting-proof payment with the matching order total", async () => {
    const { payment, paymentService, query } = createWorkflowDependencies({
      status: "awaiting_proof",
      utr: null,
      screenshot_key: null,
    })

    const result = await prepareUpiPaymentVerification(
      {
        id: payment.id,
        admin_user_id: "admin_123",
        amount_confirmed: true,
      },
      query,
      paymentService
    )

    expect(result).toMatchObject({
      payment_id: "pay_123",
      order_total: 1250,
      already_verified: false,
    })
  })

  it("requires a 3-300 character rejection reason", async () => {
    const { paymentService } = createWorkflowDependencies()
    await expect(
      rejectUpiPaymentRecord(
        { id: basePayment.id, reason: "  " },
        paymentService
      )
    ).rejects.toThrow("between 3 and 300 characters")
    await expect(
      rejectUpiPaymentRecord(
        { id: basePayment.id, reason: "x".repeat(301) },
        paymentService
      )
    ).rejects.toThrow("between 3 and 300 characters")
  })

  it("rejects proof and clears the UTR and screenshot key for resubmission", async () => {
    const { payment, paymentService } = createWorkflowDependencies()
    const result = await rejectUpiPaymentRecord(
      { id: payment.id, reason: "  UTR not found  " },
      paymentService
    )

    expect(paymentService.updateUpiPayments).toHaveBeenCalledWith(
      expect.objectContaining({
        id: payment.id,
        status: "rejected",
        reject_reason: "UTR not found",
        utr: null,
        screenshot_key: null,
      })
    )
    expect(result.rollback).toMatchObject({
      utr: payment.utr,
      screenshot_key: payment.screenshot_key,
      status: "submitted",
    })
  })
})

describe("UPI admin list route", () => {
  const originalFlag = process.env.ENABLE_UPI_MANUAL

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.ENABLE_UPI_MANUAL = "true"
    signScreenshot.mockResolvedValue("https://r2.example/presigned-get")
  })

  afterAll(() => {
    process.env.ENABLE_UPI_MANUAL = originalFlag
  })

  it("filters by status and text query and returns signed screenshot URLs and status counts", async () => {
    const records = [
      basePayment,
      {
        ...basePayment,
        id: "upi_456",
        reference_code: "LITA-XYZ789",
        status: "awaiting_proof",
        email: "other@example.com",
        utr: null,
        screenshot_key: null,
      },
    ]
    const service = {
      listAndCountUpiPayments: jest.fn(async (filters: { status?: string }) => {
        const matching = filters.status
          ? records.filter((payment) => payment.status === filters.status)
          : records
        return [matching, matching.length]
      }),
    }
    const query = {
      graph: jest.fn().mockResolvedValue({
        data: [
          {
            id: "order_123",
            display_id: 42,
            total: 1250,
            currency_code: "inr",
          },
        ],
      }),
    }
    const logger = { error: jest.fn() }
    const req = {
      query: { status: "submitted", q: "customer@example" },
      scope: {
        resolve: jest.fn((key: string) => {
          if (key === "upi_payment") return service
          if (key === ContainerRegistrationKeys.QUERY) return query
          return logger
        }),
      },
    }
    const res = createResponse()

    await listUpiPayments(req as never, res as never)

    const body = res.json.mock.calls[0][0]
    expect(res.status).toHaveBeenCalledWith(200)
    expect(body.payments).toHaveLength(1)
    expect(body.payments[0]).toMatchObject({
      order_display_id: 42,
      order_total: 1250,
      screenshot_url: "https://r2.example/presigned-get",
    })
    expect(body.counts).toMatchObject({
      awaiting_proof: 1,
      submitted: 1,
    })
    expect(signScreenshot).toHaveBeenCalledWith(
      basePayment.screenshot_key,
      600
    )
    expect(service.listAndCountUpiPayments).toHaveBeenCalledWith(
      {},
      { order: { created_at: "DESC" }, take: 10000 }
    )
  })

  it("returns 404 while the feature flag is disabled", async () => {
    process.env.ENABLE_UPI_MANUAL = "false"
    const res = createResponse()

    await listUpiPayments({} as never, res as never)

    expect(res.status).toHaveBeenCalledWith(404)
  })
})

import { asValue, createContainer } from "awilix"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import { UPI_PAYMENT_MODULE } from "../../modules/upi-payment"
import {
  expireUpiPaymentWorkflow,
  prepareUpiPaymentExpiration,
  verifyUpiPaymentWorkflow,
  type UpipaymentsService,
} from "../upi-payments"

jest.mock("@medusajs/medusa/core-flows", () => {
  const actual = jest.requireActual("@medusajs/medusa/core-flows")
  const { createStep, StepResponse } = jest.requireActual(
    "@medusajs/framework/workflows-sdk"
  )
  const mockCancelOrder = jest.fn()
  const cancelOrderStep = createStep(
    "mock-cancel-upi-order",
    async (input: { order_id: string }) => {
      await mockCancelOrder(input)
      return new StepResponse({ order_id: input.order_id })
    }
  )

  return {
    ...actual,
    cancelOrderWorkflow: {
      runAsStep: ({ input }: { input: unknown }) => cancelOrderStep(input),
    },
    __mockCancelOrder: mockCancelOrder,
  }
})

const mockCancelOrder = jest.requireMock("@medusajs/medusa/core-flows")
  .__mockCancelOrder as jest.Mock

function makePayment(
  status: "awaiting_proof" | "submitted" | "verified" | "rejected" | "expired"
) {
  return {
    id: "upi_123",
    reference_code: "LITA-ABC234",
    order_id: "order_123",
    cart_id: "cart_123",
    payment_session_id: "payses_123",
    customer_id: "cus_123",
    email: "customer@example.com",
    amount: 1250,
    currency_code: "inr",
    status,
    utr: null,
    payer_vpa: null,
    screenshot_key: null,
    submitted_at: null,
    rejected_at: null,
    reject_reason: null,
    expires_at: new Date(Date.now() - 60_000),
    attempts: 0,
  }
}

function makeWorkflowContainer(
  status: "awaiting_proof" | "submitted" | "verified" | "rejected" | "expired"
) {
  const records: Array<Record<string, unknown>> = [makePayment(status)]
  const paymentService = {
    listUpiPayments: jest.fn(async () => records),
    createUpiPayments: jest.fn(),
    updateUpiPayments: jest.fn(async (input) => {
      const updated = { ...records[0], ...input }
      records[0] = updated
      return updated
    }),
    deleteUpiPayments: jest.fn(),
  } as unknown as UpipaymentsService
  const locking = {
    acquire: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(true),
  }
  const eventBus = {
    emit: jest.fn().mockResolvedValue(undefined),
    releaseGroupedEvents: jest.fn().mockResolvedValue(undefined),
    clearGroupedEvents: jest.fn().mockResolvedValue(undefined),
  }
  const query = { graph: jest.fn() }
  const container = createContainer()
  container.register({
    [UPI_PAYMENT_MODULE]: asValue(paymentService),
    [Modules.LOCKING]: asValue(locking),
    [Modules.EVENT_BUS]: asValue(eventBus),
    [ContainerRegistrationKeys.QUERY]: asValue(query),
  })

  return { container, eventBus, locking, paymentService, records }
}

describe("UPI payment expiration workflow", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it.each(["submitted", "verified", "expired"] as const)(
    "does not expire a %s payment",
    async (status) => {
      const payment = makePayment(status)
      const paymentService = {
        listUpiPayments: jest.fn().mockResolvedValue([payment]),
      } as unknown as UpipaymentsService

      const prepared = await prepareUpiPaymentExpiration(
        { id: payment.id },
        paymentService
      )

      expect(prepared.should_expire).toBe(false)
      expect(prepared.payment.status).toBe(status)
    }
  )

  it("expires only overdue awaiting-proof and rejected records", async () => {
    const awaiting = makePayment("awaiting_proof")
    const rejected = makePayment("rejected")
    const notDue = {
      ...awaiting,
      expires_at: new Date(Date.now() + 60_000),
    }
    const records = new Map([
      [awaiting.id, awaiting],
      ["upi_rejected", { ...rejected, id: "upi_rejected" }],
      ["upi_not_due", { ...notDue, id: "upi_not_due" }],
    ])
    const service = {
      listUpiPayments: jest.fn(async ({ id }: { id: string }) => [
        records.get(id),
      ]),
    } as unknown as UpipaymentsService

    await expect(
      prepareUpiPaymentExpiration({ id: awaiting.id }, service)
    ).resolves.toMatchObject({ should_expire: true, order_id: "order_123" })
    await expect(
      prepareUpiPaymentExpiration({ id: "upi_rejected" }, service)
    ).resolves.toMatchObject({ should_expire: true })
    await expect(
      prepareUpiPaymentExpiration({ id: "upi_not_due" }, service)
    ).resolves.toMatchObject({ should_expire: false })
  })

  it("cancels the order once, marks expired, emits the event, and no-ops on retry", async () => {
    const { container, eventBus, locking, paymentService, records } =
      makeWorkflowContainer("awaiting_proof")

    const first = await expireUpiPaymentWorkflow(container as never).run({
      input: { id: "upi_123" },
    })
    const second = await expireUpiPaymentWorkflow(container as never).run({
      input: { id: "upi_123" },
    })

    expect(first.result).toMatchObject({ status: "expired" })
    expect(second.result).toMatchObject({ status: "expired" })
    expect(records[0].status).toBe("expired")
    expect(mockCancelOrder).toHaveBeenCalledTimes(1)
    expect(mockCancelOrder).toHaveBeenCalledWith({
      order_id: "order_123",
      no_notification: true,
    })
    expect(paymentService.updateUpiPayments).toHaveBeenCalledTimes(1)
    expect(eventBus.emit).toHaveBeenCalledWith({
      name: "upi_payment.status_changed",
      data: { id: "upi_123", status: "expired" },
    })
    expect(locking.acquire).toHaveBeenCalledWith(
      "upi_payment:upi_123",
      expect.objectContaining({ ownerId: expect.any(String) })
    )
    expect(locking.release).toHaveBeenCalledTimes(2)
    expect(locking.release).toHaveBeenNthCalledWith(
      1,
      "upi_payment:upi_123",
      expect.objectContaining({ ownerId: expect.any(String) })
    )
  })

  it("leaves a verified payment untouched when expiry runs after verification", async () => {
    const { container, locking, paymentService, records } =
      makeWorkflowContainer("verified")

    const result = await expireUpiPaymentWorkflow(container as never).run({
      input: { id: "upi_123" },
    })

    expect(result.result.status).toBe("verified")
    expect(records[0].status).toBe("verified")
    expect(mockCancelOrder).not.toHaveBeenCalled()
    expect(paymentService.updateUpiPayments).not.toHaveBeenCalled()
    expect(locking.acquire).toHaveBeenCalledWith(
      "upi_payment:upi_123",
      expect.objectContaining({ ownerId: expect.any(String) })
    )
  })

  it("serializes verify-then-expire and keeps the verified order", async () => {
    const { container, locking, records } = makeWorkflowContainer("verified")

    await verifyUpiPaymentWorkflow(container as never).run({
      input: {
        id: "upi_123",
        admin_user_id: "admin_123",
        amount_confirmed: true,
      },
    })
    await expireUpiPaymentWorkflow(container as never).run({
      input: { id: "upi_123" },
    })

    expect(records[0].status).toBe("verified")
    expect(mockCancelOrder).not.toHaveBeenCalled()
    expect(locking.acquire).toHaveBeenCalledTimes(2)
    expect(locking.acquire).toHaveBeenNthCalledWith(
      1,
      "upi_payment:upi_123",
      expect.objectContaining({ ownerId: expect.any(String) })
    )
    expect(locking.acquire).toHaveBeenNthCalledWith(
      2,
      "upi_payment:upi_123",
      expect.objectContaining({ ownerId: expect.any(String) })
    )
  })

  it("keeps the payment record unchanged when order cancellation fails", async () => {
    mockCancelOrder.mockRejectedValueOnce(new Error("cancel failed"))
    const { container, locking, paymentService, records } =
      makeWorkflowContainer("awaiting_proof")

    let caughtError: unknown
    try {
      await expireUpiPaymentWorkflow(container as never).run({
        input: { id: "upi_123" },
      })
    } catch (error) {
      caughtError = error
    }

    expect(caughtError).toMatchObject({ message: "cancel failed" })
    expect(records[0].status).toBe("awaiting_proof")
    expect(paymentService.updateUpiPayments).not.toHaveBeenCalled()
    expect(locking.release).toHaveBeenCalledTimes(1)
  })

  it("allows manual cancellation only for awaiting-proof payments", async () => {
    const awaiting = makePayment("awaiting_proof")
    const service = {
      listUpiPayments: jest.fn().mockResolvedValue([awaiting]),
    } as unknown as UpipaymentsService

    await expect(
      prepareUpiPaymentExpiration(
        { id: awaiting.id, force: true },
        service
      )
    ).resolves.toMatchObject({ should_expire: true })
    await expect(
      prepareUpiPaymentExpiration(
        { id: awaiting.id, force: true },
        {
          listUpiPayments: jest
            .fn()
            .mockResolvedValue([makePayment("rejected")]),
        } as unknown as UpipaymentsService
      )
    ).resolves.toMatchObject({ should_expire: false })
  })
})

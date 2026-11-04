import expireUpiPaymentsJob, { config } from "../expire-upi-payments"
import { UPI_PAYMENT_MODULE } from "../../modules/upi-payment"
import { expireUpiPaymentWorkflow } from "../../workflows/upi-payments"

jest.mock("../../workflows/upi-payments", () => ({
  expireUpiPaymentWorkflow: jest.fn(() => ({
    run: jest.fn().mockResolvedValue({ result: {} }),
  })),
}))

describe("expire-upi-payments scheduled job", () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {
      ...originalEnv,
      ENABLE_UPI_MANUAL: "true",
      MEDUSA_WORKER_MODE: "worker",
      UPI_ORDER_EXPIRY_HOURS: "48",
    }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it("is hourly and skips execution when disabled or running in server mode", async () => {
    expect(config.schedule).toBe("0 * * * *")
    const container = { resolve: jest.fn() }

    process.env.ENABLE_UPI_MANUAL = "false"
    await expireUpiPaymentsJob(container as never)
    process.env.ENABLE_UPI_MANUAL = "true"
    process.env.MEDUSA_WORKER_MODE = "server"
    await expireUpiPaymentsJob(container as never)

    expect(container.resolve).not.toHaveBeenCalled()
  })

  it("selects only overdue awaiting-proof and rejected records, never submitted", async () => {
    const now = Date.now()
    const recordsByStatus = new Map([
      [
        "awaiting_proof",
        [
          { id: "upi_due", expires_at: new Date(now - 1000) },
          { id: "upi_future", expires_at: new Date(now + 60_000) },
        ],
      ],
      ["rejected", [{ id: "upi_rejected_due", expires_at: new Date(now - 1000) }]],
    ])
    const service = {
      listAndCountUpiPayments: jest.fn(async ({ status }: { status: string }) => [
        recordsByStatus.get(status) ?? [],
        0,
      ]),
    }
    const logger = { error: jest.fn() }
    const container = {
      resolve: jest.fn((key: string) => {
        if (key === UPI_PAYMENT_MODULE) return service
        if (key === "logger") return logger
        throw new Error(`Unexpected dependency: ${key}`)
      }),
    }

    await expireUpiPaymentsJob(container as never)

    expect(service.listAndCountUpiPayments.mock.calls.map(([filter]) => filter.status)).toEqual([
      "awaiting_proof",
      "rejected",
    ])
    expect(expireUpiPaymentWorkflow).toHaveBeenCalledTimes(2)
    expect(expireUpiPaymentWorkflow).toHaveBeenNthCalledWith(
      1,
      container
    )
    expect(
      jest.mocked(expireUpiPaymentWorkflow).mock.results.map(
        (result) => result.value.run.mock.calls[0][0].input.id
      )
    ).toEqual(["upi_due", "upi_rejected_due"])
  })

  it("logs an individual failure and continues with subsequent payments", async () => {
    const now = Date.now()
    const service = {
      listAndCountUpiPayments: jest
        .fn()
        .mockResolvedValueOnce([
          [
            { id: "upi_failed", expires_at: new Date(now - 1000) },
            { id: "upi_next", expires_at: new Date(now - 1000) },
          ],
          2,
        ])
        .mockResolvedValueOnce([[], 0]),
    }
    const logger = { error: jest.fn() }
    const workflow = jest
      .mocked(expireUpiPaymentWorkflow)
      .mockImplementationOnce(
        () =>
          ({
            run: jest.fn().mockRejectedValue(new Error("cancel failed")),
          }) as never
      )
    const container = {
      resolve: jest.fn((key: string) =>
        key === UPI_PAYMENT_MODULE ? service : logger
      ),
    }

    await expireUpiPaymentsJob(container as never)

    expect(logger.error).toHaveBeenCalledWith(
      "[expire-upi-payments] Failed to expire payment upi_failed"
    )
    expect(workflow).toHaveBeenCalledTimes(2)
  })
})

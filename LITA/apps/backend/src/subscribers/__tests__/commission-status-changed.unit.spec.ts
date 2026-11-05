import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import commissionStatusChangedHandler from "../commission-status-changed"

function makeContainer(notificationError?: Error) {
  const logger = {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  }
  const notificationService = {
    createNotifications: notificationError
      ? jest.fn().mockRejectedValue(notificationError)
      : jest.fn().mockResolvedValue({ id: "notification_1" }),
  }
  const customerService = {
    retrieveCustomer: jest.fn().mockResolvedValue({
      id: "cus_1",
      email: "customer@example.test",
      first_name: "Customer",
    }),
  }
  const container = {
    resolve: jest.fn((key: string) => {
      if (key === ContainerRegistrationKeys.LOGGER) return logger
      if (key === Modules.CUSTOMER) return customerService
      if (key === Modules.NOTIFICATION) return notificationService
      throw new Error(`Unexpected dependency ${key}`)
    }),
  } as any
  return { container, logger, notificationService }
}

describe("commission status notification subscriber", () => {
  it.each([
    "new",
    "in_discussion",
    "quoted",
    "accepted",
    "awaiting_payment",
    "in_production",
    "awaiting_final_payment",
    "paid",
    "converted",
    "rejected",
    "cancelled",
  ])("sends notification for the %s status", async (status) => {
    const { container, notificationService } = makeContainer()

    await commissionStatusChangedHandler({
      event: {
        name: "commission.status_changed",
        data: {
          id: "com_1",
          customer_id: "cus_1",
          title: "Portrait",
          status,
        },
      },
      container,
      pluginOptions: {},
    })

    expect(notificationService.createNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "customer@example.test",
        template: `commission-${status}`,
      })
    )
  })

  it("logs notification failure without throwing", async () => {
    const { container, logger } = makeContainer(new Error("mailer unavailable"))

    await expect(
      commissionStatusChangedHandler({
        event: {
          name: "commission.status_changed",
          data: {
            id: "com_1",
            customer_id: "cus_1",
            title: "Portrait",
            status: "quoted",
          },
        },
        container,
        pluginOptions: {},
      })
    ).resolves.toBeUndefined()
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("mailer unavailable")
    )
  })
})

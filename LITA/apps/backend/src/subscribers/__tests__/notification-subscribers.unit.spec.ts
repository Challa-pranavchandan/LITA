import orderPlacedHandler from "../order-placed"
import orderFulfillmentCreatedHandler from "../order-fulfillment-created"
import tradeApplicationStatusChangedHandler from "../trade-application-status-changed"
import commissionStatusChangedHandler from "../commission-status-changed"
import passwordResetHandler from "../password-reset"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

describe("Transactional Email Notification Subscribers", () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe("orderPlacedHandler", () => {
    it("retrieves order details and dispatches order-placed notification", async () => {
      const mockLogger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      }
      const mockNotificationService = {
        createNotifications: jest.fn().mockResolvedValue({ id: "notif_123" }),
      }
      const mockQuery = {
        graph: jest.fn().mockResolvedValue({
          data: [
            {
              id: "order_abc",
              display_id: 101,
              email: "buyer@example.com",
              total: 25000,
              subtotal: 25000,
              currency_code: "inr",
              items: [{ title: "Serene Meadow", quantity: 1, unit_price: 25000 }],
              shipping_address: {
                first_name: "Karan",
                last_name: "Mehta",
                city: "Delhi",
              },
            },
          ],
        }),
      }

      const container = {
        resolve: jest.fn((key) => {
          if (key === ContainerRegistrationKeys.LOGGER) return mockLogger
          if (key === ContainerRegistrationKeys.QUERY) return mockQuery
          if (key === Modules.NOTIFICATION) return mockNotificationService
          return null
        }),
      } as any

      await orderPlacedHandler({
        event: { name: "order.placed", data: { id: "order_abc" } },
        container,
        pluginOptions: {},
      })

      expect(mockNotificationService.createNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "buyer@example.com",
          channel: "email",
          template: "order-placed",
          content: expect.objectContaining({
            subject: expect.stringContaining("Order Confirmed: #101"),
          }),
        })
      )
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("Dispatched order confirmation email for order #101")
      )
    })
  })

  describe("orderFulfillmentCreatedHandler", () => {
    it("skips dispatch if no_notification is true", async () => {
      const mockLogger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      }
      const mockNotificationService = {
        createNotifications: jest.fn(),
      }

      const container = {
        resolve: jest.fn((key) => {
          if (key === ContainerRegistrationKeys.LOGGER) return mockLogger
          if (key === Modules.NOTIFICATION) return mockNotificationService
          return null
        }),
      } as any

      await orderFulfillmentCreatedHandler({
        event: {
          name: "order.fulfillment_created",
          data: { order_id: "order_abc", no_notification: true },
        },
        container,
        pluginOptions: {},
      })

      expect(mockNotificationService.createNotifications).not.toHaveBeenCalled()
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining("no_notification is true")
      )
    })

    it("dispatches shipment notification with tracking details", async () => {
      const mockLogger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      }
      const mockNotificationService = {
        createNotifications: jest.fn().mockResolvedValue({ id: "notif_ship_123" }),
      }
      const mockQuery = {
        graph: jest.fn().mockImplementation(({ entity }) => {
          if (entity === "order") {
            return Promise.resolve({
              data: [
                {
                  id: "order_abc",
                  display_id: 101,
                  email: "buyer@example.com",
                  items: [{ title: "Serene Meadow", quantity: 1 }],
                },
              ],
            })
          }
          if (entity === "fulfillment") {
            return Promise.resolve({
              data: [
                {
                  id: "ful_xyz",
                  provider_id: "Blue Dart",
                  tracking_numbers: ["TRACK-12345"],
                  tracking_links: ["https://track.example.com/TRACK-12345"],
                },
              ],
            })
          }
          return Promise.resolve({ data: [] })
        }),
      }

      const container = {
        resolve: jest.fn((key) => {
          if (key === ContainerRegistrationKeys.LOGGER) return mockLogger
          if (key === ContainerRegistrationKeys.QUERY) return mockQuery
          if (key === Modules.NOTIFICATION) return mockNotificationService
          return null
        }),
      } as any

      await orderFulfillmentCreatedHandler({
        event: {
          name: "order.fulfillment_created",
          data: { order_id: "order_abc", fulfillment_id: "ful_xyz" },
        },
        container,
        pluginOptions: {},
      })

      expect(mockNotificationService.createNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "buyer@example.com",
          channel: "email",
          template: "order-shipped",
          data: expect.objectContaining({
            trackingNumbers: ["TRACK-12345"],
            carrier: "Blue Dart",
          }),
        })
      )
    })
  })

  describe("tradeApplicationStatusChangedHandler", () => {
    it("dispatches approval email to trade applicant", async () => {
      const mockLogger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      }
      const mockNotificationService = {
        createNotifications: jest.fn().mockResolvedValue({ id: "notif_trade_123" }),
      }

      const container = {
        resolve: jest.fn((key) => {
          if (key === ContainerRegistrationKeys.LOGGER) return mockLogger
          if (key === Modules.NOTIFICATION) return mockNotificationService
          return null
        }),
      } as any

      await tradeApplicationStatusChangedHandler({
        event: {
          name: "trade_application.status_changed",
          data: {
            id: "trade_1",
            name: "Ananya Roy",
            email: "ananya@interiors.com",
            company: "Roy Interiors",
            status: "approved",
          },
        },
        container,
        pluginOptions: {},
      })

      expect(mockNotificationService.createNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "ananya@interiors.com",
          channel: "email",
          template: "trade-approved",
          content: expect.objectContaining({
            subject: expect.stringContaining("Welcome to the LITA Trade Program"),
          }),
        })
      )
    })
  })

  describe("commissionStatusChangedHandler", () => {
    it("dispatches quote ready notification to customer", async () => {
      const mockLogger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      }
      const mockNotificationService = {
        createNotifications: jest.fn().mockResolvedValue({ id: "notif_com_123" }),
      }
      const mockCustomerService = {
        retrieveCustomer: jest.fn().mockResolvedValue({
          id: "cust_123",
          email: "collector@example.com",
          first_name: "Vikram",
        }),
      }

      const container = {
        resolve: jest.fn((key) => {
          if (key === ContainerRegistrationKeys.LOGGER) return mockLogger
          if (key === Modules.CUSTOMER) return mockCustomerService
          if (key === Modules.NOTIFICATION) return mockNotificationService
          return null
        }),
      } as any

      await commissionStatusChangedHandler({
        event: {
          name: "commission.status_changed",
          data: {
            id: "comm_1",
            customer_id: "cust_123",
            title: "Serenade in Blue",
            status: "quoted",
            quoted_price: 75000,
            currency_code: "inr",
          },
        },
        container,
        pluginOptions: {},
      })

      expect(mockNotificationService.createNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "collector@example.com",
          channel: "email",
          template: "commission-quoted",
          content: expect.objectContaining({
            subject: expect.stringContaining("Quote Ready: \"Serenade in Blue\""),
          }),
        })
      )
    })
  })

  describe("passwordResetHandler security", () => {
    it("does not log reset links in production when RESEND_API_KEY is not configured", async () => {
      process.env.NODE_ENV = "production"
      delete process.env.RESEND_API_KEY

      const mockLogger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      }

      const container = {
        resolve: jest.fn((key) => {
          if (key === ContainerRegistrationKeys.LOGGER) return mockLogger
          return null
        }),
      } as any

      await passwordResetHandler({
        event: {
          name: "auth.password_reset",
          data: {
            entity_id: "sensitive_user@example.com",
            actor_type: "customer",
            token: "TOP_SECRET_RESET_TOKEN_NEVER_LOG",
          },
        },
        container,
        pluginOptions: {},
      })

      // Verify no warning with reset link was called
      expect(mockLogger.warn).not.toHaveBeenCalled()

      // Verify error log does NOT contain the token or reset URL
      expect(mockLogger.error).toHaveBeenCalled()
      const errorLog = mockLogger.error.mock.calls.map((c: any) => c.join(" ")).join(" ")
      expect(errorLog).not.toContain("TOP_SECRET_RESET_TOKEN_NEVER_LOG")
      expect(errorLog).not.toContain("/account/reset-password?token=")
      expect(errorLog).toContain("RESEND_API_KEY is not configured in production")
    })
  })
})

import { ResendNotificationProviderService } from "../service"
import {
  orderPlacedTemplate,
  orderFulfillmentTemplate,
  tradeApplicationStatusTemplate,
  commissionStatusTemplate,
  passwordResetTemplate,
} from "../emails/templates"

describe("Resend Notification Provider & Editorial Templates", () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe("Editorial Templates", () => {
    it("renders orderPlacedTemplate with brand styling and items table", () => {
      const { subject, html } = orderPlacedTemplate({
        orderId: "order_123456",
        displayId: 42,
        customerName: "Radha Sharma",
        customerEmail: "radha@example.com",
        items: [
          {
            title: "Ephemeral Horizons Oil on Canvas",
            quantity: 1,
            unitPrice: 45000,
          },
        ],
        subtotal: 45000,
        shippingTotal: 0,
        total: 45000,
        currencyCode: "inr",
        shippingAddress: {
          firstName: "Radha",
          lastName: "Sharma",
          address1: "12 Marine Drive",
          city: "Mumbai",
          province: "Maharashtra",
          postalCode: "400020",
          countryCode: "in",
        },
        storefrontUrl: "https://livinintheart.com",
      })

      expect(subject).toContain("Order Confirmed: #42 — Livin In The Art")
      expect(html).toContain("Livin In The Art")
      expect(html).toContain("Ephemeral Horizons Oil on Canvas")
      expect(html).toContain("45,000")
      expect(html).toContain("12 Marine Drive")
      expect(html).toContain("Complimentary")
      expect(html).toContain("#5f2f3c")
    })

    it("renders orderFulfillmentTemplate with tracking information", () => {
      const { subject, html } = orderFulfillmentTemplate({
        orderId: "order_123456",
        displayId: 42,
        customerName: "Radha Sharma",
        fulfillmentId: "ful_789",
        trackingNumbers: ["BLUEDART-889900"],
        carrier: "Blue Dart Express",
        items: [{ title: "Ephemeral Horizons Oil on Canvas", quantity: 1 }],
        storefrontUrl: "https://livinintheart.com",
      })

      expect(subject).toContain("Your Artwork has Shipped (#42)")
      expect(html).toContain("BLUEDART-889900")
      expect(html).toContain("Blue Dart Express")
      expect(html).toContain("Ephemeral Horizons Oil on Canvas")
    })

    it("renders tradeApplicationStatusTemplate for approved and rejected", () => {
      const approved = tradeApplicationStatusTemplate({
        name: "Arjun Verma",
        company: "Studio V Design",
        status: "approved",
        storefrontUrl: "https://livinintheart.com",
      })

      expect(approved.subject).toContain("Application Approved")
      expect(approved.html).toContain("Studio V Design")
      expect(approved.html).toContain("Your Trade Privileges")

      const rejected = tradeApplicationStatusTemplate({
        name: "Arjun Verma",
        company: "Studio V Design",
        status: "rejected",
        storefrontUrl: "https://livinintheart.com",
      })

      expect(rejected.subject).toContain("Update regarding your LITA Trade Application")
      expect(rejected.html).toContain("unable to approve trade privileges at this time")
    })

    it("renders commissionStatusTemplate for quote and acceptance", () => {
      const quoted = commissionStatusTemplate({
        title: "Sunset over Varanasi",
        customerName: "Dev Patel",
        status: "quoted",
        quotedPrice: 65000,
        currencyCode: "inr",
        adminNotes: "Includes bespoke teakwood frame and varnishing.",
        storefrontUrl: "https://livinintheart.com",
      })

      expect(quoted.subject).toContain("Quote Ready: \"Sunset over Varanasi\"")
      expect(quoted.html).toContain("65,000")
      expect(quoted.html).toContain("Includes bespoke teakwood frame")

      const accepted = commissionStatusTemplate({
        title: "Sunset over Varanasi",
        customerName: "Dev Patel",
        status: "accepted",
        storefrontUrl: "https://livinintheart.com",
      })

      expect(accepted.subject).toContain("Commission Accepted")
      expect(accepted.html).toContain("Thank you for accepting the quote")
    })

    it("renders passwordResetTemplate with editorial branding", () => {
      const reset = passwordResetTemplate({
        email: "customer@example.com",
        resetUrl: "https://livinintheart.com/account/reset-password?token=sample_token_123",
      })

      expect(reset.subject).toContain("Reset your LITA password")
      expect(reset.html).toContain("customer@example.com")
      expect(reset.html).toContain("https://livinintheart.com/account/reset-password?token=sample_token_123")
      expect(reset.html).toContain("Livin In The Art")
    })
  })

  describe("ResendNotificationProviderService", () => {
    const mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as any

    beforeEach(() => {
      jest.clearAllMocks()
    })

    it("simulates email delivery in development when RESEND_API_KEY is unset", async () => {
      process.env.NODE_ENV = "development"
      delete process.env.RESEND_API_KEY

      const service = new ResendNotificationProviderService(
        { logger: mockLogger },
        { channels: ["email"] }
      )

      const res = await service.send({
        to: "client@example.com",
        channel: "email",
        template: "order-placed",
        data: {
          orderId: "order_test",
          customerEmail: "client@example.com",
          items: [],
          total: 1000,
          currencyCode: "inr",
          storefrontUrl: "http://localhost:8000",
        },
      })

      expect(res).toEqual({ id: "mock_resend_delivery" })
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("[DEV MOCK] Simulated email to 'client@example.com'")
      )
    })

    it("blocks logging and throws error in production when RESEND_API_KEY is missing", async () => {
      process.env.NODE_ENV = "production"
      delete process.env.RESEND_API_KEY

      const service = new ResendNotificationProviderService(
        { logger: mockLogger },
        { channels: ["email"] }
      )

      await expect(
        service.send({
          to: "sensitive_user@example.com",
          channel: "email",
          template: "password-reset",
          data: {
            email: "sensitive_user@example.com",
            resetUrl: "https://secret-link.com/reset?token=SECRET_TOKEN",
          },
        })
      ).rejects.toThrow("RESEND_API_KEY is not configured in production")

      // Verify no sensitive tokens or URLs are logged
      const errorCalls = mockLogger.error.mock.calls.map((c: any) => c.join(" ")).join(" ")
      expect(errorCalls).not.toContain("SECRET_TOKEN")
      expect(errorCalls).not.toContain("https://secret-link.com")
    })

    it("sends payload to Resend REST API when RESEND_API_KEY is present", async () => {
      process.env.RESEND_API_KEY = "re_test_key_12345"

      const service = new ResendNotificationProviderService(
        { logger: mockLogger },
        { api_key: "re_test_key_12345", from: "LITA <orders@livinintheart.com>" }
      )

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: "msg_resend_abc123" }),
      })
      global.fetch = mockFetch as any

      const res = await service.send({
        to: "patron@example.com",
        channel: "email",
        content: {
          subject: "Exclusive Preview",
          html: "<p>New curated collection</p>",
        },
      })

      expect(res).toEqual({ id: "msg_resend_abc123" })
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.resend.com/emails",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer re_test_key_12345",
          }),
        })
      )
      const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(sentBody.to).toEqual(["patron@example.com"])
      expect(sentBody.from).toBe("LITA <orders@livinintheart.com>")
      expect(sentBody.subject).toBe("Exclusive Preview")
    })
  })
})

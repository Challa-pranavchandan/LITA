import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import upiPaymentStatusChangedHandler from "../upi-payment-status-changed"
import {
  upiPaymentInstructionsTemplate,
  upiPaymentRejectedTemplate,
} from "../../modules/resend/emails/templates"
import { UPI_PAYMENT_MODULE } from "../../modules/upi-payment"

const originalEnv = process.env

function createSubscriberContext(
  status: "awaiting_proof" | "submitted" | "verified" | "rejected" | "expired",
  overrides: Record<string, unknown> = {}
) {
  const payment = {
    id: "upi_123",
    reference_code: "LITA-ABC234",
    order_id: "order_123",
    email: "buyer@example.com",
    amount: 1250,
    currency_code: "inr",
    status,
    utr: "123456789012",
    reject_reason: "UTR not found",
    expires_at: "2026-11-06T10:00:00.000Z",
    ...overrides,
  }
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }
  const paymentService = {
    listUpiPayments: jest.fn().mockResolvedValue([payment]),
  }
  const query = {
    graph: jest.fn().mockResolvedValue({
      data: [{ id: "order_123", display_id: 42 }],
    }),
  }
  const notificationService = {
    createNotifications: jest.fn().mockResolvedValue({ id: "notif_123" }),
  }
  const container = {
    resolve: jest.fn((key: string) => {
      if (key === ContainerRegistrationKeys.LOGGER) return logger
      if (key === UPI_PAYMENT_MODULE) return paymentService
      if (key === ContainerRegistrationKeys.QUERY) return query
      if (key === Modules.NOTIFICATION) return notificationService
      throw new Error(`Unexpected dependency: ${key}`)
    }),
  }
  return { container, logger, notificationService, paymentService, query }
}

describe("UPI payment status notifications", () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      ENABLE_UPI_MANUAL: "true",
      STOREFRONT_URL: "https://shop.example",
      UPI_VPA: "studio@example",
      UPI_PAYEE_NAME: "LITA Studio",
      STUDIO_EMAIL: "studio@example.com",
      MEDUSA_ADMIN_URL: "https://admin.example",
    }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it.each([
    ["awaiting_proof", "upi-payment-instructions", "buyer@example.com"],
    ["submitted", "upi-proof-received-studio", "studio@example.com"],
    ["verified", "upi-payment-verified", "buyer@example.com"],
    ["rejected", "upi-payment-rejected", "buyer@example.com"],
    ["expired", "upi-payment-expired", "buyer@example.com"],
  ] as const)(
    "sends the %s email using the expected template and recipient",
    async (status, template, recipient) => {
      const { container, notificationService } = createSubscriberContext(status)

      await upiPaymentStatusChangedHandler({
        event: { name: "upi_payment.status_changed", data: { id: "upi_123", status } },
        container: container as never,
        pluginOptions: {},
      })

      expect(notificationService.createNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          to: recipient,
          channel: "email",
          template,
          content: expect.objectContaining({
            html: expect.stringContaining("LITA-ABC234"),
          }),
        })
      )
    }
  )

  it("sends only the last four UTR digits to the studio", async () => {
    const { container, notificationService } = createSubscriberContext("submitted")

    await upiPaymentStatusChangedHandler({
      event: {
        name: "upi_payment.status_changed",
        data: { id: "upi_123", status: "submitted" },
      },
      container: container as never,
      pluginOptions: {},
    })

    const email = notificationService.createNotifications.mock.calls[0][0]
    expect(email.to).toBe("studio@example.com")
    expect(email.content.html).toContain("9012")
    expect(email.content.html).not.toContain("123456789012")
    expect(email.content.html).toContain("https://admin.example/app/upi-payments")
  })

  it("keeps UTRs, rejection text, and links out of subscriber logs", async () => {
    const { container, logger } = createSubscriberContext("rejected", {
      reject_reason: "Sensitive <reason> 123456789012",
    })

    await upiPaymentStatusChangedHandler({
      event: {
        name: "upi_payment.status_changed",
        data: { id: "upi_123", status: "rejected" },
      },
      container: container as never,
      pluginOptions: {},
    })

    const logs = JSON.stringify([
      logger.info.mock.calls,
      logger.warn.mock.calls,
      logger.error.mock.calls,
      logger.debug.mock.calls,
    ])
    expect(logs).toContain("upi_123")
    expect(logs).toContain("rejected")
    expect(logs).not.toContain("123456789012")
    expect(logs).not.toContain("Sensitive")
    expect(logs).not.toContain("https://")
  })

  it("does not attempt notification dispatch when the feature flag is off", async () => {
    process.env.ENABLE_UPI_MANUAL = "false"
    const { container, paymentService, notificationService } =
      createSubscriberContext("verified")

    await upiPaymentStatusChangedHandler({
      event: {
        name: "upi_payment.status_changed",
        data: { id: "upi_123", status: "verified" },
      },
      container: container as never,
      pluginOptions: {},
    })

    expect(paymentService.listUpiPayments).not.toHaveBeenCalled()
    expect(notificationService.createNotifications).not.toHaveBeenCalled()
  })
})

describe("UPI email HTML escaping", () => {
  it("escapes customer names, payment details, and rejection reasons", () => {
    const instructions = upiPaymentInstructionsTemplate({
      referenceCode: "LITA-ABC234",
      amount: 1250,
      currencyCode: "inr",
      orderId: "order_123",
      orderNumber: "#42",
      storefrontUrl: "https://shop.example",
      customerName: `<img src=x onerror="alert(1)">`,
      vpa: `studio&<bad>`,
      payeeName: `"LITA" <script>`,
      deadline: "<tomorrow>",
    })
    const rejected = upiPaymentRejectedTemplate({
      referenceCode: "LITA-ABC234",
      amount: 1250,
      currencyCode: "inr",
      orderId: "order_123",
      orderNumber: "#42",
      storefrontUrl: "https://shop.example",
      rejectReason: `<script>alert("x")</script>`,
    })

    expect(instructions.html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;")
    expect(instructions.html).toContain("studio&amp;&lt;bad&gt;")
    expect(instructions.html).not.toContain("<script>")
    expect(rejected.html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;")
    expect(rejected.html).not.toContain("<script>alert")
  })
})

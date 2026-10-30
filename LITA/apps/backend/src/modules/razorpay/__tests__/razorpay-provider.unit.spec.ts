import crypto from "crypto"
import {
  MedusaError,
  PaymentActions,
  PaymentSessionStatus,
} from "@medusajs/framework/utils"
import {
  RazorpayProviderService,
  toPaise,
  fromPaise,
} from "../service"

// Mock the razorpay SDK
const mockOrdersCreate = jest.fn()
const mockPaymentsFetch = jest.fn()
const mockPaymentsCapture = jest.fn()
const mockPaymentsRefund = jest.fn()

jest.mock("razorpay", () => {
  return jest.fn().mockImplementation(() => {
    return {
      orders: {
        create: mockOrdersCreate,
      },
      payments: {
        fetch: mockPaymentsFetch,
        capture: mockPaymentsCapture,
        refund: mockPaymentsRefund,
      },
    }
  })
})

describe("RazorpayProviderService Unit Tests", () => {
  const options = {
    key_id: "rzp_test_1234567890",
    key_secret: "test_secret_key_abcdef",
    webhook_secret: "test_webhook_secret_xyz",
  }

  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }

  let service: RazorpayProviderService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new RazorpayProviderService({ logger: mockLogger }, options)
  })

  describe("validateOptions", () => {
    it("should pass when all options are provided", () => {
      expect(() =>
        RazorpayProviderService.validateOptions({
          key_id: "key",
          key_secret: "secret",
          webhook_secret: "webhook",
        })
      ).not.toThrow()
    })

    it("should throw if key_id is missing", () => {
      expect(() =>
        RazorpayProviderService.validateOptions({
          key_secret: "secret",
          webhook_secret: "webhook",
        })
      ).toThrow("Razorpay option 'key_id' is required")
    })

    it("should throw if key_secret is missing", () => {
      expect(() =>
        RazorpayProviderService.validateOptions({
          key_id: "key",
          webhook_secret: "webhook",
        })
      ).toThrow("Razorpay option 'key_secret' is required")
    })

    it("should throw if webhook_secret is missing", () => {
      expect(() =>
        RazorpayProviderService.validateOptions({
          key_id: "key",
          key_secret: "secret",
        })
      ).toThrow("Razorpay option 'webhook_secret' is required")
    })
  })

  describe("toPaise & fromPaise helper", () => {
    it("converts whole rupees to paise correctly", () => {
      expect(toPaise(499)).toBe(49900)
      expect(toPaise("499")).toBe(49900)
    })

    it("converts decimal rupee values to paise without floating-point artifacts", () => {
      expect(toPaise(499.5)).toBe(49950)
      expect(toPaise(499.99)).toBe(49999)
      expect(toPaise("10.05")).toBe(1005)
    })

    it("converts paise back to major units correctly", () => {
      expect(fromPaise(49900).numeric).toBe(499)
      expect(fromPaise(49950).numeric).toBe(499.5)
      expect(fromPaise(1005).numeric).toBe(10.05)
    })
  })

  describe("initiatePayment", () => {
    it("creates a Razorpay order in paise with currency and session_id note", async () => {
      mockOrdersCreate.mockResolvedValueOnce({
        id: "order_rzp_123",
        amount: 49900,
        currency: "INR",
        status: "created",
      })

      const res = await service.initiatePayment({
        amount: 499,
        currency_code: "inr",
        data: { session_id: "ps_12345" },
        context: { idempotency_key: "idem_key_abcdef" },
      })

      expect(mockOrdersCreate).toHaveBeenCalledWith({
        amount: 49900,
        currency: "INR",
        receipt: "idem_key_abcdef",
        notes: { session_id: "ps_12345" },
      })
      expect(res.id).toBe("order_rzp_123")
      expect(res.data?.razorpay_order_id).toBe("order_rzp_123")
      expect(res.data?.amount).toBe(49900)
    })

    it("throws MedusaError if session_id is missing", async () => {
      await expect(
        service.initiatePayment({
          amount: 499,
          currency_code: "inr",
          data: {},
        })
      ).rejects.toThrow("Cannot initiate Razorpay payment: session_id is required")
    })
  })

  describe("authorizePayment", () => {
    const orderId = "order_123"
    const paymentId = "pay_456"
    const validSignature = crypto
      .createHmac("sha256", options.key_secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex")

    it("returns requires_more if any razorpay field is missing", async () => {
      const res = await service.authorizePayment({
        data: { razorpay_order_id: "order_123" },
      })
      expect(res.status).toBe(PaymentSessionStatus.REQUIRES_MORE)
    })

    it("returns error when HMAC signature is tampered or invalid", async () => {
      const tamperedSignature = "invalid_signature_hex_0000000000000000000000000000000000000000000000000000000000000000"

      const res = await service.authorizePayment({
        data: {
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: tamperedSignature,
          amount: 49900,
        },
      })

      expect(res.status).toBe(PaymentSessionStatus.ERROR)
      expect(mockPaymentsFetch).not.toHaveBeenCalled()
    })

    it("returns authorized when HMAC signature, order_id, amount, and currency are valid", async () => {
      mockPaymentsFetch.mockResolvedValueOnce({
        id: paymentId,
        order_id: orderId,
        amount: 49900,
        currency: "INR",
        status: "captured",
      })

      const res = await service.authorizePayment({
        data: {
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: validSignature,
          amount: 49900,
          session_id: "ps_123",
        },
      })

      expect(mockPaymentsFetch).toHaveBeenCalledWith(paymentId)
      expect(res.status).toBe(PaymentSessionStatus.AUTHORIZED)
      expect(res.data?.razorpay_payment_id).toBe(paymentId)
      expect(res.data?.amount).toBe(49900)
    })

    it("valid signature but payment.order_id does not match the stored order id is rejected", async () => {
      mockPaymentsFetch.mockResolvedValueOnce({
        id: paymentId,
        order_id: "order_different_999",
        amount: 49900,
        currency: "INR",
        status: "captured",
      })

      const res = await service.authorizePayment({
        data: {
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: validSignature,
          amount: 49900,
        },
      })

      expect(res.status).toBe(PaymentSessionStatus.ERROR)
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Order ID mismatch for payment pay_456")
      )
    })

    it("valid signature but amount mismatch is rejected", async () => {
      mockPaymentsFetch.mockResolvedValueOnce({
        id: paymentId,
        order_id: orderId,
        amount: 10000,
        currency: "INR",
        status: "captured",
      })

      const res = await service.authorizePayment({
        data: {
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: validSignature,
          amount: 49900,
        },
      })

      expect(res.status).toBe(PaymentSessionStatus.ERROR)
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Amount mismatch for payment pay_456")
      )
    })

    it("valid signature but currency mismatch is rejected", async () => {
      mockPaymentsFetch.mockResolvedValueOnce({
        id: paymentId,
        order_id: orderId,
        amount: 49900,
        currency: "USD",
        status: "captured",
      })

      const res = await service.authorizePayment({
        data: {
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: validSignature,
          amount: 49900,
        },
      })

      expect(res.status).toBe(PaymentSessionStatus.ERROR)
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Currency mismatch for payment pay_456")
      )
    })

    it("payment status other than authorized/captured is rejected", async () => {
      mockPaymentsFetch.mockResolvedValueOnce({
        id: paymentId,
        order_id: orderId,
        amount: 49900,
        currency: "INR",
        status: "failed",
      })

      const res = await service.authorizePayment({
        data: {
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: validSignature,
          amount: 49900,
        },
      })

      expect(res.status).toBe(PaymentSessionStatus.ERROR)
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("invalid status: failed")
      )
    })

    it("a payment id already used on another session is rejected", async () => {
      const mockPaymentModule = {
        listPayments: jest.fn().mockResolvedValueOnce([
          {
            data: { razorpay_payment_id: paymentId },
            payment_session_id: "ps_other_session_999",
          },
        ]),
      }

      const replayCheckService = new RazorpayProviderService(
        { paymentModuleService: mockPaymentModule, logger: mockLogger },
        options
      )

      mockPaymentsFetch.mockResolvedValueOnce({
        id: paymentId,
        order_id: orderId,
        amount: 49900,
        currency: "INR",
        status: "captured",
      })

      const res = await replayCheckService.authorizePayment({
        data: {
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: validSignature,
          amount: 49900,
          session_id: "ps_current_session_111",
        },
      })

      expect(res.status).toBe(PaymentSessionStatus.ERROR)
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Replay attempt detected")
      )
    })

    it("a payment id on the same session is not rejected as replay", async () => {
      const mockPaymentModule = {
        listPayments: jest.fn().mockResolvedValueOnce([
          {
            data: { razorpay_payment_id: paymentId },
            payment_session_id: "ps_current_session_111",
          },
        ]),
      }

      const replayCheckService = new RazorpayProviderService(
        { paymentModuleService: mockPaymentModule, logger: mockLogger },
        options
      )

      mockPaymentsFetch.mockResolvedValueOnce({
        id: paymentId,
        order_id: orderId,
        amount: 49900,
        currency: "INR",
        status: "captured",
      })

      const res = await replayCheckService.authorizePayment({
        data: {
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: validSignature,
          amount: 49900,
          session_id: "ps_current_session_111",
        },
      })

      expect(res.status).toBe(PaymentSessionStatus.AUTHORIZED)
    })

    it("succeeds without modal signature when webhook_verified is true", async () => {
      mockPaymentsFetch.mockResolvedValueOnce({
        id: paymentId,
        order_id: orderId,
        amount: 49900,
        currency: "INR",
        status: "captured",
      })

      const res = await service.authorizePayment({
        data: {
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          webhook_verified: true,
          amount: 49900,
          session_id: "ps_123",
        },
      })

      expect(res.status).toBe(PaymentSessionStatus.AUTHORIZED)
      expect(res.data?.razorpay_payment_id).toBe(paymentId)
    })
  })

  describe("updatePayment", () => {
    it("does not create a new Razorpay order if amount is unchanged", async () => {
      const res = await service.updatePayment({
        amount: 499,
        currency_code: "inr",
        data: {
          razorpay_order_id: "order_existing",
          amount: 49900,
          session_id: "ps_123",
          razorpay_payment_id: "pay_xyz",
        },
      })

      expect(mockOrdersCreate).not.toHaveBeenCalled()
      expect(res.data?.razorpay_order_id).toBe("order_existing")
      expect(res.data?.razorpay_payment_id).toBe("pay_xyz")
    })

    it("creates a new Razorpay order if total amount has changed", async () => {
      mockOrdersCreate.mockResolvedValueOnce({
        id: "order_new_999",
        amount: 79900,
        currency: "INR",
        status: "created",
      })

      const res = await service.updatePayment({
        amount: 799,
        currency_code: "inr",
        data: {
          razorpay_order_id: "order_old",
          amount: 49900,
          session_id: "ps_123",
        },
      })

      expect(mockOrdersCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 79900,
          currency: "INR",
        })
      )
      expect(res.data?.razorpay_order_id).toBe("order_new_999")
      expect(res.data?.amount).toBe(79900)
    })

    it("ignores client-supplied amount and order id", async () => {
      mockOrdersCreate.mockResolvedValueOnce({
        id: "order_new_derived",
        amount: 99900,
        currency: "INR",
        status: "created",
      })

      const res = await service.updatePayment({
        amount: 999,
        currency_code: "inr",
        data: {
          session_id: "ps_secure_123",
          amount: 100, // client attempts to spoof cheap amount
          razorpay_order_id: "order_client_spoofed",
        },
      })

      expect(mockOrdersCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 99900,
          currency: "INR",
        })
      )
      expect(res.data?.razorpay_order_id).toBe("order_new_derived")
      expect(res.data?.amount).toBe(99900)
    })

    it("ignores client-supplied amount in verification branch", async () => {
      const res = await service.updatePayment({
        amount: 500,
        currency_code: "inr",
        data: {
          razorpay_order_id: "order_verified",
          razorpay_payment_id: "pay_verified_123",
          razorpay_signature: "sig_abc",
          amount: 100, // client attempts to pass spoofed amount during verification
          session_id: "ps_123",
        },
      })

      expect(mockOrdersCreate).not.toHaveBeenCalled()
      expect(res.data?.amount).toBe(50000)
      expect(res.data?.razorpay_order_id).toBe("order_verified")
    })
  })

  describe("capturePayment", () => {
    it("returns data without re-capturing if payment is already captured", async () => {
      mockPaymentsFetch.mockResolvedValueOnce({
        id: "pay_123",
        status: "captured",
        amount: 49900,
      })

      const res = await service.capturePayment({
        data: { razorpay_payment_id: "pay_123" },
      })

      expect(mockPaymentsFetch).toHaveBeenCalledWith("pay_123")
      expect(mockPaymentsCapture).not.toHaveBeenCalled()
      expect(res.data?.status).toBe("captured")
    })

    it("captures payment if payment is authorized", async () => {
      mockPaymentsFetch.mockResolvedValueOnce({
        id: "pay_123",
        status: "authorized",
        amount: 49900,
        currency: "INR",
      })
      mockPaymentsCapture.mockResolvedValueOnce({
        id: "pay_123",
        status: "captured",
        amount: 49900,
        currency: "INR",
      })

      const res = await service.capturePayment({
        data: { razorpay_payment_id: "pay_123" },
      })

      expect(mockPaymentsCapture).toHaveBeenCalledWith("pay_123", 49900, "INR")
      expect(res.data?.status).toBe("captured")
    })

    it("throws MedusaError when Razorpay capture fails", async () => {
      mockPaymentsFetch.mockResolvedValueOnce({
        id: "pay_123",
        status: "authorized",
        amount: 49900,
        currency: "INR",
      })
      mockPaymentsCapture.mockRejectedValueOnce(new Error("Gateway connection timeout"))

      await expect(
        service.capturePayment({
          data: { razorpay_payment_id: "pay_123" },
        })
      ).rejects.toThrow(
        expect.objectContaining({
          type: MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
          message: expect.stringContaining("Failed to capture Razorpay payment pay_123"),
        })
      )
    })
  })

  describe("refundPayment", () => {
    it("throws MedusaError when razorpay_payment_id is missing", async () => {
      await expect(
        service.refundPayment({
          amount: 250,
          data: {},
        })
      ).rejects.toThrow(
        expect.objectContaining({
          type: MedusaError.Types.INVALID_DATA,
          message: "Cannot refund: no Razorpay payment id on this payment",
        })
      )
    })

    it("throws MedusaError when refund amount is 0 or negative", async () => {
      await expect(
        service.refundPayment({
          amount: 0,
          data: { razorpay_payment_id: "pay_123" },
        })
      ).rejects.toThrow(
        expect.objectContaining({
          type: MedusaError.Types.INVALID_DATA,
          message: "Cannot refund: refund amount must be greater than 0",
        })
      )

      await expect(
        service.refundPayment({
          amount: -10,
          data: { razorpay_payment_id: "pay_123" },
        })
      ).rejects.toThrow(
        expect.objectContaining({
          type: MedusaError.Types.INVALID_DATA,
          message: "Cannot refund: refund amount must be greater than 0",
        })
      )
    })

    it("throws MedusaError when Razorpay payment fetch fails", async () => {
      mockPaymentsFetch.mockRejectedValueOnce(new Error("Network error"))

      await expect(
        service.refundPayment({
          amount: 250,
          data: { razorpay_payment_id: "pay_123" },
        })
      ).rejects.toThrow(
        expect.objectContaining({
          type: MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
          message: expect.stringContaining("Failed to fetch Razorpay payment pay_123"),
        })
      )

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("[Razorpay] Failed to fetch payment pay_123")
      )
    })

    it("throws MedusaError when refund amount exceeds captured amount", async () => {
      mockPaymentsFetch.mockResolvedValueOnce({
        id: "pay_123",
        amount: 50000, // 500 INR in paise
        amount_refunded: 0,
        status: "captured",
      })

      await expect(
        service.refundPayment({
          amount: 600, // 60000 paise > 50000 paise
          data: { razorpay_payment_id: "pay_123" },
        })
      ).rejects.toThrow(
        expect.objectContaining({
          type: MedusaError.Types.INVALID_DATA,
          message: "Cannot refund: requested amount (60000 paise) exceeds captured amount (50000 paise)",
        })
      )
    })

    it("throws MedusaError when refund amount exceeds remaining refundable amount", async () => {
      mockPaymentsFetch.mockResolvedValueOnce({
        id: "pay_123",
        amount: 50000, // 500 INR
        amount_refunded: 30000, // 300 INR already refunded, 200 INR remaining
        status: "captured",
      })

      await expect(
        service.refundPayment({
          amount: 250, // 25000 paise > 20000 paise remaining
          data: { razorpay_payment_id: "pay_123" },
        })
      ).rejects.toThrow(
        expect.objectContaining({
          type: MedusaError.Types.INVALID_DATA,
          message: "Cannot refund: requested amount (25000 paise) exceeds remaining refundable amount (20000 paise)",
        })
      )
    })

    it("throws MedusaError when Razorpay payments.refund API fails and logs payment id without secrets", async () => {
      mockPaymentsFetch.mockResolvedValueOnce({
        id: "pay_123",
        amount: 50000,
        amount_refunded: 0,
        status: "captured",
      })
      mockPaymentsRefund.mockRejectedValueOnce(new Error("Gateway timeout"))

      await expect(
        service.refundPayment({
          amount: 250,
          data: { razorpay_payment_id: "pay_123" },
        })
      ).rejects.toThrow(
        expect.objectContaining({
          type: MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
          message: expect.stringContaining("Failed to refund Razorpay payment pay_123"),
        })
      )

      expect(mockLogger.error).toHaveBeenCalledWith(
        "[Razorpay] Failed to refund payment pay_123: Gateway timeout"
      )
      // Verify no secrets or sensitive options logged
      expect(mockLogger.error).not.toHaveBeenCalledWith(
        expect.stringContaining("test_secret_key_abcdef")
      )
    })

    it("performs partial refund successfully with receipt and notes for idempotency", async () => {
      mockPaymentsFetch.mockResolvedValueOnce({
        id: "pay_123",
        amount: 50000,
        amount_refunded: 0,
        status: "captured",
      })
      mockPaymentsRefund.mockResolvedValueOnce({
        id: "rfnd_part_123",
        payment_id: "pay_123",
        amount: 20000,
        status: "processed",
      })

      const res = await service.refundPayment({
        amount: 200,
        data: {
          razorpay_payment_id: "pay_123",
          refund_id: "ref_item_999",
        },
        context: {
          idempotency_key: "idem_partial_123",
        },
      })

      expect(mockPaymentsRefund).toHaveBeenCalledWith("pay_123", {
        amount: 20000,
        receipt: "idem_partial_123",
        notes: {
          payment_id: "pay_123",
          receipt: "idem_partial_123",
          medusa_refund_id: "ref_item_999",
        },
      })
      expect((res.data as any)?.refund?.id).toBe("rfnd_part_123")
    })

    it("performs full refund successfully with receipt and notes for idempotency", async () => {
      mockPaymentsFetch.mockResolvedValueOnce({
        id: "pay_123",
        amount: 50000,
        amount_refunded: 0,
        status: "captured",
      })
      mockPaymentsRefund.mockResolvedValueOnce({
        id: "rfnd_full_123",
        payment_id: "pay_123",
        amount: 50000,
        status: "processed",
      })

      const res = await service.refundPayment({
        amount: 500,
        data: {
          razorpay_payment_id: "pay_123",
          refund_id: "ref_order_full",
        },
      })

      expect(mockPaymentsRefund).toHaveBeenCalledWith("pay_123", {
        amount: 50000,
        receipt: "ref_order_full",
        notes: {
          payment_id: "pay_123",
          receipt: "ref_order_full",
          medusa_refund_id: "ref_order_full",
        },
      })
      expect((res.data as any)?.refund?.id).toBe("rfnd_full_123")
    })
  })

  describe("getPaymentStatus", () => {
    it("returns captured status when payment is captured", async () => {
      mockPaymentsFetch.mockResolvedValueOnce({
        id: "pay_123",
        status: "captured",
      })

      const res = await service.getPaymentStatus({
        data: { razorpay_payment_id: "pay_123" },
      })

      expect(res.status).toBe(PaymentSessionStatus.CAPTURED)
    })

    it("returns error status when payment is failed", async () => {
      mockPaymentsFetch.mockResolvedValueOnce({
        id: "pay_123",
        status: "failed",
      })

      const res = await service.getPaymentStatus({
        data: { razorpay_payment_id: "pay_123" },
      })

      expect(res.status).toBe(PaymentSessionStatus.ERROR)
    })

    it("falls back gracefully and logs error if fetch throws", async () => {
      mockPaymentsFetch.mockRejectedValueOnce(new Error("API network error"))

      const res = await service.getPaymentStatus({
        data: { razorpay_payment_id: "pay_123" },
      })

      expect(res.status).toBe(PaymentSessionStatus.PENDING)
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("[Razorpay] Failed to get payment status for pay_123")
      )
    })
  })

  describe("getWebhookActionAndData", () => {
    const createWebhookPayload = (
      event: string,
      entityData: Record<string, any>,
      optionsSecret = options.webhook_secret
    ) => {
      const isOrderEvent = event.startsWith("order.")
      const rawData = JSON.stringify({
        event,
        payload: isOrderEvent
          ? { order: { entity: entityData } }
          : { payment: { entity: entityData } },
      })

      const signature = crypto
        .createHmac("sha256", optionsSecret)
        .update(rawData)
        .digest("hex")

      return {
        rawData,
        data: JSON.parse(rawData),
        headers: {
          "x-razorpay-signature": signature,
        },
      }
    }

    it("logs reason and returns not_supported when x-razorpay-signature header is missing", async () => {
      const payload = createWebhookPayload("payment.captured", {
        id: "pay_123",
        amount: 49900,
        notes: { session_id: "ps_123" },
      })
      delete (payload.headers as any)["x-razorpay-signature"]

      const res = await service.getWebhookActionAndData(payload as any)

      expect(res.action).toBe(PaymentActions.NOT_SUPPORTED)
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("missing x-razorpay-signature header")
      )
    })

    it("logs reason and returns not_supported when webhook_secret is missing", async () => {
      const noSecretService = new RazorpayProviderService(
        { logger: mockLogger },
        { ...options, webhook_secret: "" }
      )
      const payload = createWebhookPayload("payment.captured", {
        id: "pay_123",
        amount: 49900,
        notes: { session_id: "ps_123" },
      })

      const res = await noSecretService.getWebhookActionAndData(payload as any)

      expect(res.action).toBe(PaymentActions.NOT_SUPPORTED)
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("missing webhook_secret in options")
      )
    })

    it("logs reason and returns not_supported when signature is invalid", async () => {
      const payload = createWebhookPayload("payment.captured", {
        id: "pay_123",
        amount: 49900,
        notes: { session_id: "ps_123" },
      })
      payload.headers["x-razorpay-signature"] = "invalid_signature_hex_00000000000000000000000000000000"

      const res = await service.getWebhookActionAndData(payload as any)

      expect(res.action).toBe(PaymentActions.NOT_SUPPORTED)
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("invalid signature")
      )
    })

    it("logs reason and returns not_supported when session_id is missing", async () => {
      const payload = createWebhookPayload("payment.captured", {
        id: "pay_123",
        amount: 49900,
        // no notes or session_id
      })

      const res = await service.getWebhookActionAndData(payload as any)

      expect(res.action).toBe(PaymentActions.NOT_SUPPORTED)
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("missing session_id")
      )
    })

    it("maps payment.authorized to PaymentActions.AUTHORIZED with major units amount", async () => {
      const payload = createWebhookPayload("payment.authorized", {
        id: "pay_123",
        amount: 49900,
        notes: { session_id: "ps_123" },
      })

      const res = await service.getWebhookActionAndData(payload as any)
      expect(res.action).toBe(PaymentActions.AUTHORIZED)
      expect(res.data?.session_id).toBe("ps_123")
      expect((res.data?.amount as any).numeric).toBe(499)
    })

    it("maps payment.captured to PaymentActions.SUCCESSFUL", async () => {
      const payload = createWebhookPayload("payment.captured", {
        id: "pay_123",
        amount: 149950,
        notes: { session_id: "ps_789" },
      })

      const res = await service.getWebhookActionAndData(payload as any)
      expect(res.action).toBe(PaymentActions.SUCCESSFUL)
      expect(res.data?.session_id).toBe("ps_789")
      expect((res.data?.amount as any).numeric).toBe(1499.5)
    })

    it("maps order.paid to PaymentActions.SUCCESSFUL", async () => {
      const payload = createWebhookPayload("order.paid", {
        id: "order_999",
        amount_paid: 299900,
        notes: { session_id: "ps_order_paid_123" },
      })

      const res = await service.getWebhookActionAndData(payload as any)
      expect(res.action).toBe(PaymentActions.SUCCESSFUL)
      expect(res.data?.session_id).toBe("ps_order_paid_123")
      expect((res.data?.amount as any).numeric).toBe(2999)
    })

    it("maps payment.failed to PaymentActions.FAILED", async () => {
      const payload = createWebhookPayload("payment.failed", {
        id: "pay_123",
        amount: 49900,
        notes: { session_id: "ps_fail" },
      })

      const res = await service.getWebhookActionAndData(payload as any)
      expect(res.action).toBe(PaymentActions.FAILED)
      expect(res.data?.session_id).toBe("ps_fail")
    })

    it("logs reason and returns not_supported for refund.processed and refund.failed", async () => {
      const processedPayload = createWebhookPayload("refund.processed", {
        id: "pay_123",
        amount: 49900,
        notes: { session_id: "ps_refund" },
      })

      const resProcessed = await service.getWebhookActionAndData(processedPayload as any)
      expect(resProcessed.action).toBe(PaymentActions.NOT_SUPPORTED)
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("Medusa PaymentActions lacks refund action support")
      )

      const failedPayload = createWebhookPayload("refund.failed", {
        id: "pay_123",
        amount: 49900,
        notes: { session_id: "ps_refund" },
      })

      const resFailed = await service.getWebhookActionAndData(failedPayload as any)
      expect(resFailed.action).toBe(PaymentActions.NOT_SUPPORTED)
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("Medusa PaymentActions lacks refund action support")
      )
    })

    it("logs reason and returns not_supported for unsupported event types", async () => {
      const payload = createWebhookPayload("payment.dispute.created", {
        id: "pay_123",
        amount: 49900,
        notes: { session_id: "ps_123" },
      })

      const res = await service.getWebhookActionAndData(payload as any)
      expect(res.action).toBe(PaymentActions.NOT_SUPPORTED)
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("unsupported event type 'payment.dispute.created'")
      )
    })
  })
})

import crypto from "crypto"
import { PaymentActions, PaymentSessionStatus } from "@medusajs/framework/utils"
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

  let service: RazorpayProviderService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new RazorpayProviderService({}, options)
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
  })

  describe("authorizePayment", () => {
    it("returns requires_more if any razorpay field is missing", async () => {
      const res = await service.authorizePayment({
        data: { razorpay_order_id: "order_123" },
      })
      expect(res.status).toBe(PaymentSessionStatus.REQUIRES_MORE)
    })

    it("returns authorized when HMAC signature is valid", async () => {
      const orderId = "order_123"
      const paymentId = "pay_456"
      const validSignature = crypto
        .createHmac("sha256", options.key_secret)
        .update(`${orderId}|${paymentId}`)
        .digest("hex")

      const res = await service.authorizePayment({
        data: {
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: validSignature,
        },
      })

      expect(res.status).toBe(PaymentSessionStatus.AUTHORIZED)
      expect(res.data?.razorpay_payment_id).toBe(paymentId)
    })

    it("returns error when HMAC signature is tampered or invalid", async () => {
      const orderId = "order_123"
      const paymentId = "pay_456"
      const tamperedSignature = "invalid_signature_hex_0000000000000000000000000000000000000000000000000000000000000000"

      const res = await service.authorizePayment({
        data: {
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: tamperedSignature,
        },
      })

      expect(res.status).toBe(PaymentSessionStatus.ERROR)
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
  })

  describe("refundPayment", () => {
    it("calls payments.refund with amount in paise", async () => {
      mockPaymentsRefund.mockResolvedValueOnce({
        id: "rfnd_123",
        amount: 25000,
      })

      const res = await service.refundPayment({
        amount: 250,
        data: { razorpay_payment_id: "pay_123" },
      })

      expect(mockPaymentsRefund).toHaveBeenCalledWith("pay_123", {
        amount: 25000,
      })
      expect((res.data as any)?.refund?.id).toBe("rfnd_123")
    })
  })

  describe("getWebhookActionAndData", () => {
    const createWebhookPayload = (event: string, entityData: Record<string, any>) => {
      const rawData = JSON.stringify({
        event,
        payload: {
          payment: {
            entity: entityData,
          },
        },
      })

      const signature = crypto
        .createHmac("sha256", options.webhook_secret)
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

    it("rejects invalid webhook signatures", async () => {
      const payload = createWebhookPayload("payment.captured", {
        id: "pay_123",
        amount: 49900,
        notes: { session_id: "ps_123" },
      })
      payload.headers["x-razorpay-signature"] = "invalid_signature"

      const res = await service.getWebhookActionAndData(payload as any)
      expect(res.action).toBe(PaymentActions.NOT_SUPPORTED)
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

    it("returns not_supported for unrelated events", async () => {
      const payload = createWebhookPayload("order.paid", {
        id: "pay_123",
        amount: 49900,
        notes: { session_id: "ps_123" },
      })

      const res = await service.getWebhookActionAndData(payload as any)
      expect(res.action).toBe(PaymentActions.NOT_SUPPORTED)
    })
  })
})

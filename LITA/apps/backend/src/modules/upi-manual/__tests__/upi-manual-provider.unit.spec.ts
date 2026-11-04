import { PaymentSessionStatus } from "@medusajs/framework/utils"
import { UpiManualProviderService } from "../service"

describe("UpiManualProviderService", () => {
  const options = {
    vpa: "payments@example",
    payee_name: "LITA",
    expiry_hours: 48,
  }

  let service: UpiManualProviderService

  beforeEach(() => {
    service = new UpiManualProviderService({}, options)
  })

  describe("validateOptions", () => {
    it("accepts required options", () => {
      expect(() =>
        UpiManualProviderService.validateOptions({
          vpa: options.vpa,
          payee_name: options.payee_name,
        })
      ).not.toThrow()
    })

    it("requires a VPA and payee name", () => {
      expect(() =>
        UpiManualProviderService.validateOptions({ payee_name: options.payee_name })
      ).toThrow("UPI manual option 'vpa' is required")
      expect(() =>
        UpiManualProviderService.validateOptions({ vpa: options.vpa })
      ).toThrow("UPI manual option 'payee_name' is required")
    })

    it("requires an integer expiry between 6 and 168 hours when provided", () => {
      expect(() =>
        UpiManualProviderService.validateOptions({
          vpa: options.vpa,
          payee_name: options.payee_name,
          expiry_hours: 0,
        })
      ).toThrow("UPI manual option 'expiry_hours' must be an integer between 6 and 168")
      expect(() =>
        UpiManualProviderService.validateOptions({
          vpa: options.vpa,
          payee_name: options.payee_name,
          expiry_hours: 169,
        })
      ).toThrow("UPI manual option 'expiry_hours' must be an integer between 6 and 168")
    })
  })

  describe("initiatePayment", () => {
    it("rejects currencies other than INR", async () => {
      await expect(
        service.initiatePayment({
          amount: 125,
          currency_code: "usd",
          data: {},
        })
      ).rejects.toThrow("currency must be INR")
    })

    it("strips client-controlled keys and returns the configured UPI details", async () => {
      const result = await service.initiatePayment({
        amount: 125,
        currency_code: "inr",
        data: {
          session_id: "ps_123",
          reference_code: "CLIENT-CODE",
          status: "captured",
          verified: true,
          amount: 1,
          captured_at: "fake",
          refunds: [{ amount: "1000" }],
          vpa: "attacker@example",
          payee_name: "Attacker",
        },
      })

      expect(result.id).toBe("ps_123")
      expect(result.data).toMatchObject({
        method: "upi_manual",
        vpa: options.vpa,
        payee_name: options.payee_name,
        expiry_hours: options.expiry_hours,
      })
      expect(result.data).not.toHaveProperty("reference_code")
      expect(result.data).not.toHaveProperty("status")
      expect(result.data).not.toHaveProperty("verified")
      expect(result.data).not.toHaveProperty("amount")
      expect(result.data).not.toHaveProperty("captured_at")
      expect(result.data).not.toHaveProperty("refunds")
    })
  })

  describe("authorizePayment", () => {
    it("authorizes the session without changing its data", async () => {
      const data = { method: "upi_manual", session_id: "ps_123" }
      const result = await service.authorizePayment({ data })

      expect(result.status).toBe(PaymentSessionStatus.AUTHORIZED)
      expect(result.data).toBe(data)
    })
  })

  describe("capturePayment", () => {
    it("sets captured_at only after verification", async () => {
      const result = await service.capturePayment({
        data: { verified: true },
      })

      expect(result.data?.captured_at).toEqual(expect.any(String))
    })

    it("rejects capture before verification", async () => {
      await expect(
        service.capturePayment({ data: {} })
      ).rejects.toThrow(
        "UPI manual payment must be verified before it can be captured"
      )
    })
  })

  describe("refundPayment", () => {
    it("appends a refund record without replacing existing entries", async () => {
      const result = await service.refundPayment({
        amount: 125,
        data: { refunds: [{ amount: "50", refunded_at: "earlier" }] },
      })

      expect(result.data?.refunds).toHaveLength(2)
      expect(result.data?.refunds?.[0]).toEqual({
        amount: "50",
        refunded_at: "earlier",
      })
      expect(result.data?.refunds?.[1]).toMatchObject({
        amount: "125",
        refunded_at: expect.any(String),
      })
    })
  })
})

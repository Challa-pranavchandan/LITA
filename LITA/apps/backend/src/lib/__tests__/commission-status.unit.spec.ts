import { MedusaError } from "@medusajs/framework/utils"
import {
  assertCommissionCanCancel,
  assertCommissionCanConvert,
  assertCommissionPaymentCompletion,
  assertCommissionTransition,
} from "../commission-status"
import { getCharcoalPortraitPrice } from "../charcoal-portrait-pricing"

describe("commission status state machine", () => {
  it.each([
    ["new", "in_discussion"],
    ["new", "rejected"],
    ["new", "cancelled"],
    ["in_discussion", "quoted"],
    ["in_discussion", "rejected"],
    ["in_discussion", "cancelled"],
    ["quoted", "accepted"],
    ["quoted", "in_discussion"],
    ["quoted", "rejected"],
    ["quoted", "cancelled"],
    ["accepted", "awaiting_payment"],
    ["accepted", "cancelled"],
    ["awaiting_payment", "in_production"],
    ["in_production", "awaiting_final_payment"],
    ["awaiting_final_payment", "paid"],
    ["awaiting_payment", "cancelled"],
    ["in_production", "cancelled"],
    ["awaiting_final_payment", "cancelled"],
    ["converted", "cancelled"],
  ] as const)("allows %s -> %s", (current, next) => {
    expect(() => assertCommissionTransition(current, next)).not.toThrow()
  })

  it.each([
    ["new", "quoted"],
    ["new", "accepted"],
    ["in_discussion", "accepted"],
    ["quoted", "paid"],
    ["accepted", "paid"],
    ["awaiting_payment", "accepted"],
    ["awaiting_payment", "paid"],
    ["in_production", "paid"],
    ["paid", "awaiting_payment"],
    ["rejected", "in_discussion"],
    ["cancelled", "quoted"],
    ["converted", "awaiting_payment"],
  ] as const)("rejects %s -> %s", (current, next) => {
    expect(() => assertCommissionTransition(current, next)).toThrow(MedusaError)
  })
})

describe("commission cancellation guards", () => {
  it.each([
    "new",
    "in_discussion",
    "quoted",
    "accepted",
    "awaiting_payment",
    "in_production",
    "awaiting_final_payment",
    "converted",
  ] as const)("permits cancellation for status '%s'", (status) => {
    expect(() => assertCommissionCanCancel({ status })).not.toThrow()
  })

  it("rejects cancellation if already cancelled", () => {
    expect(() => assertCommissionCanCancel({ status: "cancelled" })).toThrow(
      /already cancelled/
    )
  })

  it("rejects cancellation if already paid and completed", () => {
    expect(() => assertCommissionCanCancel({ status: "paid" })).toThrow(
      /already been fully paid/
    )
  })

  it("rejects cancellation if rejected", () => {
    expect(() => assertCommissionCanCancel({ status: "rejected" })).toThrow(
      /already rejected/
    )
  })
})

describe("commission order conversion guards", () => {
  it("permits conversion only for an accepted commission with a valid quote", () => {
    expect(() =>
      assertCommissionCanConvert({
        status: "accepted",
        quoted_price: 2500,
      })
    ).not.toThrow()
  })

  describe("commission payment completion guards", () => {
    it("allows payment only after conversion and before the paid transition", () => {
      expect(
        assertCommissionPaymentCompletion(
          { status: "awaiting_payment" },
          "pay_verified"
        )
      ).toBe(false)
    })

    it("treats a duplicate webhook for the same payment as idempotent", () => {
      expect(
        assertCommissionPaymentCompletion(
          {
            status: "paid",
            paid_at: new Date(),
            payment_reference: "pay_verified",
          },
          "pay_verified"
        )
      ).toBe(true)
    })

    it("rejects a second payment reference for an already-paid commission", () => {
      expect(() =>
        assertCommissionPaymentCompletion(
          {
            status: "paid",
            paid_at: new Date(),
            payment_reference: "pay_original",
          },
          "pay_other"
        )
      ).toThrow(/different Razorpay payment/)
    })

    it.each(["new", "in_discussion", "quoted", "accepted", "cancelled"] as const)(
      "does not complete payment for status %s",
      (status) => {
        expect(() =>
          assertCommissionPaymentCompletion({ status }, "pay_unverified")
        ).toThrow(/awaiting payment/)
      }
    )

    it("leaves an awaiting-payment commission retryable after a failed or cancelled attempt", () => {
      expect(
        assertCommissionPaymentCompletion(
          { status: "awaiting_payment" },
          "pay_retry"
        )
      ).toBe(false)
    })

    it("treats a duplicate deposit webhook as idempotent while in production", () => {
      expect(
        assertCommissionPaymentCompletion(
          {
            status: "in_production",
            deposit_paid_at: new Date(),
            deposit_payment_reference: "pay_deposit",
          },
          "pay_deposit"
        )
      ).toBe(true)
    })
  })

  it.each([
    [{ status: "quoted", quoted_price: 2500 }, "accepted"],
    [{ status: "accepted", quoted_price: null }, "valid quoted price"],
    [{ status: "accepted", quoted_price: 2500, order_id: "order_existing" }, "already converted"],
  ] as const)("rejects invalid conversion state", (commission, message) => {
    expect(() => assertCommissionCanConvert(commission)).toThrow(message)
  })
})

describe("fixed-price charcoal portrait pricing", () => {
  it.each([
    ["A4", 1, 999],
    ["A4", 2, 1499],
    ["A4", 3, 1999],
    ["A4", 5, 2999],
    ["A3", 1, 1500],
    ["A3", 2, 2100],
    ["A3", 3, 2700],
    ["A3", 5, 3900],
  ] as const)("prices %s portraits for %s people at ₹%s", (size, people, price) => {
    expect(getCharcoalPortraitPrice(size, people)).toBe(price)
  })

  it.each([
    ["A2", 1],
    ["A4", 0],
    ["A3", 1.5],
    ["A4", Number.MAX_SAFE_INTEGER],
  ])("rejects invalid portrait selection %s / %s", (size, people) => {
    expect(getCharcoalPortraitPrice(size, people)).toBeNull()
  })
})

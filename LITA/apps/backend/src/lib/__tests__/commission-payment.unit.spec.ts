import {
  getCommissionInstallmentAmount,
  getCommissionInstallmentAmounts,
  getCommissionPaymentInstallment,
} from "../commission-payment"

describe("commission installment amounts", () => {
  it.each([
    [1000, { deposit: 500, balance: 500 }],
    [999, { deposit: 500, balance: 499 }],
    [2, { deposit: 1, balance: 1 }],
  ])("splits a total of %s into a deposit and balance", (total, expected) => {
    expect(getCommissionInstallmentAmounts(total)).toEqual(expected)
  })

  it.each([0, 1, -2, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    "rejects a total that cannot be split into two valid installments: %s",
    (total) => {
      expect(() => getCommissionInstallmentAmounts(total)).toThrow()
    }
  )

  it("maps payable statuses to the correct installment", () => {
    expect(getCommissionPaymentInstallment("awaiting_payment")).toBe("deposit")
    expect(getCommissionPaymentInstallment("awaiting_final_payment")).toBe("balance")
    expect(getCommissionPaymentInstallment("in_production")).toBeNull()
    expect(getCommissionInstallmentAmount(999, "balance")).toBe(499)
  })
})

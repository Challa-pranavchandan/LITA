import { MedusaError } from "@medusajs/framework/utils"

export type CommissionInstallment = "deposit" | "balance"

export function getCommissionInstallmentAmounts(total: number): {
  deposit: number
  balance: number
} {
  if (typeof total !== "number" || !Number.isSafeInteger(total) || total < 2) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Commission must have a quoted price of at least 2 to split into two payments."
    )
  }

  const deposit = Math.ceil(total / 2)
  return { deposit, balance: total - deposit }
}

export function getCommissionPaymentInstallment(
  status: string
): CommissionInstallment | null {
  if (status === "awaiting_payment") return "deposit"
  if (status === "awaiting_final_payment") return "balance"
  return null
}

export function requireCommissionPaymentInstallment(
  status: string
): CommissionInstallment {
  const installment = getCommissionPaymentInstallment(status)
  if (!installment) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "No commission installment is currently available for payment."
    )
  }
  return installment
}

export function getCommissionInstallmentAmount(
  total: number | null | undefined,
  installment: CommissionInstallment
): number {
  if (typeof total !== "number") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Commission must have a valid quoted price before payment."
    )
  }
  return getCommissionInstallmentAmounts(total)[installment]
}

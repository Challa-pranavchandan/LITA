import type { MedusaStoreRequest } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { verifyProofToken } from "../../../lib/upi"
import { UPI_PAYMENT_MODULE } from "../../../modules/upi-payment"
import UpiPaymentModuleService from "../../../modules/upi-payment/service"

export type UpiPaymentRecord = {
  id: string
  reference_code: string
  order_id: string | null
  customer_id: string | null
  status: string
  amount: number
  currency_code: string
  expires_at: Date | string
  reject_reason?: string | null
  utr?: string | null
  screenshot_key?: string | null
  payer_vpa?: string | null
  attempts: number
}

export function isUpiManualEnabled(): boolean {
  return process.env.ENABLE_UPI_MANUAL === "true"
}

export function upiManualNotFound(
  res: { status: (status: number) => { json: (body: unknown) => unknown } }
) {
  return res.status(404).json({ message: "Not found." })
}

export async function findUpiPaymentByReference(
  req: MedusaStoreRequest,
  referenceCode: string
): Promise<UpiPaymentRecord | undefined> {
  const paymentService: UpiPaymentModuleService =
    req.scope.resolve(UPI_PAYMENT_MODULE)
  const records = await paymentService.listUpiPayments(
    { reference_code: referenceCode },
    { take: 1 }
  )
  return records[0] as unknown as UpiPaymentRecord | undefined
}

export function hasUpiPaymentAccess(
  req: MedusaStoreRequest,
  payment: UpiPaymentRecord
): boolean {
  const tokenHeader = req.headers["x-upi-token"]
  const token = typeof tokenHeader === "string" ? tokenHeader : undefined

  if (
    token &&
    payment.order_id &&
    verifyProofToken(token, payment.reference_code, payment.order_id)
  ) {
    return true
  }

  return Boolean(
    req.auth_context?.actor_id &&
      payment.customer_id &&
      req.auth_context.actor_id === payment.customer_id
  )
}

export function mapUpiPaymentError(
  error: unknown
): { status: number; message: string } {
  const candidate = error as { type?: string; message?: string }
  const message = candidate?.message || "UPI payment request failed."

  if (message.includes("has expired")) {
    return { status: 410, message }
  }
  if (message.includes("submission limit reached")) {
    return { status: 429, message }
  }
  if (candidate?.type === MedusaError.Types.CONFLICT) {
    return { status: 409, message }
  }
  if (candidate?.type === MedusaError.Types.NOT_FOUND) {
    return { status: 404, message }
  }
  if (candidate?.type === MedusaError.Types.INVALID_DATA) {
    return { status: 400, message }
  }
  return { status: 500, message: "UPI payment request failed." }
}

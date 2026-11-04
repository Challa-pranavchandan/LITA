import type { MedusaStoreRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { buildUpiLink, signProofToken } from "../../../../../lib/upi"
import { ensureUpiPaymentForOrderWorkflow } from "../../../../../workflows/upi-payments"
import {
  isUpiManualEnabled,
  mapUpiPaymentError,
  upiManualNotFound,
} from "../../helpers"

export async function GET(req: MedusaStoreRequest, res: MedusaResponse) {
  if (!isUpiManualEnabled()) {
    return upiManualNotFound(res)
  }

  const orderId = req.params.order_id
  try {
    // The order ID is the same capability already used by the order-confirmation page.
    const { result } = await ensureUpiPaymentForOrderWorkflow(req.scope).run({
      input: { order_id: orderId },
    })
    const payment = result as Record<string, unknown>
    const referenceCode = String(payment.reference_code)
    const amount = Number(payment.amount)

    return res.status(200).json({
      reference_code: referenceCode,
      amount,
      currency_code: payment.currency_code,
      status: payment.status,
      expires_at: payment.expires_at,
      reject_reason: payment.reject_reason ?? null,
      vpa: process.env.UPI_VPA,
      payee_name: process.env.UPI_PAYEE_NAME,
      upi_link: buildUpiLink({
        vpa: process.env.UPI_VPA || "",
        name: process.env.UPI_PAYEE_NAME || "",
        amount,
        reference: referenceCode,
      }),
      proof_token: signProofToken(referenceCode, orderId),
      has_screenshot: Boolean(payment.screenshot_key),
      utr_last4:
        typeof payment.utr === "string" ? payment.utr.slice(-4) : null,
    })
  } catch (error) {
    const mapped = mapUpiPaymentError(error)
    if (mapped.status === 500) {
      req.scope.resolve(ContainerRegistrationKeys.LOGGER).error(
        `[upi-payments] Failed to load instructions for order ${orderId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }

    if (
      (error as { type?: string })?.type === MedusaError.Types.NOT_FOUND
    ) {
      return res.status(404).json({ message: mapped.message })
    }
    return res.status(mapped.status).json({ message: mapped.message })
  }
}

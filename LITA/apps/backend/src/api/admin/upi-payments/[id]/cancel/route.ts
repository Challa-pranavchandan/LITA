import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  isUpiManualEnabled,
  upiManualNotFound,
} from "../../../../store/upi-payments/helpers"
import { expireUpiPaymentWorkflow } from "../../../../../workflows/upi-payments"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  if (!isUpiManualEnabled()) {
    return upiManualNotFound(res)
  }

  try {
    const { result } = await expireUpiPaymentWorkflow(req.scope).run({
      input: { id: req.params.id, force: true },
    })
    return res.status(200).json({ payment: result })
  } catch (error) {
    const candidate = error as { type?: string; message?: string }
    const status =
      candidate?.type === MedusaError.Types.NOT_FOUND
        ? 404
        : candidate?.type === MedusaError.Types.CONFLICT
          ? 409
          : candidate?.type === MedusaError.Types.INVALID_DATA
            ? 400
            : 500
    return res.status(status).json({
      message:
        status === 500
          ? "Failed to cancel UPI order."
          : candidate.message ?? "UPI order cancellation failed.",
    })
  }
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { isUpiManualEnabled, upiManualNotFound } from "../../../../store/upi-payments/helpers"
import { verifyUpiPaymentWorkflow } from "../../../../../workflows/upi-payments"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  if (!isUpiManualEnabled()) {
    return upiManualNotFound(res)
  }

  const { amount_confirmed } = req.validatedBody as {
    amount_confirmed: true
  }
  const adminUserId = (
    req as MedusaRequest & { auth_context?: { actor_id?: string } }
  ).auth_context?.actor_id
  if (!adminUserId) {
    return res.status(401).json({ message: "An authenticated admin is required." })
  }

  try {
    const { result } = await verifyUpiPaymentWorkflow(req.scope).run({
      input: {
        id: req.params.id,
        admin_user_id: adminUserId,
        amount_confirmed,
      },
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
          ? "Failed to verify UPI payment."
          : candidate.message ?? "UPI payment verification failed.",
    })
  }
}

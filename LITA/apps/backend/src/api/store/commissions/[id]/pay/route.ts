import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { COMMISSION_MODULE } from "../../../../../modules/commission"
import CommissionModuleService from "../../../../../modules/commission/service"
import { completeCommissionPaymentWorkflow } from "../../../../../workflows/complete-commission-payment"

type PayRequestBody = {
  session_id: string
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

export async function POST(req: MedusaRequest<PayRequestBody>, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Authentication required." })
  }

  const { id } = req.params
  const body = req.body || {}

  if (!body.session_id || !body.razorpay_payment_id || !body.razorpay_signature) {
    return res.status(400).json({
      message: "session_id, razorpay_payment_id, and razorpay_signature are required.",
    })
  }

  // Ensure customer owns this commission
  const commissionService: CommissionModuleService =
    req.scope.resolve(COMMISSION_MODULE)
  const commission = await commissionService.retrieveCommission(id)

  if (!commission || commission.customer_id !== customerId) {
    return res.status(404).json({ message: "Commission request not found." })
  }

  try {
    const { result } = await completeCommissionPaymentWorkflow(req.scope).run({
      input: {
        commission_id: id,
        session_id: body.session_id,
        razorpay_payment_id: body.razorpay_payment_id,
        razorpay_order_id: body.razorpay_order_id,
        razorpay_signature: body.razorpay_signature,
      },
    })

    return res.status(200).json({
      success: true,
      message: "Commission payment verified and completed successfully.",
      commission: result.commission,
      order: result.order,
    })
  } catch (error: any) {
    if (error?.type === MedusaError.Types.NOT_FOUND) {
      return res.status(404).json({ message: error.message })
    }
    if (error?.type === MedusaError.Types.CONFLICT) {
      return res.status(409).json({ message: error.message })
    }
    if (
      error?.type === MedusaError.Types.INVALID_DATA ||
      error?.type === MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR
    ) {
      return res.status(400).json({ message: error.message })
    }

    return res.status(400).json({
      message: error?.message || "Failed to complete commission payment.",
    })
  }
}

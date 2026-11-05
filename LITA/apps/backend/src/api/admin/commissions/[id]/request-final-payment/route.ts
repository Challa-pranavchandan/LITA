import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { requestCommissionFinalPaymentWorkflow } from "../../../../../workflows/request-commission-final-payment"
import { CommissionIdSchema } from "../../../../schemas/commission"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsedId = CommissionIdSchema.safeParse(req.params.id)
  if (!parsedId.success) {
    return res.status(400).json({ message: "Invalid commission ID." })
  }

  try {
    const { result } = await requestCommissionFinalPaymentWorkflow(req.scope).run({
      input: { commission_id: parsedId.data },
    })
    return res.status(200).json({ commission: result })
  } catch (error: any) {
    if (error?.type === MedusaError.Types.NOT_FOUND) {
      return res.status(404).json({ message: error.message })
    }
    if (error?.type === MedusaError.Types.INVALID_DATA) {
      return res.status(400).json({ message: error.message })
    }
    return res.status(400).json({
      message: error?.message || "Failed to request the final commission payment.",
    })
  }
}

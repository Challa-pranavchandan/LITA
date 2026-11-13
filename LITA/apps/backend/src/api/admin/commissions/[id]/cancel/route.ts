import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { cancelCommissionWorkflow } from "../../../../../workflows/cancel-commission"
import { CommissionIdSchema } from "../../../../schemas/commission"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsedId = CommissionIdSchema.safeParse(req.params.id)
  if (!parsedId.success) {
    return res.status(400).json({ message: "Invalid commission ID." })
  }
  const id = parsedId.data
  const body = (req.validatedBody || req.body) as { reason?: string } | undefined

  try {
    const { result } = await cancelCommissionWorkflow(req.scope).run({
      input: {
        commission_id: id,
        reason: body?.reason,
      },
    })

    return res.status(200).json({
      success: true,
      message: "Commission order cancelled successfully.",
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
    if (error?.type === MedusaError.Types.INVALID_DATA) {
      return res.status(400).json({ message: error.message })
    }
    return res.status(400).json({
      message: error?.message || "Failed to cancel commission order.",
    })
  }
}

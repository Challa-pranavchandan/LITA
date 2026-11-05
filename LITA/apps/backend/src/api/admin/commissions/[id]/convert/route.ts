import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { convertCommissionToOrderWorkflow } from "../../../../../workflows/convert-commission-to-order"
import { CommissionIdSchema } from "../../../../schemas/commission"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsedId = CommissionIdSchema.safeParse(req.params.id)
  if (!parsedId.success) {
    return res.status(400).json({ message: "Invalid commission ID." })
  }
  const id = parsedId.data

  try {
    const { result } = await convertCommissionToOrderWorkflow(req.scope).run({
      input: {
        commission_id: id,
      },
    })

    return res.status(200).json({
      success: true,
      message: "Commission successfully converted to draft order.",
      commission: result.commission,
      order: result.order,
    })
  } catch (error: any) {
    if (error?.type === MedusaError.Types.CONFLICT) {
      return res.status(409).json({ message: error.message })
    }
    if (
      error?.type === MedusaError.Types.NOT_FOUND ||
      error?.type === MedusaError.Types.INVALID_DATA
    ) {
      return res.status(error.type === MedusaError.Types.NOT_FOUND ? 404 : 400).json({
        message: error.message,
      })
    }
    return res.status(400).json({
      message: error?.message || "Failed to convert commission to draft order.",
    })
  }
}

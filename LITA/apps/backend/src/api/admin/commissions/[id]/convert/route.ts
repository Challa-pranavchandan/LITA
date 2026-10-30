import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { convertCommissionToOrderWorkflow } from "../../../../../workflows/convert-commission-to-order"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params

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
    return res.status(400).json({
      message: error?.message || "Failed to convert commission to draft order.",
    })
  }
}

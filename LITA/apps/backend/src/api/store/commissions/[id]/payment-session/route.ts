import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { createCommissionPaymentSessionWorkflow } from "../../../../../workflows/create-commission-payment-session"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Authentication required." })
  }

  const { id } = req.params

  try {
    const { result } = await createCommissionPaymentSessionWorkflow(req.scope).run({
      input: {
        commission_id: id,
        customer_id: customerId,
      },
    })

    return res.status(200).json(result)
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
      message: error?.message || "Failed to initiate commission payment session.",
    })
  }
}

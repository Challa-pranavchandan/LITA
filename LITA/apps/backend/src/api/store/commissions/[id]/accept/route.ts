import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMMISSION_MODULE } from "../../../../../modules/commission"
import CommissionModuleService from "../../../../../modules/commission/service"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Authentication required." })
  }

  const { id } = req.params
  const commissionService: CommissionModuleService = req.scope.resolve(COMMISSION_MODULE)

  const commission = await commissionService.retrieveCommission(id)
  if (!commission || commission.customer_id !== customerId) {
    return res.status(404).json({ message: "Commission request not found." })
  }

  if (commission.status !== "quoted") {
    return res.status(400).json({
      message: `Only commissions in 'quoted' status can be accepted. Current status: ${commission.status}`,
    })
  }

  if (!commission.quoted_price || commission.quoted_price <= 0) {
    return res.status(400).json({
      message: "No valid quote price has been set by the artist yet.",
    })
  }

  const updated = await commissionService.updateCommissions({
    id,
    status: "accepted",
  })

  return res.status(200).json({
    message: "Quote accepted successfully! The artist will now create your order.",
    commission: updated,
  })
}

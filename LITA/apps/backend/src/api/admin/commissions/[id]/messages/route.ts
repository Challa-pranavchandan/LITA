import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMMISSION_MODULE } from "../../../../../modules/commission"
import CommissionModuleService from "../../../../../modules/commission/service"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const { body } = (req.body as any) || {}

  if (!body || typeof body !== "string" || !body.trim()) {
    return res.status(400).json({ message: "Message body cannot be empty." })
  }

  const commissionService: CommissionModuleService = req.scope.resolve(COMMISSION_MODULE)

  const commission = await commissionService.retrieveCommission(id)
  if (!commission) {
    return res.status(404).json({ message: "Commission not found." })
  }

  const message = await commissionService.createCommissionMessages({
    commission_id: id,
    sender: "admin",
    body: body.trim(),
  })

  // If status was new, automatically transition to in_discussion
  if (commission.status === "new") {
    await commissionService.updateCommissions({
      id,
      status: "in_discussion",
    })
  }

  return res.status(201).json({ message })
}

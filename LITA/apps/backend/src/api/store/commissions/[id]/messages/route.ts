import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMMISSION_MODULE } from "../../../../../modules/commission"
import CommissionModuleService from "../../../../../modules/commission/service"
import {
  assertCommissionTransition,
  emitCommissionStatusChanged,
  type CommissionStatus,
} from "../../../../../lib/commission-status"
import { CommissionIdSchema } from "../../../../schemas/commission"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Authentication required." })
  }

  const parsedId = CommissionIdSchema.safeParse(req.params.id)
  if (!parsedId.success) {
    return res.status(400).json({ message: "Invalid commission ID." })
  }
  const id = parsedId.data
  const { body } = req.body as { body: string }

  const commissionService: CommissionModuleService = req.scope.resolve(COMMISSION_MODULE)

  const commission = await commissionService.retrieveCommission(id)
  if (!commission || commission.customer_id !== customerId) {
    return res.status(404).json({ message: "Commission request not found." })
  }

  if (["paid", "rejected", "cancelled"].includes(commission.status)) {
    return res.status(409).json({
      message: `Messages are closed for commissions in '${commission.status}' status.`,
    })
  }

  const message = await commissionService.createCommissionMessages({
    commission_id: id,
    sender: "client",
    body: body.trim(),
  })

  // If status is "new", move to "in_discussion"
  if (commission.status === "new") {
    assertCommissionTransition(
      commission.status as CommissionStatus,
      "in_discussion"
    )
    const updated = await commissionService.updateCommissions({
      id,
      status: "in_discussion",
    })
    await emitCommissionStatusChanged(
      req.scope,
      commission.status as CommissionStatus,
      updated
    )
  }

  return res.status(201).json({ message })
}

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

  if (
    typeof commission.quoted_price !== "number" ||
    !Number.isSafeInteger(commission.quoted_price) ||
    commission.quoted_price <= 0
  ) {
    return res.status(400).json({
      message: "No valid quote price has been set by the artist yet.",
    })
  }

  assertCommissionTransition(
    commission.status as CommissionStatus,
    "accepted"
  )

  const updated = await commissionService.updateCommissions({
    id,
    status: "accepted",
  })

  await emitCommissionStatusChanged(
    req.scope,
    commission.status as CommissionStatus,
    updated
  )

  return res.status(200).json({
    message: "Quote accepted successfully! The artist will now create your order.",
    commission: updated,
  })
}

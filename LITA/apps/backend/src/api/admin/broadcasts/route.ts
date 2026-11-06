import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BROADCAST_MODULE } from "../../../modules/broadcast"
import BroadcastModuleService from "../../../modules/broadcast/service"
import { createBroadcastWorkflow } from "../../../workflows/broadcast"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: BroadcastModuleService = req.scope.resolve(BROADCAST_MODULE)
  const status = req.query.status as string | undefined

  const filters: Record<string, any> = {}
  if (status && status !== "all") {
    filters.status = status
  }

  const [broadcasts, count] = await service.listAndCountBroadcasts(filters, {
    order: { created_at: "DESC" },
    take: 100,
  })

  return res.json({ broadcasts, count })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.validatedBody as any

  const { result: broadcast } = await createBroadcastWorkflow(req.scope).run({
    input: body,
  })

  return res.status(201).json({ broadcast })
}

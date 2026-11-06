import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BROADCAST_MODULE } from "../../../../modules/broadcast"
import BroadcastModuleService from "../../../../modules/broadcast/service"
import {
  updateBroadcastWorkflow,
  deleteBroadcastWorkflow,
} from "../../../../workflows/broadcast"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: BroadcastModuleService = req.scope.resolve(BROADCAST_MODULE)
  const broadcast = await service.retrieveBroadcast(req.params.id)

  if (!broadcast) {
    return res.status(404).json({ message: "Broadcast not found" })
  }

  return res.json({ broadcast })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.validatedBody as any

  const { result: broadcast } = await updateBroadcastWorkflow(req.scope).run({
    input: {
      id: req.params.id,
      ...body,
    },
  })

  return res.json({ broadcast })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  await deleteBroadcastWorkflow(req.scope).run({
    input: req.params.id,
  })

  return res.json({ success: true, id: req.params.id })
}

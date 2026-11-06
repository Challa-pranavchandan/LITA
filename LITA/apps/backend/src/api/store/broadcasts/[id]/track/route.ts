import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { trackBroadcastEventWorkflow } from "../../../../../workflows/broadcast"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.validatedBody as { event: "impression" | "click" }
  const id = req.params.id

  const { result } = await trackBroadcastEventWorkflow(req.scope).run({
    input: {
      id,
      event: body.event,
    },
  })

  return res.json({ success: true, event: body.event, result })
}

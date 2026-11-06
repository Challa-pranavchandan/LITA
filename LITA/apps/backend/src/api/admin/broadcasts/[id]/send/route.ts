import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { sendBroadcastWorkflow } from "../../../../../workflows/broadcast"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { result: broadcast } = await sendBroadcastWorkflow(req.scope).run({
    input: {
      id: req.params.id,
    },
  })

  return res.json({
    success: true,
    broadcast,
    message: `Broadcast emails processed successfully.`,
  })
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { sendTestBroadcastWorkflow } from "../../../../../workflows/broadcast"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.validatedBody as { test_email: string }

  const { result } = await sendTestBroadcastWorkflow(req.scope).run({
    input: {
      id: req.params.id,
      testEmail: body.test_email,
    },
  })

  return res.json({
    success: true,
    result,
    message: `Test email dispatched to ${body.test_email}`,
  })
}

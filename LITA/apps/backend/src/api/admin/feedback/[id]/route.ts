import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { FEEDBACK_MODULE } from "../../../../modules/feedback"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve(FEEDBACK_MODULE)
  const { status } = req.body as { status: "new" | "reviewed" | "resolved" }
  const feedback = await service.updateFeedbacks({ id: req.params.id, status })
  res.json({ feedback })
}

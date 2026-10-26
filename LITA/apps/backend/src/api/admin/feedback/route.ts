import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { FEEDBACK_MODULE } from "../../../modules/feedback"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve(FEEDBACK_MODULE)
  const { type } = req.query as { type?: string }
  const feedbacks = await service.listFeedbacks(
    type ? { type } : {},
    { order: { created_at: "DESC" }, take: 200 }
  )
  res.json({ feedbacks })
}

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { JOURNAL_MODULE } from "../../../../modules/journal"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve(JOURNAL_MODULE)
  const [post] = await service.listJournalPosts({
    slug: req.params.slug,
    status: "published",
  })
  if (!post) return res.status(404).json({ message: "Not found" })
  res.json({ post })
}

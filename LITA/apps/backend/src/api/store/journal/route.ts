import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { JOURNAL_MODULE } from "../../../modules/journal"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve(JOURNAL_MODULE)
  const posts = await service.listJournalPosts(
    { status: "published" },
    {
      order: { published_at: "DESC" },
      select: ["id", "title", "slug", "excerpt", "cover_image_url", "published_at", "tags"],
    }
  )
  res.json({ posts })
}

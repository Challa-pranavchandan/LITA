import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { JOURNAL_MODULE } from "../../../modules/journal"
import { createJournalPostWorkflow } from "../../../workflows/journal-posts"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve(JOURNAL_MODULE)
  const [posts, count] = await service.listAndCountJournalPosts(
    {},
    {
      order: { created_at: "DESC" },
      take: 20,
      skip: Number(req.query.offset ?? 0),
    }
  )
  res.json({ posts, count })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { result } = await createJournalPostWorkflow(req.scope).run({
    input: req.validatedBody as any,
  })
  res.status(201).json({ post: result })
}

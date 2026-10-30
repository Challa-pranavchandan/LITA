import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { JOURNAL_MODULE } from "../../../../modules/journal"
import {
  updateJournalPostWorkflow,
  deleteJournalPostWorkflow,
} from "../../../../workflows/journal-posts"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve(JOURNAL_MODULE)
  res.json({ post: await service.retrieveJournalPost(req.params.id) })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { result } = await updateJournalPostWorkflow(req.scope).run({
    input: { id: req.params.id, ...(req.validatedBody as any) },
  })
  res.json({ post: result })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const { result } = await deleteJournalPostWorkflow(req.scope).run({
    input: { id: req.params.id },
  })
  res.json(result)
}

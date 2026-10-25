import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { GALLERY_MODULE } from "../../../../modules/gallery"
import { deleteGalleryItemWorkflow } from "../../../../workflows/gallery"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve(GALLERY_MODULE)
  const item = await (service as any).updateGalleryItems({
    id: req.params.id,
    ...(req.validatedBody as any),
  })
  res.json({ item })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  await deleteGalleryItemWorkflow(req.scope).run({ input: { id: req.params.id } })
  res.json({ id: req.params.id, deleted: true })
}

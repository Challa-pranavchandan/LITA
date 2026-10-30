import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { GALLERY_MODULE } from "../../../modules/gallery"
import { createGalleryItemsWorkflow } from "../../../workflows/gallery"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve(GALLERY_MODULE)
  const items = await (service as any).listGalleryItems({}, { order: { position: "ASC" } })
  res.json({ items })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { result } = await createGalleryItemsWorkflow(req.scope).run({
    input: req.validatedBody as any,
  })
  res.status(201).json({ items: result })
}

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { GALLERY_MODULE } from "../../../modules/gallery"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve(GALLERY_MODULE)
  const items = await (service as any).listGalleryItems(
    { is_published: true },
    {
      order: { position: "ASC" },
      select: ["id", "image_url", "alt", "caption", "width", "height", "position", "col_span", "row_span"],
    }
  )
  res.json({ items })
}

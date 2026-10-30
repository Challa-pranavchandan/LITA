import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { updateGalleryLayoutWorkflow } from "../../../../workflows/gallery"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { result } = await updateGalleryLayoutWorkflow(req.scope).run({
    input: req.validatedBody as any,
  })

  // Tell the storefront to refresh its cache (fire and forget)
  if (process.env.STOREFRONT_URL && process.env.REVALIDATE_SECRET) {
    fetch(`${process.env.STOREFRONT_URL}/api/revalidate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ secret: process.env.REVALIDATE_SECRET, tag: "gallery" }),
    }).catch(() => {})
  }

  res.json({ items: result })
}

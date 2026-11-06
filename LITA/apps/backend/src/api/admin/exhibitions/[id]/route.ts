import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { EXHIBITION_MODULE } from "../../../../modules/exhibition"
import ExhibitionModuleService from "../../../../modules/exhibition/service"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service: ExhibitionModuleService = req.scope.resolve(EXHIBITION_MODULE)
  const body = (req.validatedBody || {}) as Record<string, any>

  const updatePayload: Record<string, any> = {
    id: req.params.id,
    ...body,
  }

  if (body.images !== undefined) {
    const normalizedImages = Array.isArray(body.images)
      ? body.images.map((img: any) =>
          typeof img === "string"
            ? { url: img, alt: null }
            : { url: img.url, alt: img.alt || null }
        )
      : null
    updatePayload.images = (normalizedImages ?? null) as unknown as Record<string, unknown>

    // If image_url was not explicitly given, sync with first image
    if (body.image_url === undefined && normalizedImages && normalizedImages.length > 0) {
      updatePayload.image_url = normalizedImages[0].url
      if (body.image_alt === undefined && normalizedImages[0].alt) {
        updatePayload.image_alt = normalizedImages[0].alt
      }
    }
  }

  const exhibition = await service.updateExhibitions(updatePayload)

  return res.json({ exhibition })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const service: ExhibitionModuleService = req.scope.resolve(EXHIBITION_MODULE)
  await service.deleteExhibitions(req.params.id)

  return res.json({ id: req.params.id, deleted: true })
}

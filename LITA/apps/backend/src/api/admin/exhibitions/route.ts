import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { EXHIBITION_MODULE } from "../../../modules/exhibition"
import ExhibitionModuleService from "../../../modules/exhibition/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: ExhibitionModuleService = req.scope.resolve(EXHIBITION_MODULE)
  const [exhibitions, count] = await service.listAndCountExhibitions(
    {},
    { order: { start_date: "DESC" }, take: 100 }
  )

  return res.json({ exhibitions, count })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service: ExhibitionModuleService = req.scope.resolve(EXHIBITION_MODULE)
  const body = req.validatedBody as {
    title: string
    description: string
    details?: string | null
    location?: string | null
    start_date: string
    end_date: string
    image_url?: string | null
    image_alt?: string | null
    images?: Array<{ url: string; alt?: string | null } | string> | null
    is_published?: boolean
  }

  const normalizedImages = Array.isArray(body.images)
    ? body.images.map((img) =>
        typeof img === "string"
          ? { url: img, alt: null }
          : { url: img.url, alt: img.alt || null }
      )
    : null

  const primaryImageUrl =
    body.image_url || normalizedImages?.[0]?.url || null
  const primaryImageAlt =
    body.image_alt || normalizedImages?.[0]?.alt || null

  const exhibition = await service.createExhibitions({
    ...body,
    details: body.details || null,
    location: body.location || null,
    image_url: primaryImageUrl,
    image_alt: primaryImageAlt,
    images: (normalizedImages ?? null) as unknown as Record<string, unknown>,
  })

  return res.status(201).json({ exhibition })
}

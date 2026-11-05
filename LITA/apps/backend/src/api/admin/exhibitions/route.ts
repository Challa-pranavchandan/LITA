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
    is_published?: boolean
  }
  const exhibition = await service.createExhibitions({
    ...body,
    details: body.details || null,
    location: body.location || null,
    image_url: body.image_url || null,
    image_alt: body.image_alt || null,
  })

  return res.status(201).json({ exhibition })
}

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { EXHIBITION_MODULE } from "../../../../modules/exhibition"
import ExhibitionModuleService from "../../../../modules/exhibition/service"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service: ExhibitionModuleService = req.scope.resolve(EXHIBITION_MODULE)
  const exhibition = await service.updateExhibitions({
    id: req.params.id,
    ...(req.validatedBody as Record<string, unknown>),
  })

  return res.json({ exhibition })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const service: ExhibitionModuleService = req.scope.resolve(EXHIBITION_MODULE)
  await service.deleteExhibitions(req.params.id)

  return res.json({ id: req.params.id, deleted: true })
}

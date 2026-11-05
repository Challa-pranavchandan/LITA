import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { EXHIBITION_MODULE } from "../../../modules/exhibition"
import ExhibitionModuleService from "../../../modules/exhibition/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: ExhibitionModuleService = req.scope.resolve(EXHIBITION_MODULE)
  const exhibitions = await service.listExhibitions(
    { is_published: true },
    { order: { start_date: "ASC" }, take: 100 }
  )

  return res.json({ exhibitions })
}

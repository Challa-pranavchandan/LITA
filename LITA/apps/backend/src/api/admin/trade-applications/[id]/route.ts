import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TRADE_MODULE } from "../../../../modules/trade"
import TradeModuleService from "../../../../modules/trade/service"
import { z } from "zod"
import { UpdateTradeApplicationSchema } from "../../../middlewares"

type Body = z.infer<typeof UpdateTradeApplicationSchema>

export async function POST(req: MedusaRequest<Body>, res: MedusaResponse) {
  const svc: TradeModuleService = req.scope.resolve(TRADE_MODULE)

  const application = await svc.updateTradeApplications({
    id: req.params.id,
    status: req.validatedBody.status,
  })

  res.json({ application })
}

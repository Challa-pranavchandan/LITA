import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TRADE_MODULE } from "../../../modules/trade"
import TradeModuleService from "../../../modules/trade/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: TradeModuleService = req.scope.resolve(TRADE_MODULE)
  const status = req.query.status as string | undefined

  const [applications, count] = await svc.listAndCountTradeApplications(
    status ? { status } : {},
    { order: { created_at: "DESC" }, take: 100 }
  )

  res.json({ applications, count })
}

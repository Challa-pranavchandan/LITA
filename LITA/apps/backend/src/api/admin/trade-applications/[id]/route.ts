import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { TRADE_MODULE } from "../../../../modules/trade"
import TradeModuleService from "../../../../modules/trade/service"
import { z } from "zod"
import { UpdateTradeApplicationSchema } from "../../../middlewares"

type Body = z.infer<typeof UpdateTradeApplicationSchema>

export async function POST(req: MedusaRequest<Body>, res: MedusaResponse) {
  const svc: TradeModuleService = req.scope.resolve(TRADE_MODULE)

  const existing = await svc.retrieveTradeApplication(req.params.id).catch(() => null)

  const application = await svc.updateTradeApplications({
    id: req.params.id,
    status: req.validatedBody.status,
  })

  if (existing?.status !== req.validatedBody.status) {
    try {
      const eventBus: any = req.scope.resolve(Modules.EVENT_BUS)
      if (eventBus) {
        await eventBus.emit({
          name: "trade_application.status_changed",
          data: {
            id: application.id,
            name: application.name,
            email: application.email,
            company: application.company,
            role: application.role,
            status: application.status,
            previous_status: existing?.status,
          },
        })
      }
    } catch (err: any) {
      console.warn(`[trade-applications] Failed to emit status changed event: ${err?.message}`)
    }
  }

  res.json({ application })
}


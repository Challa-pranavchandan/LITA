import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BROADCAST_MODULE } from "../../../../modules/broadcast"
import BroadcastModuleService from "../../../../modules/broadcast/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: BroadcastModuleService = req.scope.resolve(BROADCAST_MODULE)

  // Fetch broadcasts with is_popup_active = true
  const [broadcasts] = await service.listAndCountBroadcasts(
    {
      is_popup_active: true,
      status: "active",
    },
    {
      order: { updated_at: "DESC" },
      take: 20,
    }
  )

  const now = new Date()

  // Filter by scheduling if starts_at / ends_at are set
  const activeBroadcasts = broadcasts.filter((item: any) => {
    if (item.starts_at && new Date(item.starts_at) > now) {
      return false
    }
    if (item.ends_at && new Date(item.ends_at) < now) {
      return false
    }
    return true
  })

  // Separate popup modal and announcement bar
  const popup = activeBroadcasts.find(
    (b: any) => b.popup_type === "modal" || b.popup_type === "both"
  )
  const banner = activeBroadcasts.find(
    (b: any) => b.popup_type === "banner" || b.popup_type === "both"
  )

  return res.json({
    active: activeBroadcasts,
    popup: popup || null,
    banner: banner || null,
  })
}

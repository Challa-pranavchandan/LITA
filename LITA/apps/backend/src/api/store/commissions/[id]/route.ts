import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMMISSION_MODULE } from "../../../../modules/commission"
import CommissionModuleService from "../../../../modules/commission/service"
import { getPresignedDownloadUrl } from "../../../../lib/r2"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Authentication required." })
  }

  const { id } = req.params
  const commissionService: CommissionModuleService = req.scope.resolve(COMMISSION_MODULE)

  const commission = await commissionService.retrieveCommission(id)
  if (!commission || commission.customer_id !== customerId) {
    return res.status(404).json({ message: "Commission request not found." })
  }

  // Retrieve message negotiation history
  const [messages] = await commissionService.listAndCountCommissionMessages(
    { commission_id: id },
    { order: { created_at: "ASC" }, take: 100 }
  )

  // Attach presigned download URLs for images
  let imagesWithUrls: any = commission.images
  if (Array.isArray(commission.images)) {
    imagesWithUrls = await Promise.all(
      commission.images.map(async (img: any) => {
        try {
          const url = await getPresignedDownloadUrl(img.key, 900)
          return { ...img, url }
        } catch {
          return img
        }
      })
    )
  }

  return res.status(200).json({
    commission: { ...commission, images: imagesWithUrls as any },
    messages,
  })
}

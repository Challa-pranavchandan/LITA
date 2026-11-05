import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMMISSION_MODULE } from "../../../../modules/commission"
import CommissionModuleService from "../../../../modules/commission/service"
import { getPresignedPrivateDownloadUrl } from "../../../../lib/r2"
import { CommissionIdSchema } from "../../../schemas/commission"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Authentication required." })
  }

  const parsedId = CommissionIdSchema.safeParse(req.params.id)
  if (!parsedId.success) {
    return res.status(400).json({ message: "Invalid commission ID." })
  }
  const id = parsedId.data
  const commissionService: CommissionModuleService = req.scope.resolve(COMMISSION_MODULE)

  const commission = await commissionService.retrieveCommission(id)
  if (!commission || commission.customer_id !== customerId) {
    return res.status(404).json({ message: "Commission request not found." })
  }

  // Retrieve message negotiation history
  const [messages] = await commissionService.listAndCountCommissionMessages(
    { commission_id: id },
    { order: { created_at: "DESC" }, take: 100 }
  )

  // Attach presigned download URLs for images
  let imagesWithUrls: any = commission.images
  if (Array.isArray(commission.images)) {
    imagesWithUrls = await Promise.all(
      commission.images.map(async (img: any) => ({
        ...img,
        url: await getPresignedPrivateDownloadUrl(img.key, 900),
      }))
    )
  }

  return res.status(200).json({
    commission: { ...commission, images: imagesWithUrls as any },
    messages: messages.reverse(),
  })
}

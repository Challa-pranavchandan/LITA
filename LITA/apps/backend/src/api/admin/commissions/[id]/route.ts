import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { COMMISSION_MODULE } from "../../../../modules/commission"
import CommissionModuleService from "../../../../modules/commission/service"
import { getPresignedDownloadUrl } from "../../../../lib/r2"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const commissionService: CommissionModuleService = req.scope.resolve(COMMISSION_MODULE)
  const customerService: any = req.scope.resolve(Modules.CUSTOMER)

  const commission = await commissionService.retrieveCommission(id)
  if (!commission) {
    return res.status(404).json({ message: "Commission not found." })
  }

  // Resolve customer info
  let customer = null
  try {
    customer = await customerService.retrieveCustomer(commission.customer_id)
  } catch (err) {
    console.warn("[commissions] Could not retrieve customer:", err)
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
    customer,
    messages,
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const commissionService: CommissionModuleService = req.scope.resolve(COMMISSION_MODULE)

  const existing = await commissionService.retrieveCommission(id)
  if (!existing) {
    return res.status(404).json({ message: "Commission not found." })
  }

  const { status, quoted_price, currency_code, admin_notes } = (req.body as any) || {}

  const updatePayload: any = { id }

  if (status !== undefined) {
    const validStatuses = [
      "new",
      "in_discussion",
      "quoted",
      "accepted",
      "converted",
      "rejected",
      "cancelled",
    ]
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status '${status}'. Must be one of: ${validStatuses.join(", ")}`,
      })
    }
    updatePayload.status = status
  }

  if (quoted_price !== undefined) {
    const numPrice = Number(quoted_price)
    if (isNaN(numPrice) || numPrice < 0) {
      return res.status(400).json({ message: "Quoted price must be a valid positive number." })
    }
    updatePayload.quoted_price = numPrice
  }

  if (currency_code !== undefined) {
    updatePayload.currency_code = String(currency_code).toLowerCase()
  }

  if (admin_notes !== undefined) {
    updatePayload.admin_notes = admin_notes
  }

  const updated = await commissionService.updateCommissions(updatePayload)

  return res.status(200).json({ commission: updated })
}

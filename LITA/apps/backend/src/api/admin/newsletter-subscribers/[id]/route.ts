import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INQUIRY_MODULE } from "../../../../modules/inquiry"
import InquiryModuleService from "../../../../modules/inquiry/service"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const inquiryService: InquiryModuleService = req.scope.resolve(INQUIRY_MODULE)
  const { id } = req.params
  const body = req.body as Record<string, any>

  const updateData: Record<string, any> = { id }
  if (body.status) {
    updateData.status = body.status
    if (body.status === "confirmed") {
      updateData.confirmed_at = new Date()
      updateData.unsubscribed_at = null
    } else if (body.status === "unsubscribed") {
      updateData.unsubscribed_at = new Date()
    } else if (body.status === "pending") {
      updateData.confirmed_at = null
      updateData.unsubscribed_at = null
    }
  }

  const updated = await inquiryService.updateNewsletterSubscribers(updateData)
  return res.json({ subscriber: updated, message: "Subscriber updated." })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const inquiryService: InquiryModuleService = req.scope.resolve(INQUIRY_MODULE)
  const { id } = req.params

  await inquiryService.deleteNewsletterSubscribers(id)
  return res.json({ id, object: "newsletter_subscriber", deleted: true })
}

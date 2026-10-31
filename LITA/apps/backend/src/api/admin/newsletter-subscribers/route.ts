import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INQUIRY_MODULE } from "../../../modules/inquiry"
import InquiryModuleService from "../../../modules/inquiry/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const inquiryService: InquiryModuleService = req.scope.resolve(INQUIRY_MODULE)
  const status = req.query.status as string | undefined

  const filters: Record<string, any> = {}
  if (status && status !== "all") {
    filters.status = status
  }

  const subscribers = await inquiryService.listNewsletterSubscribers(filters, {
    order: { created_at: "DESC" },
  })

  return res.json({
    subscribers,
    count: subscribers.length,
  })
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INQUIRY_MODULE } from "../../../modules/inquiry"
import InquiryModuleService from "../../../modules/inquiry/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const inquiryService: InquiryModuleService = req.scope.resolve(INQUIRY_MODULE)
  const status = req.query.status as string | undefined
  const kind = req.query.kind as string | undefined

  const filters: Record<string, any> = {}
  if (status && status !== "all") {
    filters.status = status
  }
  if (kind && kind !== "all") {
    filters.kind = kind
  }

  const inquiries = await inquiryService.listInquiries(filters, {
    order: { created_at: "DESC" },
  })

  res.status(200).json({
    inquiries,
    count: inquiries.length,
  })
}

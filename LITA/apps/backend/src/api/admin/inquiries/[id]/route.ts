import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INQUIRY_MODULE } from "../../../../modules/inquiry"
import InquiryModuleService from "../../../../modules/inquiry/service"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const body = req.body as { status: "new" | "replied" | "archived" }

  const inquiryService: InquiryModuleService = req.scope.resolve(INQUIRY_MODULE)
  const updated = await inquiryService.updateInquiries({
    id,
    status: body.status,
  })

  const inquiry = Array.isArray(updated) ? updated[0] : updated
  res.status(200).json({ inquiry })
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INQUIRY_MODULE } from "../../../modules/inquiry"
import InquiryModuleService from "../../../modules/inquiry/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const inquiryService: InquiryModuleService = req.scope.resolve(INQUIRY_MODULE)
  const status = req.query.status as string | undefined
  const q = (req.query.q as string | undefined)?.trim().toLowerCase()

  const filters: Record<string, any> = {}
  if (status && status !== "all") {
    filters.status = status
  }

  let subscribers = await inquiryService.listNewsletterSubscribers(filters, {
    order: { created_at: "DESC" },
  })

  if (q) {
    subscribers = subscribers.filter((sub) =>
      sub.email.toLowerCase().includes(q)
    )
  }

  return res.json({
    subscribers,
    count: subscribers.length,
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const inquiryService: InquiryModuleService = req.scope.resolve(INQUIRY_MODULE)
  const body = req.body as Record<string, any>

  if (!body.email || typeof body.email !== "string" || !body.email.includes("@")) {
    return res.status(400).json({ message: "A valid email address is required" })
  }

  const normalizedEmail = body.email.trim().toLowerCase()
  const status = body.status === "pending" || body.status === "unsubscribed" ? body.status : "confirmed"
  const existingList = await inquiryService.listNewsletterSubscribers(
    { email: normalizedEmail },
    { take: 1 }
  )

  if (existingList.length > 0) {
    const existing = existingList[0]
    const updated = await inquiryService.updateNewsletterSubscribers({
      id: existing.id,
      status,
      confirmed_at: status === "confirmed" ? new Date() : (status === "pending" ? null : existing.confirmed_at),
      unsubscribed_at: status === "unsubscribed" ? new Date() : null,
      source: body.source || existing.source || "admin_manual",
    })
    return res.json({ subscriber: updated, message: "Subscriber record updated." })
  }

  const subscriber = await inquiryService.createNewsletterSubscribers({
    email: normalizedEmail,
    status,
    source: body.source || "admin_manual",
    confirmed_at: status === "confirmed" ? new Date() : null,
    unsubscribed_at: status === "unsubscribed" ? new Date() : null,
  })

  return res.status(201).json({ subscriber, message: "Subscriber created successfully." })
}

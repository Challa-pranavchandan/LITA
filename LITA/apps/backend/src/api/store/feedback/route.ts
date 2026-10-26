import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { FEEDBACK_MODULE } from "../../../modules/feedback"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = req.body as Record<string, string>
  const file = (req as any).file as Express.Multer.File | undefined

  if (!["feedback", "bug"].includes(body.type) || !body.message?.trim()) {
    return res.status(400).json({ message: "Invalid type or empty message" })
  }
  if (body.website) return res.status(200).json({ ok: true }) // honeypot for bots

  let image_url: string | undefined
  if (file) {
    if (!file.mimetype.startsWith("image/")) {
      return res.status(400).json({ message: "Only images allowed" })
    }
    const fileService = req.scope.resolve(Modules.FILE)
    const uploaded = await fileService.createFiles({
      filename: file.originalname,
      mimeType: file.mimetype,
      content: file.buffer.toString("binary"),
      access: "public",
    })
    image_url = Array.isArray(uploaded) ? uploaded[0]?.url : (uploaded as any)?.url
  }

  const service = req.scope.resolve(FEEDBACK_MODULE)
  const feedback = await service.createFeedbacks({
    type: body.type as "feedback" | "bug",
    message: body.message.trim().slice(0, 3000),
    email: body.email?.trim() || null,
    page_url: body.page_url || null,
    image_url: image_url ?? null,
  })

  res.status(201).json({ feedback })
}

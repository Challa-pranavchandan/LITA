import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { unsubscribeNewsletterWorkflow } from "../../../../workflows/inquiries"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = req.body as Record<string, any>

  if (body.website && body.website.trim().length > 0) {
    return res.status(200).json({ ok: true, unsubscribed: true })
  }

  if (!body.email || typeof body.email !== "string") {
    return res.status(400).json({ message: "A valid email address is required" })
  }

  try {
    await unsubscribeNewsletterWorkflow(req.scope).run({
      input: { email: body.email },
    })

    res.status(200).json({
      ok: true,
      unsubscribed: true,
      message: "You have been successfully unsubscribed from the newsletter.",
    })
  } catch (err: any) {
    res.status(err?.status || 400).json({
      message: err?.message || "Failed to unsubscribe",
    })
  }
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { confirmNewsletterWorkflow } from "../../../../workflows/inquiries"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const token = req.query.token as string | undefined
  const storefrontUrl = (
    process.env.STOREFRONT_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "http://localhost:8000"
  ).replace(/\/$/, "")

  const acceptsHtml = req.headers.accept?.includes("text/html")

  if (!token) {
    if (acceptsHtml) {
      return res.redirect(302, `${storefrontUrl}/newsletter/confirmed?error=missing_token`)
    }
    return res.status(400).json({ message: "Missing confirmation token" })
  }

  try {
    await confirmNewsletterWorkflow(req.scope).run({
      input: { token },
    })

    if (acceptsHtml) {
      return res.redirect(302, `${storefrontUrl}/newsletter/confirmed`)
    }
    return res.status(200).json({ ok: true, confirmed: true })
  } catch (err: any) {
    if (acceptsHtml) {
      return res.redirect(302, `${storefrontUrl}/newsletter/confirmed?error=invalid`)
    }
    return res.status(400).json({
      message: err?.message || "Invalid or expired confirmation token",
    })
  }
}

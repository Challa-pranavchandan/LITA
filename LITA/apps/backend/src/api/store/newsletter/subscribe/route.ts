import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { extractClientIp } from "../../../../lib/ip-hash"
import { verifyTurnstileToken } from "../../../../lib/turnstile"
import { subscribeNewsletterWorkflow } from "../../../../workflows/inquiries"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = req.body as Record<string, any>
  const rawIp = extractClientIp(req)

  // Turnstile verification
  const turnstileToken = body.turnstile_token || body["cf-turnstile-response"]
  const turnstileResult = await verifyTurnstileToken(turnstileToken, rawIp)
  if (!turnstileResult.success) {
    return res.status(400).json({
      message: "Security verification failed. Please refresh and try again.",
      errors: turnstileResult.errorCodes,
    })
  }

  const { result } = await subscribeNewsletterWorkflow(req.scope).run({
    input: {
      email: body.email,
      source: body.source,
      website: body.website,
    },
  })

  if (result.isHoneypot) {
    return res.status(200).json({ ok: true })
  }

  if (result.alreadyConfirmed) {
    return res.status(200).json({
      ok: true,
      already_confirmed: true,
      message: "You are already subscribed to our newsletter.",
    })
  }

  res.status(201).json({
    ok: true,
    message: "Confirmation email sent. Please check your inbox to confirm your subscription.",
  })
}

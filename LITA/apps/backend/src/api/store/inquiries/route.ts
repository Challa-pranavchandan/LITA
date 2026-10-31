import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { extractClientIp, hashIp } from "../../../lib/ip-hash"
import { verifyTurnstileToken } from "../../../lib/turnstile"
import { createInquiryWorkflow } from "../../../workflows/inquiries"

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

  const ipHash = hashIp(rawIp)
  const userAgent = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : null

  const { result } = await createInquiryWorkflow(req.scope).run({
    input: {
      kind: body.kind,
      name: body.name,
      email: body.email,
      phone: body.phone,
      artwork_handle: body.artwork_handle,
      budget: body.budget,
      message: body.message,
      source_url: body.source_url,
      ip_hash: ipHash,
      user_agent: userAgent,
      website: body.website,
      metadata: body.metadata,
    },
  })

  if (result.isHoneypot) {
    return res.status(200).json({ ok: true })
  }

  res.status(201).json({
    ok: true,
    inquiry: {
      id: result.inquiry.id,
      kind: result.inquiry.kind,
      name: result.inquiry.name,
      email: result.inquiry.email,
      status: result.inquiry.status,
      created_at: result.inquiry.created_at,
    },
  })
}

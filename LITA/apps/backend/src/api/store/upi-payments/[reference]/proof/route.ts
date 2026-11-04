import type { MedusaStoreRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { extractClientIp } from "../../../../../lib/ip-hash"
import { verifyTurnstileToken } from "../../../../../lib/turnstile"
import {
  findUpiPaymentByReference,
  hasUpiPaymentAccess,
  isUpiManualEnabled,
  mapUpiPaymentError,
  upiManualNotFound,
} from "../../helpers"
import { submitUpiProofWorkflow } from "../../../../../workflows/upi-payments"

export async function POST(req: MedusaStoreRequest, res: MedusaResponse) {
  if (!isUpiManualEnabled()) {
    return upiManualNotFound(res)
  }

  const referenceCode = req.params.reference
  const payment = await findUpiPaymentByReference(req, referenceCode)
  if (!payment) {
    return res.status(404).json({ message: "UPI payment reference was not found." })
  }
  if (!hasUpiPaymentAccess(req, payment)) {
    return res.status(401).json({ message: "A valid UPI proof token is required." })
  }

  const body = req.validatedBody as {
    utr?: string
    screenshot_key?: string
    payer_vpa?: string
    turnstile_token?: string
    website?: string
  }
  if (body.website?.trim()) {
    return res.status(200).json({ ok: true })
  }

  const turnstile = await verifyTurnstileToken(
    body.turnstile_token,
    extractClientIp(req)
  )
  if (!turnstile.success) {
    return res.status(400).json({
      message: "Security verification failed. Please refresh and try again.",
      errors: turnstile.errorCodes,
    })
  }

  try {
    const { result } = await submitUpiProofWorkflow(req.scope).run({
      input: {
        reference_code: referenceCode,
        utr: body.utr,
        screenshot_key: body.screenshot_key,
        payer_vpa: body.payer_vpa,
      },
    })

    if (result.isHoneypot) {
      return res.status(200).json({ ok: true })
    }

    return res.status(200).json({
      ok: true,
      status: result.status,
      submitted_at: result.submitted_at,
      attempts: result.attempts,
    })
  } catch (error) {
    const mapped = mapUpiPaymentError(error)
    if (mapped.status === 500) {
      req.scope.resolve(ContainerRegistrationKeys.LOGGER).error(
        `[upi-payments] Failed to submit proof for ${referenceCode}: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
    return res.status(mapped.status).json({ message: mapped.message })
  }
}

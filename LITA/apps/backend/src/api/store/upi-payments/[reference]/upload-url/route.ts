import type { MedusaStoreRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getPresignedUploadUrl } from "../../../../../lib/r2"
import {
  findUpiPaymentByReference,
  hasUpiPaymentAccess,
  isUpiManualEnabled,
  upiManualNotFound,
} from "../../helpers"
import crypto from "crypto"

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_FILE_SIZE = 5 * 1024 * 1024
const UPLOADABLE_STATUSES = new Set(["awaiting_proof", "submitted", "rejected"])

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
  if (!UPLOADABLE_STATUSES.has(payment.status)) {
    return res.status(409).json({
      message: "A screenshot cannot be uploaded for this payment status.",
    })
  }
  if (new Date(payment.expires_at).getTime() <= Date.now()) {
    return res.status(410).json({ message: "This UPI payment has expired." })
  }

  const body = req.validatedBody as {
    filename: string
    contentType: string
    size: number
  }
  if (!ALLOWED_MIME_TYPES.includes(body.contentType)) {
    return res.status(400).json({
      message: `Invalid file type. Allowed formats: ${ALLOWED_MIME_TYPES.join(", ")}`,
    })
  }
  if (body.size <= 0 || body.size > MAX_FILE_SIZE) {
    return res.status(400).json({ message: "Screenshot must not exceed 5 MB." })
  }

  const sanitizedFilename = body.filename.replace(/[^\w.-]/g, "_")
  const key = `upi-proofs/${referenceCode}/${crypto.randomUUID()}-${sanitizedFilename}`

  try {
    const url = await getPresignedUploadUrl(key, body.contentType, 300)
    return res.status(200).json({ url, key, expires_in: 300 })
  } catch (error) {
    req.scope.resolve(ContainerRegistrationKeys.LOGGER).error(
      `[upi-payments] Failed to create upload URL for ${referenceCode}: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
    return res.status(500).json({ message: "Failed to generate upload URL." })
  }
}

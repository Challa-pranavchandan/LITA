import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getPresignedUploadUrl } from "../../../../lib/r2"
import crypto from "crypto"

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Authentication required to upload commission references." })
  }

  const { filename, contentType, size } = (req.body as any) || {}

  if (!filename || typeof filename !== "string") {
    return res.status(400).json({ message: "A valid filename is required." })
  }

  if (!contentType || !ALLOWED_MIME_TYPES.includes(contentType)) {
    return res.status(400).json({
      message: `Invalid file type. Allowed formats: ${ALLOWED_MIME_TYPES.join(", ")}`,
    })
  }

  if (!size || typeof size !== "number" || size > MAX_FILE_SIZE) {
    return res.status(400).json({
      message: `File size exceeds the 10MB limit (received ${(size / (1024 * 1024)).toFixed(1)}MB).`,
    })
  }

  // Key format: commissions/{customerId}/{uuid}-{sanitizedFilename}
  const sanitizedFilename = filename.replace(/[^\w.-]/g, "_")
  const key = `commissions/${customerId}/${crypto.randomUUID()}-${sanitizedFilename}`

  try {
    const url = await getPresignedUploadUrl(key, contentType, 300)
    return res.status(200).json({ url, key })
  } catch (error: any) {
    return res.status(500).json({
      message: error?.message || "Failed to generate presigned upload URL.",
    })
  }
}

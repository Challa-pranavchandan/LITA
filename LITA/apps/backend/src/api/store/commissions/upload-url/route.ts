import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getPresignedPrivateUploadUrl, getPresignedPrivateDownloadUrl } from "../../../../lib/r2"
import crypto from "crypto"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Authentication required to upload commission references." })
  }

  const { filename, contentType, size } = req.body as {
    filename: string
    contentType: string
    size: number
  }

  // Key format: commissions/{customerId}/{uuid}-{sanitizedFilename}
  const sanitizedFilename = filename.replace(/[^\w.-]/g, "_")
  const key = `commissions/${customerId}/${crypto.randomUUID()}-${sanitizedFilename}`

  try {
    const url = await getPresignedPrivateUploadUrl(key, contentType, size, 300)
    let downloadUrl: string | undefined
    try {
      downloadUrl = await getPresignedPrivateDownloadUrl(key, 86400 * 7)
    } catch {
      // fallback
    }
    return res.status(200).json({ url, key, downloadUrl })
  } catch (error: any) {
    console.error("[commissions] Failed to create private image upload URL:", error)
    return res.status(500).json({
      message: error?.message || "Failed to generate presigned upload URL.",
    })
  }
}

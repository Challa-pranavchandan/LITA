import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMMISSION_MODULE } from "../../../modules/commission"
import CommissionModuleService from "../../../modules/commission/service"
import { getPresignedDownloadUrl } from "../../../lib/r2"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Authentication required to submit a commission request." })
  }

  const {
    title,
    idea,
    requirements,
    medium,
    size,
    budget,
    deadline,
    images,
  } = (req.body as any) || {}

  if (!title || typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ message: "Commission title is required." })
  }

  if (!idea || typeof idea !== "string" || !idea.trim()) {
    return res.status(400).json({ message: "Description/idea of the artwork is required." })
  }

  // Security validation: ensure all reference image keys belong to this customer
  const validatedImages: Array<{ key: string; filename: string; mime: string; size: number }> = []
  if (Array.isArray(images)) {
    const expectedPrefix = `commissions/${customerId}/`
    for (const img of images) {
      if (!img.key || typeof img.key !== "string" || !img.key.startsWith(expectedPrefix)) {
        return res.status(400).json({
          message: "Security violation: Invalid or unauthorized image key path.",
        })
      }
      validatedImages.push({
        key: img.key,
        filename: String(img.filename || "reference"),
        mime: String(img.mime || "image/jpeg"),
        size: Number(img.size || 0),
      })
    }
  }

  const commissionService: CommissionModuleService = req.scope.resolve(COMMISSION_MODULE)

  const created = await commissionService.createCommissions({
    customer_id: customerId,
    title: title.trim(),
    idea: idea.trim(),
    requirements: requirements?.trim() || null,
    medium: medium?.trim() || null,
    size: size?.trim() || null,
    budget: budget ? Number(budget) : null,
    deadline: deadline ? new Date(deadline) : null,
    status: "new",
    currency_code: "inr",
    images: validatedImages as any,
  })

  return res.status(201).json({ commission: created })
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Authentication required." })
  }

  const commissionService: CommissionModuleService = req.scope.resolve(COMMISSION_MODULE)

  const [commissions, count] = await commissionService.listAndCountCommissions(
    { customer_id: customerId },
    { order: { created_at: "DESC" }, take: 50 }
  )

  // Attach presigned download URLs for private images
  const commissionsWithUrls = await Promise.all(
    commissions.map(async (com) => {
      if (Array.isArray(com.images)) {
        const imagesWithUrls = await Promise.all(
          com.images.map(async (img: any) => {
            try {
              const url = await getPresignedDownloadUrl(img.key, 900)
              return { ...img, url }
            } catch {
              return img
            }
          })
        )
        return { ...com, images: imagesWithUrls as any }
      }
      return com
    })
  )

  return res.status(200).json({
    commissions: commissionsWithUrls,
    count,
  })
}

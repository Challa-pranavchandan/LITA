import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMMISSION_MODULE } from "../../../modules/commission"
import CommissionModuleService from "../../../modules/commission/service"
import { getPresignedDownloadUrl } from "../../../lib/r2"
import { getCharcoalPortraitPrice } from "../../../lib/charcoal-portrait-pricing"

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
    charcoal_portrait,
  } = (req.body as any) || {}

  if (!title || typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ message: "Commission title is required." })
  }

  if (!idea || typeof idea !== "string" || !idea.trim()) {
    return res.status(400).json({ message: "Description/idea of the artwork is required." })
  }

  let fixedPortraitPrice: number | null = null
  if (charcoal_portrait !== undefined) {
    fixedPortraitPrice = getCharcoalPortraitPrice(
      charcoal_portrait?.size,
      charcoal_portrait?.person_count
    )
    if (fixedPortraitPrice === null) {
      return res.status(400).json({
        message: "Choose A4 or A3 and enter a valid whole number of people.",
      })
    }
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
    requirements:
      fixedPortraitPrice === null
        ? requirements?.trim() || null
        : [
            `Fixed-price charcoal portrait: ${charcoal_portrait.person_count} person(s), ${charcoal_portrait.size}.`,
            `Total: ₹${fixedPortraitPrice}.`,
            requirements?.trim(),
          ]
            .filter(Boolean)
            .join(" "),
    medium: fixedPortraitPrice === null ? medium?.trim() || null : "Charcoal Portrait",
    size:
      fixedPortraitPrice === null
        ? size?.trim() || null
        : `${charcoal_portrait.size} · ${charcoal_portrait.person_count} ${
            charcoal_portrait.person_count === 1 ? "person" : "people"
          }`,
    budget: fixedPortraitPrice ?? (budget ? Number(budget) : null),
    deadline: deadline ? new Date(deadline) : null,
    status: fixedPortraitPrice === null ? "new" : "quoted",
    quoted_price: fixedPortraitPrice,
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

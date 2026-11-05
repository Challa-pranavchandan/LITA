import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMMISSION_MODULE } from "../../../modules/commission"
import CommissionModuleService from "../../../modules/commission/service"
import {
  getCommissionImageMetadata,
  getPresignedPrivateDownloadUrl,
} from "../../../lib/r2"
import { getCharcoalPortraitPrice } from "../../../lib/charcoal-portrait-pricing"
import { emitCommissionStatusChanged } from "../../../lib/commission-status"

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
  } = req.body as any

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
  if (images) {
    const expectedPrefix = `commissions/${customerId}/`
    for (const image of images) {
      if (!image.key.startsWith(expectedPrefix)) {
        return res.status(400).json({
          message: "Reference images must belong to the signed-in customer.",
        })
      }

      let actual: Awaited<ReturnType<typeof getCommissionImageMetadata>>
      try {
        actual = await getCommissionImageMetadata(image.key)
      } catch (error: any) {
        if (error?.name === "NotFound" || error?.name === "NoSuchKey") {
          return res.status(400).json({
            message: `Reference image '${image.filename}' has not finished uploading.`,
          })
        }
        throw error
      }
      if (
        actual.contentLength !== image.size ||
        actual.contentType !== image.mime ||
        actual.imageMime !== image.mime
      ) {
        return res.status(400).json({
          message: `Reference image '${image.filename}' does not match the uploaded image type or size.`,
        })
      }
      validatedImages.push(image)
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
    images: validatedImages as unknown as Record<string, unknown>,
  })

  await emitCommissionStatusChanged(req.scope, null, created)
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
          com.images.map(async (img: any) => ({
            ...img,
            url: await getPresignedPrivateDownloadUrl(img.key, 900),
          }))
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

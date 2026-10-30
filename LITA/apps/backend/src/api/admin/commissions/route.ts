import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { COMMISSION_MODULE } from "../../../modules/commission"
import CommissionModuleService from "../../../modules/commission/service"
import { getPresignedDownloadUrl } from "../../../lib/r2"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const commissionService: CommissionModuleService = req.scope.resolve(COMMISSION_MODULE)
  const customerService: any = req.scope.resolve(Modules.CUSTOMER)

  const { status, q, limit = 50, offset = 0 } = (req.query as any) || {}

  const filters: any = {}
  if (status && status !== "all") {
    filters.status = status
  }

  const [commissions, count] = await commissionService.listAndCountCommissions(
    filters,
    {
      order: { created_at: "DESC" },
      take: Number(limit),
      skip: Number(offset),
    }
  )

  // Fetch unique customer IDs to resolve customer profiles in batch
  const customerIds = Array.from(new Set(commissions.map((c) => c.customer_id).filter(Boolean)))
  let customerMap: Record<string, { id: string; email: string; first_name?: string; last_name?: string; phone?: string }> = {}

  if (customerIds.length > 0) {
    try {
      const [customers] = await customerService.listAndCountCustomers(
        { id: customerIds },
        { take: customerIds.length }
      )
      for (const cus of customers) {
        customerMap[cus.id] = cus
      }
    } catch (err) {
      console.warn("[commissions] Could not batch resolve customers:", err)
    }
  }

  // Attach customer details and presigned image download URLs
  const enrichedCommissions = await Promise.all(
    commissions.map(async (com) => {
      let imagesWithUrls: any = com.images
      if (Array.isArray(com.images)) {
        imagesWithUrls = await Promise.all(
          com.images.map(async (img: any) => {
            try {
              const url = await getPresignedDownloadUrl(img.key, 900)
              return { ...img, url }
            } catch {
              return img
            }
          })
        )
      }

      return {
        ...com,
        customer: customerMap[com.customer_id] || { id: com.customer_id, email: "Unknown" },
        images: imagesWithUrls as any,
      }
    })
  )

  // Optional text query filter for title or client email/name
  let filteredCommissions = enrichedCommissions
  if (q && typeof q === "string" && q.trim()) {
    const queryLower = q.toLowerCase().trim()
    filteredCommissions = enrichedCommissions.filter((c: any) => {
      const titleMatch = c.title?.toLowerCase().includes(queryLower)
      const emailMatch = c.customer?.email?.toLowerCase().includes(queryLower)
      const nameMatch = `${c.customer?.first_name || ""} ${c.customer?.last_name || ""}`
        .toLowerCase()
        .includes(queryLower)
      const idMatch = c.id?.toLowerCase().includes(queryLower)
      return titleMatch || emailMatch || nameMatch || idMatch
    })
  }

  return res.status(200).json({
    commissions: filteredCommissions,
    count: filteredCommissions.length,
    total: count,
  })
}

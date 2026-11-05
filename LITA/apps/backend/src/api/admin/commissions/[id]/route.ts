import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { COMMISSION_MODULE } from "../../../../modules/commission"
import CommissionModuleService from "../../../../modules/commission/service"
import { getPresignedPrivateDownloadUrl } from "../../../../lib/r2"
import {
  assertCommissionTransition,
  emitCommissionStatusChanged,
  type CommissionStatus,
} from "../../../../lib/commission-status"
import { CommissionIdSchema } from "../../../schemas/commission"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const parsedId = CommissionIdSchema.safeParse(req.params.id)
  if (!parsedId.success) {
    return res.status(400).json({ message: "Invalid commission ID." })
  }
  const id = parsedId.data
  const commissionService: CommissionModuleService = req.scope.resolve(COMMISSION_MODULE)
  const customerService: any = req.scope.resolve(Modules.CUSTOMER)

  const commission = await commissionService.retrieveCommission(id)
  if (!commission) {
    return res.status(404).json({ message: "Commission not found." })
  }

  // Resolve customer info
  let customer = null
  try {
    customer = await customerService.retrieveCustomer(commission.customer_id)
  } catch (err) {
    console.warn("[commissions] Could not retrieve customer:", err)
  }

  // Retrieve message negotiation history
  const [messages] = await commissionService.listAndCountCommissionMessages(
    { commission_id: id },
    { order: { created_at: "DESC" }, take: 100 }
  )

  // Attach presigned download URLs for images
  let imagesWithUrls: any = commission.images
  if (Array.isArray(commission.images)) {
    imagesWithUrls = await Promise.all(
      commission.images.map(async (img: any) => ({
        ...img,
        url: await getPresignedPrivateDownloadUrl(img.key, 900),
      }))
    )
  }

  return res.status(200).json({
    commission: { ...commission, images: imagesWithUrls as any },
    customer,
    messages: messages.reverse(),
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsedId = CommissionIdSchema.safeParse(req.params.id)
  if (!parsedId.success) {
    return res.status(400).json({ message: "Invalid commission ID." })
  }
  const id = parsedId.data
  const commissionService: CommissionModuleService = req.scope.resolve(COMMISSION_MODULE)

  const existing = await commissionService.retrieveCommission(id)
  if (!existing) {
    return res.status(404).json({ message: "Commission not found." })
  }

  const { status, quoted_price, currency_code, admin_notes } = req.body as any

  const updatePayload: any = { id }

  if (status !== undefined) {
    if (
      status !== existing.status &&
      ["awaiting_payment", "in_production", "awaiting_final_payment", "paid"].includes(status)
    ) {
      return res.status(400).json({
        message: "Payment lifecycle statuses can only be changed by the commission payment workflow.",
      })
    }
    if (status !== existing.status) {
      try {
        assertCommissionTransition(
          existing.status as CommissionStatus,
          status as CommissionStatus
        )
      } catch (error: any) {
        return res.status(400).json({ message: error.message })
      }
    }
    updatePayload.status = status
  }

  if (quoted_price !== undefined) {
    if (
      [
        "accepted",
        "awaiting_payment",
        "in_production",
        "awaiting_final_payment",
        "paid",
      ].includes(existing.status) &&
      quoted_price !== existing.quoted_price
    ) {
      return res.status(400).json({
        message: "The quote cannot be changed after the customer accepts it.",
      })
    }
    if (existing.medium === "Charcoal Portrait" && quoted_price !== existing.quoted_price) {
      return res.status(400).json({
        message: "Fixed-price charcoal portrait quotes cannot be changed.",
      })
    }
    updatePayload.quoted_price = quoted_price
  }

  const resultingQuote = quoted_price ?? existing.quoted_price
  if (
    status === "quoted" &&
    (typeof resultingQuote !== "number" ||
      !Number.isFinite(resultingQuote) ||
    resultingQuote < 2)
  ) {
    return res.status(400).json({
    message: "A quote of at least 2 is required before marking the commission quoted.",
    })
  }

  if (currency_code !== undefined) {
    updatePayload.currency_code = currency_code
  }

  if (admin_notes !== undefined) {
    updatePayload.admin_notes = admin_notes
  }

  const updated = await commissionService.updateCommissions(updatePayload)

  await emitCommissionStatusChanged(
    req.scope,
    existing.status as CommissionStatus,
    updated
  )

  return res.status(200).json({ commission: updated })
}

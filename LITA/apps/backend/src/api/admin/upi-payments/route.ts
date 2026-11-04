import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { getPresignedDownloadUrl } from "../../../lib/r2"
import {
  isUpiManualEnabled,
  upiManualNotFound,
} from "../../store/upi-payments/helpers"
import type { UpipaymentsService } from "../../../workflows/upi-payments"

const STATUSES = [
  "awaiting_proof",
  "submitted",
  "verified",
  "rejected",
  "expired",
] as const

type UpipaymentsAdminService = UpipaymentsService & {
  listAndCountUpiPayments: (
    filters: { status?: string },
    config?: {
      order?: { created_at: "DESC" }
      take?: number
      skip?: number
    }
  ) => Promise<[Array<{
    id: string
    reference_code: string
    order_id: string | null
    email: string
    amount: number
    currency_code: string
    status: string
    utr: string | null
    payer_vpa: string | null
    screenshot_key: string | null
    submitted_at: Date | null
    expires_at: Date
    created_at: Date
    reject_reason: string | null
  }>, number]>
}

type AdminQuery = {
  graph: (input: Record<string, unknown>) => Promise<{
    data?: Array<{
      id: string
      display_id?: number
      total: number | string
      currency_code: string
    }>
  }>
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  if (!isUpiManualEnabled()) {
    return upiManualNotFound(res)
  }

  const rawStatus = req.query.status
  const status = typeof rawStatus === "string" ? rawStatus : "all"
  if (status !== "all" && !STATUSES.includes(status as (typeof STATUSES)[number])) {
    return res.status(400).json({ message: "Invalid UPI payment status filter." })
  }
  const rawQuery = req.query.q
  const search = typeof rawQuery === "string" ? rawQuery.trim().toLowerCase() : ""

  const paymentService = req.scope.resolve<UpipaymentsAdminService>("upi_payment")
  const query = req.scope.resolve<AdminQuery>(ContainerRegistrationKeys.QUERY)

  try {
    const [allPayments] = await paymentService.listAndCountUpiPayments(
      {},
      { order: { created_at: "DESC" }, take: 10000 }
    )
    const statusCounts = await Promise.all(
      STATUSES.map(async (paymentStatus) => {
        const [, count] = await paymentService.listAndCountUpiPayments(
          { status: paymentStatus },
          { take: 1 }
        )
        return [paymentStatus, count] as const
      })
    )

    const filtered = allPayments.filter((payment) => {
      if (status !== "all" && payment.status !== status) return false
      if (!search) return true
      return [
        payment.reference_code,
        payment.email,
        payment.utr ?? "",
      ].some((value) => value.toLowerCase().includes(search))
    })

    const orderIds = Array.from(
      new Set(filtered.map((payment) => payment.order_id).filter(
        (id): id is string => Boolean(id)
      ))
    )
    const orders = orderIds.length
      ? (await query.graph({
          entity: "order",
          fields: ["id", "display_id", "total", "currency_code"],
          filters: { id: orderIds },
        })).data ?? []
      : []
    const orderById = new Map(orders.map((order) => [order.id, order]))

    const payments = await Promise.all(
      filtered.map(async (payment) => {
        const order = payment.order_id
          ? orderById.get(payment.order_id)
          : undefined
        const screenshotUrl = payment.screenshot_key
          ? await getPresignedDownloadUrl(payment.screenshot_key, 600)
          : null
        return {
          ...payment,
          order_display_id: order?.display_id ?? null,
          order_total: order ? Number(order.total) : null,
          order_currency_code: order?.currency_code ?? payment.currency_code,
          screenshot_url: screenshotUrl,
        }
      })
    )

    return res.status(200).json({
      payments,
      count: payments.length,
      total: allPayments.length,
      counts: Object.fromEntries(statusCounts),
    })
  } catch (error) {
    req.scope.resolve(ContainerRegistrationKeys.LOGGER).error(
      `[upi-payments] Failed to load admin list: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
    if (error instanceof MedusaError) {
      return res.status(400).json({ message: error.message })
    }
    return res.status(500).json({ message: "Failed to load UPI payments." })
  }
}

import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"

export type CommissionStatus =
  | "new"
  | "in_discussion"
  | "quoted"
  | "accepted"
  | "awaiting_payment"
  | "paid"
  | "converted"
  | "rejected"
  | "cancelled"

const allowedTransitions: Record<CommissionStatus, CommissionStatus[]> = {
  new: ["in_discussion", "rejected", "cancelled"],
  in_discussion: ["quoted", "rejected", "cancelled"],
  quoted: ["in_discussion", "accepted", "rejected", "cancelled"],
  accepted: ["awaiting_payment", "cancelled"],
  awaiting_payment: ["paid", "cancelled"],
  paid: [],
  converted: [],
  rejected: [],
  cancelled: [],
}

export function assertCommissionTransition(
  current: CommissionStatus,
  next: CommissionStatus
): void {
  if (!allowedTransitions[current]?.includes(next)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Commission cannot transition from '${current}' to '${next}'.`
    )
  }
}

export function assertCommissionCanConvert(commission: {
  status: CommissionStatus
  order_id?: string | null
  quoted_price?: number | null
}): void {
  if (commission.order_id) {
    throw new MedusaError(
      MedusaError.Types.CONFLICT,
      `Commission is already converted to order (${commission.order_id}).`
    )
  }
  if (commission.status !== "accepted") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Only commissions with status 'accepted' can be converted to an order. Current status: ${commission.status}`
    )
  }
  if (
    typeof commission.quoted_price !== "number" ||
    !Number.isSafeInteger(commission.quoted_price) ||
    commission.quoted_price <= 0
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Commission must have a valid quoted price greater than 0 before converting to an order."
    )
  }
  assertCommissionTransition(commission.status, "awaiting_payment")
}

export function assertCommissionPaymentCompletion(
  commission: {
    status: CommissionStatus
    paid_at?: Date | string | null
    payment_reference?: string | null
  },
  paymentReference: string
): boolean {
  if (commission.status === "paid" && commission.paid_at) {
    if (commission.payment_reference !== paymentReference) {
      throw new MedusaError(
        MedusaError.Types.CONFLICT,
        "Commission was already paid with a different Razorpay payment."
      )
    }
    return true
  }
  if (commission.status !== "awaiting_payment") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Commission status is '${commission.status}'. Payment can only complete for commissions awaiting payment.`
    )
  }
  return false
}

export async function emitCommissionStatusChanged(
  container: any,
  previousStatus: CommissionStatus | null,
  commission: {
    id: string
    customer_id: string
    title: string
    status: CommissionStatus
    quoted_price?: number | null
    currency_code?: string
    admin_notes?: string | null
    order_id?: string | null
    payment_reference?: string | null
  }
): Promise<void> {
  if (previousStatus === commission.status) return

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    const eventBus = container.resolve(Modules.EVENT_BUS)
    await eventBus.emit({
      name: "commission.status_changed",
      data: {
        id: commission.id,
        customer_id: commission.customer_id,
        title: commission.title,
        status: commission.status,
        previous_status: previousStatus,
        quoted_price: commission.quoted_price,
        currency_code: commission.currency_code,
        admin_notes: commission.admin_notes,
        order_id: commission.order_id,
        payment_reference: commission.payment_reference,
      },
    })
  } catch (error) {
    logger.error(
      `[commissions] Failed to emit status change for ${commission.id}: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }
}

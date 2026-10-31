import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  OrderStatus,
} from "@medusajs/framework/utils"
import {
  addOrderTransactionStep,
  capturePaymentWorkflow,
  convertDraftOrderWorkflow,
} from "@medusajs/core-flows"
import { COMMISSION_MODULE } from "../modules/commission"
import CommissionModuleService from "../modules/commission/service"

export type CompleteCommissionPaymentInput = {
  session_id: string
  razorpay_payment_id: string
  razorpay_order_id?: string
  razorpay_signature?: string
  webhook_verified?: boolean
  commission_id?: string
}

/* ---------------- STEP 1: Resolve Context ---------------- */

export const resolveCommissionOrderPaymentContextStep = createStep(
  "resolve-commission-order-payment-context",
  async (input: CompleteCommissionPaymentInput, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const query: any = container.resolve(ContainerRegistrationKeys.QUERY)
    const commissionService: CommissionModuleService =
      container.resolve(COMMISSION_MODULE)

    // 1. Retrieve payment session
    const { data: sessions } = await query.graph({
      entity: "payment_session",
      fields: ["id", "data", "status", "payment_collection_id", "amount", "currency_code"],
      filters: { id: input.session_id },
    })

    if (!sessions || sessions.length === 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Payment session ${input.session_id} not found.`
      )
    }

    const session = sessions[0]

    // 2. Query order linked to this payment collection
    const { data: orderPayCols } = await query.graph({
      entity: "order_payment_collection",
      fields: ["order_id"],
      filters: { payment_collection_id: session.payment_collection_id },
    })

    const orderId = orderPayCols?.[0]?.order_id
    if (!orderId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `No order linked to payment collection ${session.payment_collection_id}.`
      )
    }

    // 3. Retrieve order
    const { data: orders } = await query.graph({
      entity: "order",
      fields: ["id", "status", "is_draft_order", "total", "currency_code", "email"],
      filters: { id: orderId },
    })

    const order = orders?.[0]
    if (!order) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Order ${orderId} not found.`
      )
    }

    // 4. Retrieve commission
    let commission: any = null
    if (input.commission_id) {
      commission = await commissionService.retrieveCommission(input.commission_id)
    } else {
      const [commissions] = await commissionService.listAndCountCommissions(
        { order_id: orderId },
        { take: 1 }
      )
      commission = commissions?.[0]
    }

    if (!commission) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `No commission linked to order ${orderId}.`
      )
    }

    // 5. Check if already paid
    if (commission.status === "paid" && commission.paid_at) {
      logger.info(
        `[complete-commission-payment] Commission ${commission.id} is already paid. Skipping double execution.`
      )
      return new StepResponse({
        alreadyPaid: true,
        session,
        order,
        commission,
      })
    }

    return new StepResponse({
      alreadyPaid: false,
      session,
      order,
      commission,
    })
  }
)

/* ---------------- STEP 2: Authorize & Capture Payment ---------------- */

type AuthorizeAndCaptureInput = {
  context: any
  input: CompleteCommissionPaymentInput
}

export const authorizeAndCaptureCommissionStep = createStep(
  "authorize-and-capture-commission-payment",
  async ({ context, input }: AuthorizeAndCaptureInput, { container }) => {
    if (context.alreadyPaid) {
      return new StepResponse({ paymentId: context.commission.payment_reference })
    }

    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const paymentModule: any = container.resolve(Modules.PAYMENT)
    const session = context.session

    // Update session data with verified payment IDs and signature/webhook flags
    const currentData = (session.data ?? {}) as Record<string, any>
    const updatedData = {
      ...currentData,
      razorpay_payment_id: input.razorpay_payment_id,
      razorpay_order_id: input.razorpay_order_id || currentData.razorpay_order_id,
      ...(input.razorpay_signature
        ? { razorpay_signature: input.razorpay_signature }
        : {}),
      ...(input.webhook_verified ? { webhook_verified: true } : {}),
    }

    await paymentModule.updatePaymentSession({
      id: session.id,
      data: updatedData,
      ...(input.webhook_verified ? { context: { is_reconcile: true } } : {}),
    })

    // Authorize payment session
    const authorizedPayment = await paymentModule.authorizePaymentSession(
      session.id,
      {}
    )

    if (!authorizedPayment?.id) {
      throw new MedusaError(
        MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
        `Failed to authorize Razorpay payment session ${session.id}.`
      )
    }

    // Capture payment
    const captured = await capturePaymentWorkflow(container).run({
      input: {
        payment_id: authorizedPayment.id,
        amount: session.amount,
      },
    })

    // Record order transaction for captured payment
    try {
      const query: any = container.resolve(ContainerRegistrationKeys.QUERY)
      const { data: payments } = await query.graph({
        entity: "payment",
        fields: ["id", "captures.id", "captures.amount"],
        filters: { id: authorizedPayment.id },
      })
      const captureId = payments?.[0]?.captures?.[0]?.id

      await addOrderTransactionStep([
        {
          order_id: context.order.id,
          amount: session.amount,
          currency_code: session.currency_code,
          reference_id: captureId || authorizedPayment.id,
          reference: "capture",
        },
      ])
    } catch (txErr: any) {
      logger.warn(
        `[complete-commission-payment] Failed to add order transaction: ${txErr?.message}`
      )
    }

    logger.info(
      `[complete-commission-payment] Successfully authorized and captured payment ${input.razorpay_payment_id} for order ${context.order.id}.`
    )

    return new StepResponse({ paymentId: authorizedPayment.id })
  }
)

/* ---------------- STEP 3: Convert Draft Order to Pending Order ---------------- */

export const convertCommissionDraftOrderToPendingStep = createStep(
  "convert-commission-draft-order-to-pending",
  async (context: any, { container }) => {
    if (context.alreadyPaid) {
      return new StepResponse(context.order)
    }

    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    if (
      context.order.is_draft_order ||
      context.order.status === OrderStatus.DRAFT
    ) {
      try {
        const { result: convertedOrder } = await convertDraftOrderWorkflow(
          container
        ).run({
          input: { id: context.order.id },
        })
        logger.info(
          `[complete-commission-payment] Converted draft order ${context.order.id} to placed order.`
        )
        return new StepResponse(convertedOrder)
      } catch (err: any) {
        logger.error(
          `[complete-commission-payment] Failed to convert draft order ${context.order.id}: ${err?.message}`
        )
      }
    }

    return new StepResponse(context.order)
  }
)

/* ---------------- STEP 4: Mark Commission as Paid & Emit Events ---------------- */

type MarkPaidInput = {
  commission_id: string
  payment_reference: string
}

export const markCommissionPaidStep = createStep(
  "mark-commission-paid",
  async ({ commission_id, payment_reference }: MarkPaidInput, { container }) => {
    const commissionService: CommissionModuleService =
      container.resolve(COMMISSION_MODULE)

    const updated = await commissionService.updateCommissions({
      id: commission_id,
      status: "paid",
      paid_at: new Date(),
      payment_reference,
      admin_notes: `Payment confirmed via Razorpay (${payment_reference})`,
    })

    try {
      const eventBus: any = container.resolve(Modules.EVENT_BUS)
      if (eventBus) {
        await eventBus.emit({
          name: "commission.status_changed",
          data: {
            id: updated.id,
            customer_id: updated.customer_id,
            title: updated.title,
            status: "paid",
            previous_status: "awaiting_payment",
            quoted_price: updated.quoted_price,
            currency_code: updated.currency_code,
            order_id: updated.order_id,
            payment_reference,
          },
        })

        await eventBus.emit({
          name: "commission.payment_received",
          data: {
            id: updated.id,
            customer_id: updated.customer_id,
            title: updated.title,
            quoted_price: updated.quoted_price,
            currency_code: updated.currency_code,
            order_id: updated.order_id,
            payment_reference,
            paid_at: updated.paid_at,
          },
        })
      }
    } catch (err: any) {
      console.warn(`[commissions] Failed to emit payment received events: ${err?.message}`)
    }

    return new StepResponse(updated)
  }
)

/* ---------------- MAIN WORKFLOW ---------------- */

export const completeCommissionPaymentWorkflow = createWorkflow(
  "complete-commission-payment",
  (input: CompleteCommissionPaymentInput) => {
    const context = resolveCommissionOrderPaymentContextStep(input)
    authorizeAndCaptureCommissionStep({ context, input })
    const finalOrder = convertCommissionDraftOrderToPendingStep(context)
    const paidCommission = markCommissionPaidStep({
      commission_id: context.commission.id,
      payment_reference: input.razorpay_payment_id,
    })

    return new WorkflowResponse({
      commission: paidCommission,
      order: finalOrder,
    })
  }
)

export default completeCommissionPaymentWorkflow

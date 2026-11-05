import { randomUUID } from "crypto"
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
import {
  assertCommissionPaymentCompletion,
  assertCommissionTransition,
  emitCommissionStatusChanged,
  type CommissionStatus,
} from "../lib/commission-status"

export type CompleteCommissionPaymentInput = {
  session_id: string
  razorpay_payment_id: string
  razorpay_order_id?: string
  razorpay_signature?: string
  webhook_verified?: boolean
  commission_id?: string
}

type CommissionPaymentLockingService = {
  acquire: (key: string, args?: { ownerId?: string; expire?: number }) => Promise<void>
  release: (key: string, args?: { ownerId?: string }) => Promise<boolean>
}

type LockedPaymentInput = CompleteCommissionPaymentInput & {
  payment_lock?: { commission_id: string; owner_id: string }
}

const acquireCommissionPaymentLockStep = createStep(
  "acquire-commission-payment-lock",
  async (
    input: { commission_id: string },
    { container }
  ): Promise<
    StepResponse<
      { commission_id: string; owner_id: string },
      { commission_id: string; owner_id: string }
    >
  > => {
    const locking = container.resolve<CommissionPaymentLockingService>(Modules.LOCKING)
    const ownerId = randomUUID()
    await locking.acquire(`commission_payment:${input.commission_id}`, {
      ownerId,
      expire: 900,
    })
    return new StepResponse(
      { commission_id: input.commission_id, owner_id: ownerId },
      { commission_id: input.commission_id, owner_id: ownerId }
    )
  },
  async (lock, { container }) => {
    if (!lock) return
    const locking = container.resolve<CommissionPaymentLockingService>(Modules.LOCKING)
    await locking.release(`commission_payment:${lock.commission_id}`, {
      ownerId: lock.owner_id,
    })
  }
)

const releaseCommissionPaymentLockStep = createStep(
  "release-commission-payment-lock",
  async (
    input: {
      commission_id: string
      owner_id: string
      commission: any
      order: any
    },
    { container }
  ) => {
    const locking = container.resolve<CommissionPaymentLockingService>(Modules.LOCKING)
    const released = await locking.release(
      `commission_payment:${input.commission_id}`,
      { ownerId: input.owner_id }
    )
    if (!released) {
      const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
      logger.warn(
        `[commissions] Payment lock for ${input.commission_id} expired or was not owned by this workflow.`
      )
    }
    return new StepResponse({
      commission: input.commission,
      order: input.order,
    })
  }
)

/* ---------------- STEP 1: Resolve Context ---------------- */

export const resolveCommissionOrderPaymentContextStep = createStep(
  "resolve-commission-order-payment-context",
  async (input: LockedPaymentInput, { container }) => {
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

    if (commission.order_id !== orderId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Payment session is not linked to this commission."
      )
    }

    const storedRazorpayOrderId = (session.data as Record<string, any> | undefined)
      ?.razorpay_order_id
    if (
      (input.razorpay_order_id &&
        storedRazorpayOrderId !== input.razorpay_order_id) ||
      (!input.webhook_verified && !storedRazorpayOrderId)
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Razorpay order does not match the commission payment session."
      )
    }

    // 5. Check if already paid
    const alreadyPaid = assertCommissionPaymentCompletion(
      commission,
      input.razorpay_payment_id
    )
    if (alreadyPaid) {
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

const revalidateCommissionPaymentContextStep = createStep(
  "revalidate-commission-payment-context",
  async (
    {
      context,
      payment_lock,
      payment_reference,
    }: {
      context: any
      payment_lock: { commission_id: string; owner_id: string }
      payment_reference: string
    },
    { container }
  ) => {
    const commissionService: CommissionModuleService =
      container.resolve(COMMISSION_MODULE)
    const commission = await commissionService.retrieveCommission(
      payment_lock.commission_id
    )
    if (!commission || commission.order_id !== context.order.id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Commission changed while payment was being prepared."
      )
    }

    const alreadyPaid = assertCommissionPaymentCompletion(
      commission,
      payment_reference
    )
    return new StepResponse({
      ...context,
      commission,
      alreadyPaid,
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
  async (
    { context, authorization }: { context: any; authorization: { paymentId: string } },
    { container }
  ) => {
    if (!authorization.paymentId) {
      throw new MedusaError(
        MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
        "Commission payment has not been authorized and captured."
      )
    }

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
        throw err
      }
    }

    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Order ${context.order.id} is not a draft order and cannot be completed as a commission payment.`
    )
  }
)

/* ---------------- STEP 4: Mark Commission as Paid & Emit Events ---------------- */

type MarkPaidInput = {
  commission_id: string
  payment_reference: string
  authorization: { paymentId: string }
  order: any
}

export const markCommissionPaidStep = createStep(
  "mark-commission-paid",
  async (
    { commission_id, payment_reference, authorization, order }: MarkPaidInput,
    { container }
  ) => {
    if (!authorization.paymentId || order.is_draft_order || order.status === OrderStatus.DRAFT) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Commission payment cannot be marked paid before verified payment capture and order conversion."
      )
    }
    const commissionService: CommissionModuleService =
      container.resolve(COMMISSION_MODULE)
    const commission = await commissionService.retrieveCommission(commission_id)
    if (!commission) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Commission ${commission_id} was not found.`
      )
    }
    if (commission.status === "paid" && commission.paid_at) {
      if (commission.payment_reference !== payment_reference) {
        throw new MedusaError(
          MedusaError.Types.CONFLICT,
          "Commission was already paid with a different Razorpay payment."
        )
      }
      return new StepResponse(commission)
    }
    assertCommissionTransition(
      commission.status as CommissionStatus,
      "paid"
    )

    const updated = await commissionService.updateCommissions({
      id: commission_id,
      status: "paid",
      paid_at: new Date(),
      payment_reference,
      admin_notes: `Payment confirmed via Razorpay (${payment_reference})`,
    })

    await emitCommissionStatusChanged(
      container,
      commission.status as CommissionStatus,
      updated
    )

    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    try {
      const eventBus: any = container.resolve(Modules.EVENT_BUS)
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
    } catch (error) {
      logger.error(
        `[commissions] Failed to emit payment received event: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
    return new StepResponse(updated)
  }
)

/* ---------------- MAIN WORKFLOW ---------------- */

export const completeCommissionPaymentWorkflow = createWorkflow(
  "complete-commission-payment",
  (input: CompleteCommissionPaymentInput) => {
    const initialContext = resolveCommissionOrderPaymentContextStep(input)
    const lock = acquireCommissionPaymentLockStep({
      commission_id: initialContext.commission.id,
    })
    const context = revalidateCommissionPaymentContextStep({
      context: initialContext,
      payment_lock: lock,
      payment_reference: input.razorpay_payment_id,
    })
    const authorization = authorizeAndCaptureCommissionStep({ context, input })
    const finalOrder = convertCommissionDraftOrderToPendingStep({
      context,
      authorization,
    })
    const paidCommission = markCommissionPaidStep({
      commission_id: context.commission.id,
      payment_reference: input.razorpay_payment_id,
      authorization,
      order: finalOrder,
    })
    const result = releaseCommissionPaymentLockStep({
      commission_id: context.commission.id,
      owner_id: lock.owner_id,
      commission: paidCommission,
      order: finalOrder,
    })

    return new WorkflowResponse({
      commission: result.commission,
      order: result.order,
    })
  }
)

export default completeCommissionPaymentWorkflow

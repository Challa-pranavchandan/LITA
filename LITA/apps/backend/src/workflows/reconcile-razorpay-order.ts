import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
  when,
} from "@medusajs/framework/workflows-sdk"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { completeCartWorkflow } from "@medusajs/core-flows"

export type ReconcileRazorpayOrderInput = {
  payment_id: string
  order_id: string
  session_id: string
  amount: number
}

/* ---------------- STEP 1: Reconcile Session Step ---------------- */

export const reconcileSessionStep = createStep(
  "reconcile-session",
  async (
    input: ReconcileRazorpayOrderInput,
    { container }
  ) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const paymentModule = container.resolve(Modules.PAYMENT) as any

    // 1. Retrieve payment session and its associated cart
    const { data: sessions } = await query.graph({
      entity: "payment_session",
      fields: ["id", "data", "status", "payment_collection_id"],
      filters: { id: input.session_id },
    })

    if (!sessions || sessions.length === 0) {
      logger.warn(
        `[reconcile-razorpay-order] Payment session ${input.session_id} not found.`
      )
      return new StepResponse({ shouldComplete: false, cart_id: "" })
    }

    const session = sessions[0]

    // 2. Query cart linked to this payment collection
    const { data: cartPaymentCollections } = await query.graph({
      entity: "cart_payment_collection",
      fields: ["cart_id"],
      filters: { payment_collection_id: session.payment_collection_id },
    })

    const cartId = cartPaymentCollections?.[0]?.cart_id
    if (!cartId) {
      logger.warn(
        `[reconcile-razorpay-order] No cart linked to payment collection ${session.payment_collection_id}.`
      )
      return new StepResponse({ shouldComplete: false, cart_id: "" })
    }

    // 3. Check if an order already exists for this cart
    const { data: existingOrders } = await query.graph({
      entity: "order_cart",
      fields: ["id", "order_id"],
      filters: { cart_id: cartId },
    })

    if (existingOrders && existingOrders.length > 0) {
      logger.info(
        `[reconcile-razorpay-order] Order already exists for cart ${cartId}. Recovery not needed.`
      )
      return new StepResponse({ shouldComplete: false, cart_id: cartId })
    }

    // 4. Update payment session data with verified Razorpay payment ID and webhook_verified flag
    // so authorizePayment will succeed when completeCartWorkflow runs.
    const currentData = (session.data ?? {}) as Record<string, any>
    const updatedData = {
      ...currentData,
      razorpay_payment_id: input.payment_id,
      razorpay_order_id: input.order_id || currentData.razorpay_order_id,
      webhook_verified: true,
    }

    if (typeof paymentModule.updatePaymentSession === "function") {
      await paymentModule.updatePaymentSession({
        id: session.id,
        data: updatedData,
      })
    }

    logger.info(
      `[reconcile-razorpay-order] Enriched payment session ${session.id} with payment ${input.payment_id} for pay-then-close-tab cart ${cartId}.`
    )

    return new StepResponse(
      { shouldComplete: true, cart_id: cartId },
      { session_id: session.id, previousData: currentData }
    )
  },
  async (compensationData, { container }) => {
    if (!compensationData?.session_id) return
    const paymentModule = container.resolve(Modules.PAYMENT) as any
    if (typeof paymentModule.updatePaymentSession === "function") {
      await paymentModule.updatePaymentSession({
        id: compensationData.session_id,
        data: compensationData.previousData,
      })
    }
  }
)

/* ---------------- STEP 2: Complete Cart Step ---------------- */

export const completeCartStep = createStep(
  "complete-cart",
  async (
    input: { cart_id: string; shouldComplete: boolean },
    { container }
  ) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    if (!input.shouldComplete || !input.cart_id) {
      return new StepResponse({ completed: false })
    }

    const workflowEngine = container.resolve(Modules.WORKFLOW_ENGINE)
    try {
      await workflowEngine.run(completeCartWorkflow.getName(), {
        input: { id: input.cart_id },
      })
      logger.info(
        `[reconcile-razorpay-order] Successfully recovered and completed cart ${input.cart_id} from Razorpay webhook.`
      )
      return new StepResponse({ completed: true })
    } catch (error: any) {
      logger.error(
        `[reconcile-razorpay-order] Failed to complete cart ${input.cart_id} during recovery: ${error?.message || error}`
      )
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Cart recovery failed for ${input.cart_id}: ${error?.message || error}`
      )
    }
  }
)

/* ---------------- WORKFLOW ---------------- */

export const reconcileRazorpayOrderWorkflow = createWorkflow(
  "reconcile-razorpay-order",
  (input: ReconcileRazorpayOrderInput) => {
    const sessionRes = reconcileSessionStep(input)
    const completionRes = completeCartStep(sessionRes)

    return new WorkflowResponse({
      reconciled: sessionRes,
      completion: completionRes,
    })
  }
)

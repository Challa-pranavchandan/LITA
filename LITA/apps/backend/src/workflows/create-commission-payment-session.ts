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
} from "@medusajs/framework/utils"
import {
  createOrderPaymentCollectionWorkflow,
  createPaymentSessionsWorkflow,
} from "@medusajs/core-flows"
import { COMMISSION_MODULE } from "../modules/commission"
import CommissionModuleService from "../modules/commission/service"

export type CreateCommissionPaymentSessionInput = {
  commission_id: string
  customer_id: string
}

export type CommissionPaymentSessionData = {
  commission_id: string
  order_id: string
  payment_collection_id: string
  session_id: string
  razorpay_order_id: string
  amount: number
  currency_code: string
  key_id: string
  title: string
}

/* ---------------- STEP 1: Validate Commission Ownership & Status ---------------- */

export async function validateCommissionForSession(
  { commission_id, customer_id }: CreateCommissionPaymentSessionInput,
  container: any
) {
  const commissionService: CommissionModuleService =
    container.resolve(COMMISSION_MODULE)
  const commission = await commissionService.retrieveCommission(commission_id)

  if (!commission || commission.customer_id !== customer_id) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Commission with ID ${commission_id} not found.`
    )
  }

  if (commission.status === "paid" || commission.paid_at) {
    throw new MedusaError(
      MedusaError.Types.CONFLICT,
      "This commission has already been paid."
    )
  }

  if (
    commission.status !== "awaiting_payment" &&
    commission.status !== "converted"
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Commission status is '${commission.status}'. Payment can only be initiated for commissions awaiting payment.`
    )
  }

  if (!commission.order_id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Commission has no linked order. Studio must convert it first."
    )
  }

  if (!commission.quoted_price || commission.quoted_price <= 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Commission must have a quoted price greater than 0."
    )
  }

  return commission
}

export const validateCommissionForSessionStep = createStep(
  "validate-commission-for-session",
  async (
    input: CreateCommissionPaymentSessionInput,
    { container }
  ) => {
    const commission = await validateCommissionForSession(input, container)
    return new StepResponse(commission)
  }
)

/* ---------------- STEP 2: Ensure Payment Collection for Order ---------------- */

export const ensureOrderPaymentCollectionStep = createStep(
  "ensure-order-payment-collection",
  async (commission: any, { container }) => {
    const query: any = container.resolve(ContainerRegistrationKeys.QUERY)

    // Check if an order payment collection already exists
    const { data: orderPayCols } = await query.graph({
      entity: "order_payment_collection",
      fields: [
        "payment_collection_id",
        "payment_collection.id",
        "payment_collection.status",
        "payment_collection.amount",
        "payment_collection.currency_code",
      ],
      filters: { order_id: commission.order_id },
    })

    const existing = orderPayCols?.find(
      (opc: any) =>
        opc.payment_collection &&
        opc.payment_collection.status !== "canceled" &&
        opc.payment_collection.status !== "completed"
    )

    if (existing?.payment_collection?.id) {
      return new StepResponse(existing.payment_collection)
    }

    // Create payment collection if missing
    const { result } = await createOrderPaymentCollectionWorkflow(container).run({
      input: {
        order_id: commission.order_id,
        amount: commission.quoted_price,
      },
    })

    const paymentCollection = Array.isArray(result) ? result[0] : result
    return new StepResponse(paymentCollection)
  }
)

/* ---------------- STEP 3: Create Razorpay Payment Session ---------------- */

type CreateSessionInput = {
  commission: any
  payment_collection: any
}

export const createCommissionRazorpaySessionStep = createStep(
  "create-commission-razorpay-session",
  async ({ commission, payment_collection }: CreateSessionInput, { container }) => {
    const paymentModule: any = container.resolve(Modules.PAYMENT)
    const providerId = "pp_razorpay_razorpay"

    // Create payment session on the order's payment collection
    const { result: session } = await createPaymentSessionsWorkflow(container).run({
      input: {
        payment_collection_id: payment_collection.id,
        provider_id: providerId,
        customer_id: commission.customer_id,
        data: {},
      },
    })

    const sessionData = (session.data ?? {}) as Record<string, any>
    const razorpayOrderId = sessionData.razorpay_order_id || ""
    const keyId = sessionData.key_id || process.env.RAZORPAY_KEY_ID || ""

    const output: CommissionPaymentSessionData = {
      commission_id: commission.id,
      order_id: commission.order_id,
      payment_collection_id: payment_collection.id,
      session_id: session.id,
      razorpay_order_id: razorpayOrderId,
      amount: sessionData.amount || commission.quoted_price * 100,
      currency_code: (commission.currency_code || "inr").toUpperCase(),
      key_id: keyId,
      title: commission.title,
    }

    return new StepResponse(output)
  }
)

/* ---------------- MAIN WORKFLOW ---------------- */

export const createCommissionPaymentSessionWorkflow = createWorkflow(
  "create-commission-payment-session",
  (input: CreateCommissionPaymentSessionInput) => {
    const commission = validateCommissionForSessionStep(input)
    const paymentCollection = ensureOrderPaymentCollectionStep(commission)
    const sessionData = createCommissionRazorpaySessionStep({
      commission,
      payment_collection: paymentCollection,
    })

    return new WorkflowResponse(sessionData)
  }
)

export default createCommissionPaymentSessionWorkflow

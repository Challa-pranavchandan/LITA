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
import {
  getCommissionInstallmentAmount,
  getCommissionPaymentInstallment,
  requireCommissionPaymentInstallment,
  type CommissionInstallment,
} from "../lib/commission-payment"
import { buildUpiLink, signProofToken } from "../lib/upi"
import { UPI_PAYMENT_MODULE } from "../modules/upi-payment"
import { ensureUpiPaymentRecord } from "./upi-payments"
import { isUpiManualEnabled } from "../api/store/upi-payments/helpers"

export type CreateCommissionPaymentSessionInput = {
  commission_id: string
  customer_id: string
  provider_id?: "pp_razorpay_razorpay" | "pp_upimanual_upimanual"
}

export type CommissionPaymentSessionData = {
  commission_id: string
  order_id: string
  payment_collection_id: string
  session_id: string
  provider_id: "pp_razorpay_razorpay" | "pp_upimanual_upimanual"
  razorpay_order_id: string
  amount: number
  currency_code: string
  key_id: string
  title: string
  installment: CommissionInstallment
  installment_amount: number
  total_amount: number
  reference_code?: string
  vpa?: string
  payee_name?: string
  upi_link?: string
  proof_token?: string
  status?: string
  expires_at?: string
  has_screenshot?: boolean
  utr_last4?: string | null
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

  if (!getCommissionPaymentInstallment(commission.status)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Commission status is '${commission.status}'. Payment can only be initiated for commissions awaiting payment or final payment.`
    )
  }

  if (!commission.order_id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Commission has no linked order. Studio must convert it first."
    )
  }

  if (
    typeof commission.quoted_price !== "number" ||
    !Number.isSafeInteger(commission.quoted_price) ||
    commission.quoted_price < 2
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Commission must have a quoted price of at least 2 to split into two payments."
    )
  }

  if (
    commission.status === "awaiting_final_payment" &&
    !commission.final_payment_requested_at
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "The studio has not requested the final payment yet."
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

export const resolveCommissionPaymentInstallmentStep = createStep(
  "resolve-commission-payment-installment",
  async (commission: any) =>
    new StepResponse(
      requireCommissionPaymentInstallment(commission.status)
    )
)

/* ---------------- STEP 2: Ensure Payment Collection for Order ---------------- */

type EnsurePaymentCollectionInput = {
  commission: any
  installment: CommissionInstallment
}

export const ensureOrderPaymentCollectionStep = createStep(
  "ensure-order-payment-collection",
  async ({ commission, installment }: EnsurePaymentCollectionInput, { container }) => {
    const query: any = container.resolve(ContainerRegistrationKeys.QUERY)
    const installmentAmount = getCommissionInstallmentAmount(
      commission.quoted_price,
      installment
    )

    const { data: orderPayCols } = await query.graph({
      entity: "order_payment_collection",
      fields: [
        "payment_collection_id",
        "payment_collection.id",
        "payment_collection.status",
        "payment_collection.amount",
        "payment_collection.currency_code",
        "payment_collection.metadata",
        "payment_collection.payment_sessions.id",
        "payment_collection.payment_sessions.provider_id",
        "payment_collection.payment_sessions.status",
      ],
      filters: { order_id: commission.order_id },
    })

    const activeCollections = orderPayCols?.filter(
      (opc: any) =>
        opc.payment_collection &&
        opc.payment_collection.status !== "canceled" &&
        opc.payment_collection.status !== "completed"
    )
    const existing = activeCollections?.find(
      (opc: any) =>
        opc.payment_collection.metadata?.commission_installment === installment
    ) || (
      installment === "deposit"
        ? activeCollections?.find(
            (opc: any) =>
              !opc.payment_collection.metadata?.commission_installment
          )
        : undefined
    )

    if (existing?.payment_collection?.id) {
      const paymentModule: any = container.resolve(Modules.PAYMENT)
      const collection = existing.payment_collection
      if (
        Number(collection.amount) !== installmentAmount ||
        collection.metadata?.commission_installment !== installment
      ) {
        return new StepResponse(
          await paymentModule.updatePaymentCollections(collection.id, {
            amount: installmentAmount,
            metadata: {
              ...collection.metadata,
              commission_id: commission.id,
              commission_installment: installment,
            },
          })
        )
      }
      return new StepResponse(collection)
    }

    // Create payment collection if missing
    const { result } = await createOrderPaymentCollectionWorkflow(container).run({
      input: {
        order_id: commission.order_id,
        amount: installmentAmount,
      },
    })

    const created = Array.isArray(result) ? result[0] : result
    const paymentModule: any = container.resolve(Modules.PAYMENT)
    const paymentCollection = await paymentModule.updatePaymentCollections(
      created.id,
      {
        metadata: {
          ...created.metadata,
          commission_id: commission.id,
          commission_installment: installment,
        },
      }
    )
    return new StepResponse(paymentCollection)
  }
)

/* ---------------- STEP 3: Create Commission Payment Session ---------------- */

type CreateSessionInput = {
  commission: any
  payment_collection: any
  installment: CommissionInstallment
  provider_id?: "pp_razorpay_razorpay" | "pp_upimanual_upimanual"
}

export const createCommissionPaymentSessionStep = createStep(
  "create-commission-payment-session-step",
  async (
    { commission, payment_collection, installment, provider_id }: CreateSessionInput,
    { container }
  ) => {
    const installmentAmount = getCommissionInstallmentAmount(
      commission.quoted_price,
      installment
    )
    const activeProviderId = provider_id || "pp_razorpay_razorpay"

    if (activeProviderId === "pp_upimanual_upimanual") {
      if (!isUpiManualEnabled()) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Manual UPI payments are currently disabled."
        )
      }

      const existingSession = payment_collection.payment_sessions?.find(
        (s: any) => s.provider_id === "pp_upimanual_upimanual" && s.status !== "canceled"
      )

      let sessionId = existingSession?.id
      if (!sessionId) {
        const { result: session } = await createPaymentSessionsWorkflow(container).run({
          input: {
            payment_collection_id: payment_collection.id,
            provider_id: "pp_upimanual_upimanual",
            customer_id: commission.customer_id,
            data: {
              commission_id: commission.id,
              commission_installment: installment,
            },
          },
        })
        sessionId = session.id
      }

      const paymentModule: any = container.resolve(Modules.PAYMENT)
      const query: any = container.resolve(ContainerRegistrationKeys.QUERY)

      const { data: sessions } = await query.graph({
        entity: "payment_session",
        fields: ["id", "status"],
        filters: { id: sessionId },
      })
      if (sessions?.[0]?.status !== "authorized") {
        await paymentModule.authorizePaymentSession(sessionId, {})
      }

      const upiPaymentService: any = container.resolve(UPI_PAYMENT_MODULE)
      const upiResult = await ensureUpiPaymentRecord(
        { order_id: commission.order_id },
        query,
        upiPaymentService
      )
      const upiRecord = upiResult.payment as any
      const referenceCode = String(upiRecord.reference_code)
      const upiAmount = Number(upiRecord.amount)
      const vpa = process.env.UPI_VPA || ""
      const payeeName = process.env.UPI_PAYEE_NAME || ""
      const upiLink = buildUpiLink({
        vpa,
        name: payeeName,
        amount: upiAmount,
        reference: referenceCode,
      })
      const proofToken = signProofToken(referenceCode, commission.order_id)

      const output: CommissionPaymentSessionData = {
        commission_id: commission.id,
        order_id: commission.order_id,
        payment_collection_id: payment_collection.id,
        session_id: sessionId,
        provider_id: "pp_upimanual_upimanual",
        razorpay_order_id: "",
        amount: upiAmount,
        currency_code: (commission.currency_code || "inr").toUpperCase(),
        key_id: "",
        title: commission.title,
        installment,
        installment_amount: installmentAmount,
        total_amount: commission.quoted_price,
        reference_code: referenceCode,
        vpa,
        payee_name: payeeName,
        upi_link: upiLink,
        proof_token: proofToken,
        status: String(upiRecord.status || "awaiting_proof"),
        expires_at: upiRecord.expires_at instanceof Date ? upiRecord.expires_at.toISOString() : String(upiRecord.expires_at),
        has_screenshot: Boolean(upiRecord.screenshot_key),
        utr_last4: typeof upiRecord.utr === "string" ? upiRecord.utr.slice(-4) : null,
      }

      return new StepResponse(output)
    }

    const providerId = "pp_razorpay_razorpay"

    const { result: session } = await createPaymentSessionsWorkflow(container).run({
      input: {
        payment_collection_id: payment_collection.id,
        provider_id: providerId,
        customer_id: commission.customer_id,
        data: {
          commission_id: commission.id,
          commission_installment: installment,
        },
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
      provider_id: "pp_razorpay_razorpay",
      razorpay_order_id: razorpayOrderId,
      amount: sessionData.amount || installmentAmount * 100,
      currency_code: (commission.currency_code || "inr").toUpperCase(),
      key_id: keyId,
      title: commission.title,
      installment,
      installment_amount: installmentAmount,
      total_amount: commission.quoted_price,
    }

    return new StepResponse(output)
  }
)

export const createCommissionRazorpaySessionStep = createCommissionPaymentSessionStep

/* ---------------- MAIN WORKFLOW ---------------- */

export const createCommissionPaymentSessionWorkflow = createWorkflow(
  "create-commission-payment-session",
  (input: CreateCommissionPaymentSessionInput) => {
    const commission = validateCommissionForSessionStep(input)
    const installment = resolveCommissionPaymentInstallmentStep(commission)
    const paymentCollection = ensureOrderPaymentCollectionStep({
      commission,
      installment,
    })
    const sessionData = createCommissionPaymentSessionStep({
      commission,
      payment_collection: paymentCollection,
      installment,
      provider_id: input.provider_id,
    })

    return new WorkflowResponse(sessionData)
  }
)

export default createCommissionPaymentSessionWorkflow

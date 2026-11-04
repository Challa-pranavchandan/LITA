import { randomUUID } from "crypto"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import {
  cancelOrderWorkflow,
  capturePaymentWorkflow,
} from "@medusajs/medusa/core-flows"
import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  when,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { generateReferenceCode, isValidUtr } from "../lib/upi"
import { getUpiOrderExpiryHours } from "../lib/upi-config"
import { UPI_PAYMENT_MODULE } from "../modules/upi-payment"

const UPI_MANUAL_PROVIDER_ID = "pp_upimanual_upimanual"
const MAX_PROOF_ATTEMPTS = 5

type UpiPaymentRecord = {
  id: string
  reference_code: string
  order_id: string | null
  cart_id: string | null
  payment_session_id: string | null
  customer_id: string | null
  email: string
  amount: number
  currency_code: string
  status: "awaiting_proof" | "submitted" | "verified" | "rejected" | "expired"
  utr: string | null
  payer_vpa: string | null
  screenshot_key: string | null
  submitted_at: Date | null
  verified_at?: Date | null
  verified_by?: string | null
  rejected_at: Date | null
  reject_reason: string | null
  expires_at: Date
  attempts: number
}

export type UpipaymentsService = {
  listUpiPayments: (
    filters: {
      id?: string
      order_id?: string
      reference_code?: string
      status?: string
    },
    config?: { take?: number }
  ) => Promise<UpiPaymentRecord[]>
  createUpiPayments: (
    data: Omit<UpiPaymentRecord, "id" | "utr" | "payer_vpa" | "screenshot_key" | "submitted_at" | "rejected_at" | "reject_reason">
  ) => Promise<UpiPaymentRecord>
  updateUpiPayments: (data: UpiPaymentUpdateData) => Promise<UpiPaymentRecord>
  deleteUpiPayments: (id: string) => Promise<void>
}

type UpiPaymentUpdateData = {
  id: string
  utr?: string | null
  screenshot_key?: string | null
  payer_vpa?: string | null
  status?: UpiPaymentRecord["status"]
  submitted_at?: Date | null
  attempts?: number
  verified_at?: Date | null
  verified_by?: string | null
  rejected_at?: Date | null
  reject_reason?: string | null
}

type UpiPaymentRollbackData = UpiPaymentUpdateData

export type UpipaymentsQuery = {
  graph: (input: Record<string, unknown>) => Promise<{ data?: OrderGraph[] }>
}

type OrderGraph = {
  id: string
  email?: string | null
  customer_id?: string | null
  cart_id?: string | null
  total: number | string
  currency_code: string
  payment_collections?: Array<{
    payment_sessions?: Array<{ id: string; provider_id: string }>
    payments?: Array<{ id: string; provider_id: string }>
  }>
}

type UpipaymentsPaymentService = {
  retrievePayment: (id: string) => Promise<{
    id: string
    data?: Record<string, unknown> | null
  }>
  updatePayment: (data: {
    id: string
    data: Record<string, unknown>
  }) => Promise<unknown>
}

type EnsureUpiPaymentInput = {
  order_id: string
}

type EnsureUpiPaymentResult = {
  payment: Record<string, unknown>
  created: boolean
}

function isReferenceCodeCollision(error: unknown): boolean {
  const candidate = error as { code?: string; constraint?: string; message?: string }
  return (
    candidate?.code === "23505" &&
    /reference_code/i.test(`${candidate.constraint ?? ""} ${candidate.message ?? ""}`)
  )
}

function isUtrCollision(error: unknown): boolean {
  const candidate = error as { code?: string; constraint?: string; message?: string }
  return (
    candidate?.code === "23505" &&
    /utr/i.test(`${candidate.constraint ?? ""} ${candidate.message ?? ""}`)
  )
}

export async function ensureUpiPaymentRecord(
  { order_id }: EnsureUpiPaymentInput,
  query: UpipaymentsQuery,
  paymentService: UpipaymentsService
): Promise<EnsureUpiPaymentResult> {
  const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "email",
        "customer_id",
        "cart_id",
        "total",
        "currency_code",
        "payment_collections.payment_sessions.id",
        "payment_collections.payment_sessions.provider_id",
      ],
      filters: { id: order_id },
    })
  const order = orders?.[0]
  if (!order) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Order with ID ${order_id} was not found.`
    )
  }

  const paymentSession = order.payment_collections
    ?.flatMap((collection) => collection.payment_sessions ?? [])
    .find((session) => session.provider_id === UPI_MANUAL_PROVIDER_ID)

  if (!paymentSession) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "This order does not have a manual UPI payment session."
    )
  }

  const existing = await paymentService.listUpiPayments(
    { order_id },
    { take: 1 }
  )
  if (existing[0]) {
    return {
      payment: existing[0] as unknown as Record<string, unknown>,
      created: false,
    }
  }

  const expiryHours = getUpiOrderExpiryHours()
  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000)
  let created: UpiPaymentRecord | undefined

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      created = await paymentService.createUpiPayments({
        reference_code: generateReferenceCode(),
        order_id,
        cart_id: order.cart_id ?? null,
        payment_session_id: paymentSession.id,
        customer_id: order.customer_id ?? null,
        email: order.email ?? "",
        amount: Number(order.total),
        currency_code: order.currency_code.toLowerCase(),
        status: "awaiting_proof",
        expires_at: expiresAt,
        attempts: 0,
      })
      break
    } catch (error) {
      if (!isReferenceCodeCollision(error) || attempt === 4) {
        throw error
      }
    }
  }

  if (!created) {
    throw new MedusaError(
      MedusaError.Types.CONFLICT,
      "Could not generate a unique UPI payment reference."
    )
  }

  return {
    payment: created as unknown as Record<string, unknown>,
    created: true,
  }
}

export const ensureUpiPaymentForOrderStep = createStep(
  "ensure-upi-payment-for-order",
  async (
    input: EnsureUpiPaymentInput,
    { container }
  ): Promise<StepResponse<EnsureUpiPaymentResult, string | null>> => {
    const query = container.resolve<UpipaymentsQuery>(
      ContainerRegistrationKeys.QUERY
    )
    const paymentService = container.resolve<UpipaymentsService>(UPI_PAYMENT_MODULE)
    const result = await ensureUpiPaymentRecord(input, query, paymentService)
    const compensationId = result.created
      ? String(result.payment.id)
      : null
    return new StepResponse(result, compensationId)
  },
  async (createdId, { container }) => {
    if (!createdId) return
    const paymentService = container.resolve<UpipaymentsService>(UPI_PAYMENT_MODULE)
    await paymentService.deleteUpiPayments(createdId)
  }
)

export const emitUpiPaymentStatusChangedStep = createStep(
  "emit-upi-payment-status-changed",
  async (
    input: EnsureUpiPaymentResult,
    { container }
  ): Promise<StepResponse<Record<string, unknown>>> => {
    if (input.created) {
      const eventBus = container.resolve(Modules.EVENT_BUS)
      await eventBus.emit({
        name: "upi_payment.status_changed",
        data: {
          id: input.payment.id,
          status: "awaiting_proof",
        },
      })
    }

    return new StepResponse(input.payment)
  }
)

export const ensureUpiPaymentForOrderWorkflow = createWorkflow(
  "ensure-upi-payment-for-order",
  (input: EnsureUpiPaymentInput) => {
    const payment = ensureUpiPaymentForOrderStep(input)
    const result = emitUpiPaymentStatusChangedStep(payment)
    return new WorkflowResponse(result)
  }
)

export type SubmitUpiProofInput = {
  reference_code: string
  utr?: string
  screenshot_key?: string
  payer_vpa?: string
}

type SubmitUpiProofRecordInput = SubmitUpiProofInput & {
  website?: string | null
}

export async function submitUpiProofRecord(
  input: SubmitUpiProofInput,
  paymentService: UpipaymentsService
): Promise<{
  payment: Record<string, unknown>
  rollback: UpiPaymentRollbackData
}> {
  const payment = (
    await paymentService.listUpiPayments(
      { reference_code: input.reference_code },
      { take: 1 }
    )
  )[0]

  if (!payment) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "UPI payment reference was not found."
    )
  }

  if (payment.status === "verified") {
    throw new MedusaError(
      MedusaError.Types.CONFLICT,
      "This UPI payment has already been verified."
    )
  }
  if (
    payment.status === "expired" ||
    new Date(payment.expires_at).getTime() <= Date.now()
  ) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "This UPI payment has expired."
    )
  }
  if (payment.attempts >= MAX_PROOF_ATTEMPTS) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "UPI proof submission limit reached. Try again later."
    )
  }
  if (!input.utr && !input.screenshot_key) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Submit a UTR or a payment screenshot."
    )
  }
  if (input.utr && !isValidUtr(input.utr)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "UTR must contain exactly 12 digits."
    )
  }
  if (
    input.screenshot_key &&
    !input.screenshot_key.startsWith(`upi-proofs/${input.reference_code}/`)
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Screenshot key is outside this payment's upload directory."
    )
  }

  let updated: UpiPaymentRecord
  try {
    updated = await paymentService.updateUpiPayments({
      id: payment.id,
      utr: input.utr?.trim() || payment.utr || null,
      screenshot_key: input.screenshot_key || payment.screenshot_key || null,
      payer_vpa: input.payer_vpa?.trim() || payment.payer_vpa || null,
      status: "submitted",
      submitted_at: new Date(),
      attempts: payment.attempts + 1,
      rejected_at: null,
      reject_reason: null,
    })
  } catch (error) {
    if (isUtrCollision(error)) {
      throw new MedusaError(
        MedusaError.Types.CONFLICT,
        "This UTR is already linked to another order"
      )
    }
    throw error
  }

  return {
    payment: updated as unknown as Record<string, unknown>,
    rollback: {
      id: payment.id,
      utr: payment.utr,
      screenshot_key: payment.screenshot_key,
      payer_vpa: payment.payer_vpa,
      status: payment.status,
      submitted_at: payment.submitted_at,
      attempts: payment.attempts,
      rejected_at: payment.rejected_at,
      reject_reason: payment.reject_reason,
    },
  }
}

export const submitUpiProofStep = createStep(
  "submit-upi-proof",
  async (
    input: SubmitUpiProofRecordInput,
    { container }
  ): Promise<StepResponse<Record<string, unknown>, UpiPaymentRollbackData>> => {
    if (input.website?.trim()) {
      return new StepResponse({ isHoneypot: true }, { id: "" })
    }
    const paymentService = container.resolve<UpipaymentsService>(UPI_PAYMENT_MODULE)
    const result = await submitUpiProofRecord(input, paymentService)
    return new StepResponse(result.payment, result.rollback)
  },
  async (previous: UpiPaymentRollbackData, { container }) => {
    if (!previous.id) return
    const paymentService = container.resolve<UpipaymentsService>(UPI_PAYMENT_MODULE)
    await paymentService.updateUpiPayments(previous)
  }
)

export const emitUpiProofSubmittedStep = createStep(
  "emit-upi-proof-submitted",
  async (
    payment: Record<string, unknown>,
    { container }
  ): Promise<StepResponse<Record<string, unknown>>> => {
    if (payment.isHoneypot !== true) {
      const eventBus = container.resolve(Modules.EVENT_BUS)
      await eventBus.emit({
        name: "upi_payment.status_changed",
        data: { id: payment.id, status: "submitted" },
      })
    }

    return new StepResponse(payment)
  }
)

export const submitUpiProofWorkflow = createWorkflow(
  "submit-upi-proof",
  (input: SubmitUpiProofInput) => {
    const payment = submitUpiProofStep(input)
    const result = emitUpiProofSubmittedStep(payment)
    return new WorkflowResponse(result)
  }
)

export type VerifyUpiPaymentInput = {
  id: string
  admin_user_id: string
  amount_confirmed: boolean
}

type UpipaymentsLockingService = {
  acquire: (
    keys: string,
    args?: { ownerId?: string; expire?: number }
  ) => Promise<void>
  release: (keys: string, args?: { ownerId?: string }) => Promise<boolean>
}

const acquireUpiPaymentLockStep = createStep(
  "acquire-upi-payment-lock",
  async (
    input: { id: string },
    { container }
  ): Promise<StepResponse<{ id: string; owner_id: string }, { id: string; owner_id: string }>> => {
    const locking = container.resolve<UpipaymentsLockingService>(Modules.LOCKING)
    const ownerId = randomUUID()
    await locking.acquire(`upi_payment:${input.id}`, {
      ownerId,
      expire: 900,
    })
    return new StepResponse(
      { id: input.id, owner_id: ownerId },
      { id: input.id, owner_id: ownerId }
    )
  },
  async (rollback, { container }) => {
    if (!rollback) return
    const locking = container.resolve<UpipaymentsLockingService>(Modules.LOCKING)
    await locking.release(`upi_payment:${rollback.id}`, {
      ownerId: rollback.owner_id,
    })
  }
)

const releaseUpiPaymentLockStep = createStep(
  "release-upi-payment-lock",
  async (
    input: { id: string; owner_id: string; payment: UpiPaymentRecord },
    { container }
  ): Promise<StepResponse<UpiPaymentRecord>> => {
    const locking = container.resolve<UpipaymentsLockingService>(Modules.LOCKING)
    await locking.release(`upi_payment:${input.id}`, {
      ownerId: input.owner_id,
    })
    return new StepResponse(input.payment)
  }
)

type PreparedUpiVerification = {
  payment: UpiPaymentRecord
  payment_id?: string
  order_total?: number
  admin_user_id: string
  already_verified: boolean
}

export async function prepareUpiPaymentVerification(
  input: VerifyUpiPaymentInput,
  query: UpipaymentsQuery,
  paymentService: UpipaymentsService
): Promise<PreparedUpiVerification> {
  if (input.amount_confirmed !== true) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Confirm the amount in your bank or UPI app before verifying this payment."
    )
  }

  const payment = (
    await paymentService.listUpiPayments({ id: input.id }, { take: 1 })
  )[0]
  if (!payment) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "UPI payment was not found."
    )
  }
  if (payment.status === "verified") {
    return {
      payment,
      admin_user_id: input.admin_user_id,
      already_verified: true,
    }
  }
  if (payment.status !== "submitted" && payment.status !== "awaiting_proof") {
    throw new MedusaError(
      MedusaError.Types.CONFLICT,
      `A UPI payment in ${payment.status} status cannot be verified.`
    )
  }

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "total",
      "currency_code",
      "payment_collections.payments.id",
      "payment_collections.payments.provider_id",
    ],
    filters: { id: payment.order_id },
  })
  const order = orders?.[0]
  if (!order) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "The order for this UPI payment was not found."
    )
  }

  const orderTotal = Number(order.total)
  if (
    !Number.isFinite(orderTotal) ||
    Number(payment.amount) !== orderTotal ||
    payment.currency_code.toLowerCase() !== order.currency_code.toLowerCase()
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `UPI payment amount mismatch. The payment record is ₹${Number(payment.amount).toFixed(2)} ${payment.currency_code.toUpperCase()}, but the current order total is ₹${orderTotal.toFixed(2)} ${order.currency_code.toUpperCase()}.`
    )
  }

  const paymentId = order.payment_collections
    ?.flatMap((collection) => collection.payments ?? [])
    .find((orderPayment) => orderPayment.provider_id === UPI_MANUAL_PROVIDER_ID)
    ?.id
  if (!paymentId) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "No UPI payment is attached to the order."
    )
  }

  return {
    payment,
    payment_id: paymentId,
    order_total: orderTotal,
    admin_user_id: input.admin_user_id,
    already_verified: false,
  }
}

const prepareUpiPaymentVerificationStep = createStep(
  "prepare-upi-payment-verification",
  async (
    input: VerifyUpiPaymentInput,
    { container }
  ): Promise<StepResponse<PreparedUpiVerification>> => {
    const query = container.resolve<UpipaymentsQuery>(
      ContainerRegistrationKeys.QUERY
    )
    const paymentService = container.resolve<UpipaymentsService>(
      UPI_PAYMENT_MODULE
    )
    const prepared = await prepareUpiPaymentVerification(
      input,
      query,
      paymentService
    )
    return new StepResponse(prepared)
  }
)

type VerifiedPaymentData = {
  prepared: PreparedUpiVerification
  original_data?: Record<string, unknown>
}

const markPaymentVerifiedForCaptureStep = createStep(
  "mark-payment-verified-for-capture",
  async (
    prepared: PreparedUpiVerification,
    { container }
  ): Promise<
    StepResponse<
      VerifiedPaymentData,
      { payment_id: string; data: Record<string, unknown> } | null
    >
  > => {
    if (prepared.already_verified || !prepared.payment_id) {
      return new StepResponse({ prepared }, null)
    }

    const paymentService = container.resolve<UpipaymentsPaymentService>(
      Modules.PAYMENT
    )
    const existingPayment = await paymentService.retrievePayment(
      prepared.payment_id
    )
    const originalData = existingPayment.data ?? {}
    await paymentService.updatePayment({
      id: prepared.payment_id,
      data: { ...originalData, verified: true },
    })

    return new StepResponse(
      { prepared, original_data: originalData },
      { payment_id: prepared.payment_id, data: originalData }
    )
  },
  async (rollback, { container }) => {
    if (!rollback) return
    const paymentService = container.resolve<UpipaymentsPaymentService>(
      Modules.PAYMENT
    )
    await paymentService.updatePayment({
      id: rollback.payment_id,
      data: rollback.data,
    })
  }
)

const markUpiPaymentVerifiedStep = createStep(
  "mark-upi-payment-verified",
  async (
    input: {
      prepared: PreparedUpiVerification
      verified_data: VerifiedPaymentData
      capture_result: unknown
    },
    { container }
  ): Promise<StepResponse<UpiPaymentRecord, UpiPaymentUpdateData | null>> => {
    if (input.prepared.already_verified) {
      return new StepResponse(input.prepared.payment, null)
    }

    const paymentService = container.resolve<UpipaymentsService>(
      UPI_PAYMENT_MODULE
    )
    const previous = input.prepared.payment
    const updated = await paymentService.updateUpiPayments({
      id: previous.id,
      status: "verified",
      verified_at: new Date(),
      verified_by: input.prepared.admin_user_id,
      rejected_at: null,
      reject_reason: null,
    })
    return new StepResponse(updated, {
      id: previous.id,
      status: previous.status,
      verified_at: previous.verified_at ?? null,
      verified_by: previous.verified_by ?? null,
      rejected_at: previous.rejected_at,
      reject_reason: previous.reject_reason,
    })
  },
  async (rollback, { container }) => {
    if (!rollback) return
    const paymentService = container.resolve<UpipaymentsService>(
      UPI_PAYMENT_MODULE
    )
    await paymentService.updateUpiPayments(rollback)
  }
)

const emitUpiPaymentVerifiedStep = createStep(
  "emit-upi-payment-verified",
  async (
    payment: UpiPaymentRecord,
    { container }
  ): Promise<StepResponse<UpiPaymentRecord>> => {
    const eventBus = container.resolve(Modules.EVENT_BUS)
    await eventBus.emit({
      name: "upi_payment.status_changed",
      data: { id: payment.id, status: "verified" },
    })
    return new StepResponse(payment)
  }
)

export const verifyUpiPaymentWorkflow = createWorkflow(
  "verify-upi-payment",
  (input: VerifyUpiPaymentInput) => {
    const lock = acquireUpiPaymentLockStep({ id: input.id })
    const lockedInput = transform(
      { lock, input },
      ({ lock, input }) => ({ ...input, id: lock.id })
    )
    const prepared = prepareUpiPaymentVerificationStep(lockedInput)
    const verification = when(
      prepared,
      (value) => !value.already_verified
    ).then(() => {
      const verifiedData = markPaymentVerifiedForCaptureStep(prepared)
      const capture = capturePaymentWorkflow.runAsStep({
        input: transform(verifiedData, (value) => ({
          payment_id: value.prepared.payment_id!,
          captured_by: value.prepared.admin_user_id,
          amount: value.prepared.order_total!,
        })),
      })
      const updated = markUpiPaymentVerifiedStep({
        prepared,
        verified_data: verifiedData,
        capture_result: capture,
      })
      return emitUpiPaymentVerifiedStep(updated)
    })

    const payment = transform(
      { prepared, verification },
      ({ prepared, verification }) =>
        prepared.already_verified
          ? prepared.payment
          : verification ?? prepared.payment
    )
    const released = releaseUpiPaymentLockStep(
      transform({ prepared, payment, lock }, ({ prepared, payment, lock }) => ({
        id: prepared.payment.id,
        owner_id: lock.owner_id,
        payment,
      }))
    )

    return new WorkflowResponse(released)
  }
)

export type ExpireUpiPaymentInput = {
  id: string
  force?: boolean
}

type PreparedUpiExpiration = {
  payment: UpiPaymentRecord
  order_id?: string
  should_expire: boolean
}

export async function prepareUpiPaymentExpiration(
  input: ExpireUpiPaymentInput,
  paymentService: UpipaymentsService
): Promise<PreparedUpiExpiration> {
  const payment = (
    await paymentService.listUpiPayments({ id: input.id }, { take: 1 })
  )[0]
  if (!payment) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "UPI payment was not found."
    )
  }

  const eligibleStatus =
    payment.status === "awaiting_proof" ||
    (!input.force && payment.status === "rejected")
  const isExpired = new Date(payment.expires_at).getTime() <= Date.now()
  const shouldExpire =
    eligibleStatus &&
    (input.force === true
      ? payment.status === "awaiting_proof"
      : isExpired)

  if (!shouldExpire) {
    return { payment, should_expire: false }
  }
  if (!payment.order_id) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "The order for this UPI payment was not found."
    )
  }

  return {
    payment,
    order_id: payment.order_id,
    should_expire: true,
  }
}

const prepareUpiPaymentExpirationStep = createStep(
  "prepare-upi-payment-expiration",
  async (
    input: ExpireUpiPaymentInput,
    { container }
  ): Promise<StepResponse<PreparedUpiExpiration>> => {
    const paymentService = container.resolve<UpipaymentsService>(
      UPI_PAYMENT_MODULE
    )
    return new StepResponse(
      await prepareUpiPaymentExpiration(input, paymentService)
    )
  }
)

const markUpiPaymentExpiredStep = createStep(
  "mark-upi-payment-expired",
  async (
    input: { prepared: PreparedUpiExpiration; cancellation: unknown },
    { container }
  ): Promise<StepResponse<UpiPaymentRecord, UpiPaymentUpdateData>> => {
    const payment = input.prepared.payment
    const paymentService = container.resolve<UpipaymentsService>(
      UPI_PAYMENT_MODULE
    )
    const updated = await paymentService.updateUpiPayments({
      id: payment.id,
      status: "expired",
    })
    return new StepResponse(updated, {
      id: payment.id,
      status: payment.status,
    })
  },
  async (rollback, { container }) => {
    if (!rollback) return
    const paymentService = container.resolve<UpipaymentsService>(
      UPI_PAYMENT_MODULE
    )
    await paymentService.updateUpiPayments(rollback)
  }
)

const emitUpiPaymentExpiredStep = createStep(
  "emit-upi-payment-expired",
  async (
    payment: UpiPaymentRecord,
    { container }
  ): Promise<StepResponse<UpiPaymentRecord>> => {
    const eventBus = container.resolve(Modules.EVENT_BUS)
    await eventBus.emit({
      name: "upi_payment.status_changed",
      data: { id: payment.id, status: "expired" },
    })
    return new StepResponse(payment)
  }
)

export const expireUpiPaymentWorkflow = createWorkflow(
  "expire-upi-payment",
  (input: ExpireUpiPaymentInput) => {
    const lock = acquireUpiPaymentLockStep({ id: input.id })
    const lockedInput = transform(
      { lock, input },
      ({ lock, input }) => ({ ...input, id: lock.id })
    )
    const prepared = prepareUpiPaymentExpirationStep(lockedInput)
    const expired = when(
      prepared,
      (value) => value.should_expire
    ).then(() => {
      const cancellation = cancelOrderWorkflow.runAsStep({
        input: transform(prepared, (value) => ({
          order_id: value.order_id!,
          no_notification: true,
        })),
      })
      const updated = markUpiPaymentExpiredStep(
        transform({ prepared, cancellation }, ({ prepared, cancellation }) => ({
          prepared,
          cancellation,
        }))
      )
      return emitUpiPaymentExpiredStep(updated)
    })
    const payment = transform(
      { prepared, expired },
      ({ prepared, expired }) => expired ?? prepared.payment
    )
    const released = releaseUpiPaymentLockStep(
      transform({ prepared, payment, lock }, ({ prepared, payment, lock }) => ({
        id: prepared.payment.id,
        owner_id: lock.owner_id,
        payment,
      }))
    )

    return new WorkflowResponse(released)
  }
)

export type RejectUpiPaymentInput = {
  id: string
  reason: string
}

export async function rejectUpiPaymentRecord(
  input: RejectUpiPaymentInput,
  paymentService: UpipaymentsService
): Promise<{
  payment: UpiPaymentRecord
  rollback: UpiPaymentUpdateData
}> {
  const reason = input.reason.trim()
  if (reason.length < 3 || reason.length > 300) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Rejection reason must contain between 3 and 300 characters."
    )
  }

  const payment = (
    await paymentService.listUpiPayments({ id: input.id }, { take: 1 })
  )[0]
  if (!payment) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "UPI payment was not found."
    )
  }
  if (payment.status !== "submitted" && payment.status !== "awaiting_proof") {
    throw new MedusaError(
      MedusaError.Types.CONFLICT,
      `A UPI payment in ${payment.status} status cannot be rejected.`
    )
  }

  const updated = await paymentService.updateUpiPayments({
    id: payment.id,
    status: "rejected",
    rejected_at: new Date(),
    reject_reason: reason,
    utr: null,
    screenshot_key: null,
  })
  return {
    payment: updated,
    rollback: {
      id: payment.id,
      status: payment.status,
      rejected_at: payment.rejected_at,
      reject_reason: payment.reject_reason,
      utr: payment.utr,
      screenshot_key: payment.screenshot_key,
    },
  }
}

const rejectUpiPaymentStep = createStep(
  "reject-upi-payment",
  async (
    input: RejectUpiPaymentInput,
    { container }
  ): Promise<StepResponse<UpiPaymentRecord, UpiPaymentUpdateData>> => {
    const paymentService = container.resolve<UpipaymentsService>(
      UPI_PAYMENT_MODULE
    )
    const result = await rejectUpiPaymentRecord(input, paymentService)
    return new StepResponse(result.payment, result.rollback)
  },
  async (rollback, { container }) => {
    if (!rollback) return
    const paymentService = container.resolve<UpipaymentsService>(
      UPI_PAYMENT_MODULE
    )
    await paymentService.updateUpiPayments(rollback)
  }
)

const emitUpiPaymentRejectedStep = createStep(
  "emit-upi-payment-rejected",
  async (
    payment: UpiPaymentRecord,
    { container }
  ): Promise<StepResponse<UpiPaymentRecord>> => {
    const eventBus = container.resolve(Modules.EVENT_BUS)
    await eventBus.emit({
      name: "upi_payment.status_changed",
      data: { id: payment.id, status: "rejected" },
    })
    return new StepResponse(payment)
  }
)

export const rejectUpiPaymentWorkflow = createWorkflow(
  "reject-upi-payment",
  (input: RejectUpiPaymentInput) => {
    const payment = rejectUpiPaymentStep(input)
    const result = emitUpiPaymentRejectedStep(payment)
    return new WorkflowResponse(result)
  }
)

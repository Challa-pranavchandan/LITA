import {
  AbstractPaymentProvider,
  BigNumber,
  MathBN,
  MedusaError,
  Modules,
  PaymentActions,
  PaymentSessionStatus,
} from "@medusajs/framework/utils"
import type {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  Logger,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"
import Razorpay from "razorpay"
import crypto from "crypto"

export type RazorpayOptions = {
  key_id: string
  key_secret: string
  webhook_secret: string
}

export const toPaise = (amount: any): number => {
  const numeric = new BigNumber(MathBN.mult(amount, 100)).numeric
  return Math.round(Number(numeric))
}

export const fromPaise = (amount: any): BigNumber => {
  return new BigNumber(MathBN.div(amount, 100))
}

export class RazorpayProviderService extends AbstractPaymentProvider<RazorpayOptions> {
  static identifier = "razorpay"

  protected client_: Razorpay
  protected options_: RazorpayOptions
  protected logger_?: Logger

  constructor(container: Record<string, unknown>, options: RazorpayOptions) {
    super(container, options)
    this.options_ = options
    this.logger_ = (container.logger as Logger) || undefined
    this.client_ = new Razorpay({
      key_id: options.key_id,
      key_secret: options.key_secret,
    })
  }

  static validateOptions(options: Record<any, any>): void {
    if (!options.key_id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Razorpay option 'key_id' is required"
      )
    }
    if (!options.key_secret) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Razorpay option 'key_secret' is required"
      )
    }
    if (!options.webhook_secret) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Razorpay option 'webhook_secret' is required"
      )
    }
  }

  // Called when the customer initiates a payment session with Razorpay.
  // Medusa v2 (@medusajs/payment 2.21.2) merges session data as: { ...input.data, ...providerPaymentSession.data }.
  // Provider-returned keys take precedence, ensuring client-supplied order_id or amount cannot overwrite server data.
  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const { amount, currency_code, data, context } = input

    // 1. Currency guard (B8c): LITA is strictly India/INR-only. Reject non-INR currencies immediately.
    const currency = String(currency_code || "").toUpperCase()
    if (currency !== "INR") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Cannot initiate Razorpay payment: currency must be INR (received: ${currency_code})`
      )
    }

    const paise = toPaise(amount)
    const sessionId = (data?.session_id as string) || (data?.id as string) || ""

    if (!sessionId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Cannot initiate Razorpay payment: session_id is required"
      )
    }

    const order = await this.client_.orders.create({
      amount: paise,
      currency,
      receipt: context?.idempotency_key
        ? String(context.idempotency_key).slice(0, 40)
        : undefined,
      notes: {
        session_id: sessionId,
      },
    })

    // 2. Data sanitization (B8b): strip client-supplied order_id, amount, currency, and webhook_verified.
    const cleanData = { ...(data ?? {}) }
    delete cleanData.razorpay_order_id
    delete cleanData.amount
    delete cleanData.currency
    delete cleanData.webhook_verified

    return {
      id: order.id,
      data: {
        ...cleanData,
        razorpay_order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        status: order.status,
        key_id: this.options_.key_id,
      },
    }
  }

  // Called during cart completion. Validates HMAC signature, checks Razorpay API state,
  // verifies amount and currency match server expectation, and checks for payment ID replay.
  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const data = (input.data ?? {}) as Record<string, any>
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, webhook_verified } = data

    if (!razorpay_order_id || !razorpay_payment_id) {
      return {
        status: PaymentSessionStatus.REQUIRES_MORE,
        data: input.data,
      }
    }

    // 1. Signature verification: either modal checkout HMAC or pre-verified by authoritative webhook
    if (!webhook_verified) {
      if (!razorpay_signature) {
        return {
          status: PaymentSessionStatus.REQUIRES_MORE,
          data: input.data,
        }
      }

      const expected = crypto
        .createHmac("sha256", this.options_.key_secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex")

      const a = Buffer.from(expected)
      const b = Buffer.from(String(razorpay_signature))

      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        this.logger_?.error?.(
          `[Razorpay] HMAC signature mismatch for order ${razorpay_order_id} and payment ${razorpay_payment_id}`
        )
        return {
          status: PaymentSessionStatus.ERROR,
          data: input.data,
        }
      }
    }

    // 2. Fetch authoritative payment status from Razorpay
    let payment: any
    try {
      payment = await this.client_.payments.fetch(razorpay_payment_id)
    } catch (error: any) {
      this.logger_?.error?.(
        `[Razorpay] Failed to fetch payment ${razorpay_payment_id} from Razorpay: ${error?.message || error}`
      )
      return {
        status: PaymentSessionStatus.ERROR,
        data: input.data,
      }
    }

    // 3. Status requirement: must be "authorized" or "captured"
    const isValidStatus = payment.status === "authorized" || payment.status === "captured"
    if (!isValidStatus) {
      this.logger_?.error?.(
        `[Razorpay] Payment ${razorpay_payment_id} has invalid status: ${payment.status} (expected authorized or captured)`
      )
      return {
        status: PaymentSessionStatus.ERROR,
        data: input.data,
      }
    }

    // 4. Order ID requirement: payment.order_id must match the server-stored razorpay_order_id
    if (payment.order_id !== razorpay_order_id) {
      this.logger_?.error?.(
        `[Razorpay] Order ID mismatch for payment ${razorpay_payment_id}: expected ${razorpay_order_id}, got ${payment.order_id}`
      )
      return {
        status: PaymentSessionStatus.ERROR,
        data: input.data,
      }
    }

    // 5. Amount requirement: payment.amount (paise) must match server-stored expected amount
    const expectedAmount = Number(data.amount)
    if (Number(payment.amount) !== expectedAmount) {
      this.logger_?.error?.(
        `[Razorpay] Amount mismatch for payment ${razorpay_payment_id}: expected ${expectedAmount} paise, got ${payment.amount} paise`
      )
      return {
        status: PaymentSessionStatus.ERROR,
        data: input.data,
      }
    }

    // 6. Currency requirement: must be "INR"
    if (String(payment.currency).toUpperCase() !== "INR") {
      this.logger_?.error?.(
        `[Razorpay] Currency mismatch for payment ${razorpay_payment_id}: expected INR, got ${payment.currency}`
      )
      return {
        status: PaymentSessionStatus.ERROR,
        data: input.data,
      }
    }

    // 7. Prevent replay: a razorpay_payment_id already used to authorize another session must be rejected
    const currentSessionId = (data.session_id as string) || (input.context?.idempotency_key as string)
    const isReplay = await this.checkPaymentReplay(razorpay_payment_id, currentSessionId)
    if (isReplay) {
      this.logger_?.error?.(
        `[Razorpay] Replay attempt detected: payment ${razorpay_payment_id} has already been used on another session`
      )
      return {
        status: PaymentSessionStatus.ERROR,
        data: input.data,
      }
    }

    return {
      status: PaymentSessionStatus.AUTHORIZED,
      data: {
        ...input.data,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature: razorpay_signature || "webhook_verified",
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
      },
    }
  }

  // Checks the Medusa payment module for existing payments recorded with the same razorpay_payment_id.
  // In Medusa v2, successful authorizations create a Payment entity storing provider data in its json `data` column.
  // Rejecting payments already associated with another session prevents cross-cart/session token reuse.
  protected async checkPaymentReplay(
    paymentId: string,
    currentSessionId?: string
  ): Promise<boolean> {
    try {
      const paymentModule = (this.container[Modules.PAYMENT] ||
        this.container.paymentModuleService ||
        this.container.paymentService) as any

      if (!paymentModule) {
        return false
      }

      let existingPayments: any[] = []
      if (typeof paymentModule.listPayments === "function") {
        existingPayments = await paymentModule.listPayments({
          data: { razorpay_payment_id: paymentId },
        })
      } else if (typeof paymentModule.list === "function") {
        existingPayments = await paymentModule.list({
          data: { razorpay_payment_id: paymentId },
        })
      }

      if (!Array.isArray(existingPayments) || existingPayments.length === 0) {
        return false
      }

      return existingPayments.some((p: any) => {
        const pPaymentId = p.data?.razorpay_payment_id
        if (pPaymentId !== paymentId) return false

        const existingSessionId =
          p.payment_session_id || p.payment_session?.id || p.data?.session_id
        if (currentSessionId && existingSessionId) {
          return existingSessionId !== currentSessionId
        }
        return true
      })
    } catch (error: any) {
      this.logger_?.warn?.(
        `[Razorpay] Failed to check payment replay for ${paymentId}: ${error?.message || error}`
      )
      return false
    }
  }

  // Auto-capture on => payment is already captured. Otherwise capture it.
  // Capture failures throw a MedusaError instead of returning success.
  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    const paymentId = input.data?.razorpay_payment_id as string | undefined
    if (!paymentId) {
      return { data: input.data }
    }

    try {
      const payment = await this.client_.payments.fetch(paymentId)
      if (payment.status === "captured") {
        return { data: { ...input.data, ...payment } }
      }

      const captured = await this.client_.payments.capture(
        paymentId,
        payment.amount,
        payment.currency
      )
      return { data: { ...input.data, ...captured } }
    } catch (error: any) {
      this.logger_?.error?.(
        `[Razorpay] Failed to capture payment ${paymentId}: ${error?.message || error}`
      )
      throw new MedusaError(
        MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
        `Failed to capture Razorpay payment ${paymentId}: ${error?.message || "Unknown error"}`
      )
    }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const { data, amount, context } = input
    const paymentId = data?.razorpay_payment_id as string | undefined

    if (!paymentId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Cannot refund: no Razorpay payment id on this payment"
      )
    }

    const refundPaise = toPaise(amount)
    if (refundPaise <= 0 || !Number.isFinite(refundPaise)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Cannot refund: refund amount must be greater than 0"
      )
    }

    // 1. Fetch authoritative payment details from Razorpay to validate captured amount
    let payment: any
    try {
      payment = await this.client_.payments.fetch(paymentId)
    } catch (error: any) {
      this.logger_?.error?.(
        `[Razorpay] Failed to fetch payment ${paymentId} for refund: ${error?.message || error}`
      )
      throw new MedusaError(
        MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
        `Failed to fetch Razorpay payment ${paymentId} for refund: ${error?.message || "Unknown error"}`
      )
    }

    // 2. Validate refund amount against captured payment
    const capturedPaise = Number(payment.amount)
    if (refundPaise > capturedPaise) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Cannot refund: requested amount (${refundPaise} paise) exceeds captured amount (${capturedPaise} paise)`
      )
    }

    const alreadyRefunded = Number(payment.amount_refunded || 0)
    if (refundPaise > capturedPaise - alreadyRefunded) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Cannot refund: requested amount (${refundPaise} paise) exceeds remaining refundable amount (${capturedPaise - alreadyRefunded} paise)`
      )
    }

    // 3. Make refund idempotent:
    // Razorpay supports an optional unique `receipt` parameter (up to 40 characters) on refunds.
    // By forwarding Medusa's idempotency key or refund ID as `receipt` and tagging `notes.medusa_refund_id`,
    // any duplicate API calls following a network timeout will reference the same transaction context,
    // allowing Razorpay to recognize the duplicate request or return the existing refund rather than
    // creating an erroneous second debit.
    const receipt = context?.idempotency_key
      ? String(context.idempotency_key).slice(0, 40)
      : (data?.refund_id ? String(data.refund_id).slice(0, 40) : undefined)

    const refundPayload: Record<string, any> = {
      amount: refundPaise,
      notes: {
        payment_id: paymentId,
        ...(receipt ? { receipt } : {}),
        ...(data?.refund_id ? { medusa_refund_id: String(data.refund_id) } : {}),
      },
    }
    if (receipt) {
      refundPayload.receipt = receipt
    }

    // 4. Dispatch refund to Razorpay API
    let refund: any
    try {
      refund = await this.client_.payments.refund(paymentId, refundPayload)
    } catch (error: any) {
      this.logger_?.error?.(
        `[Razorpay] Failed to refund payment ${paymentId}: ${error?.message || error}`
      )
      throw new MedusaError(
        MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
        `Failed to refund Razorpay payment ${paymentId}: ${error?.message || "Unknown error"}`
      )
    }

    return {
      data: {
        ...data,
        refund,
      },
    }
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    // Razorpay orders cannot be manually cancelled via API; they expire automatically.
    return { data: input.data }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: input.data }
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    const paymentId = input.data?.razorpay_payment_id as string | undefined
    if (!paymentId) {
      return { data: input.data }
    }

    try {
      const payment = await this.client_.payments.fetch(paymentId)
      return { data: { ...input.data, ...payment } }
    } catch (error: any) {
      this.logger_?.error?.(
        `[Razorpay] Failed to retrieve payment ${paymentId}: ${error?.message || error}`
      )
      return { data: input.data }
    }
  }

  // In Medusa v2 (@medusajs/payment 2.21.2), updatePaymentSession replaces session.data with providerData.data.
  // It receives data: data.data from the caller. We must never allow client-supplied amounts, order IDs, or
  // webhook_verified flags to overwrite server-stored values.
  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    const { amount, currency_code, data, context } = input

    // 1. Currency guard (B8c): LITA is strictly India/INR-only. Reject non-INR currencies immediately.
    const currency = String(currency_code || "").toUpperCase()
    if (currency !== "INR") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Cannot update Razorpay payment: currency must be INR (received: ${currency_code})`
      )
    }

    const currentData = { ...((data ?? {}) as Record<string, any>) }
    const newPaise = toPaise(amount)

    // 2. Data sanitization (B8b):
    // webhook_verified skips signature verification in authorizePayment and must strictly only be set
    // by trusted internal reconciliation workflows (e.g. reconcile-razorpay-order or complete-commission-payment).
    // If context does not declare an internal reconciliation, strip webhook_verified from caller input.
    const providerContext = context as Record<string, any> | undefined
    const isInternalReconcile = Boolean(
      providerContext?.is_reconcile ||
      providerContext?.internal_workflow ||
      providerContext?.webhook_verified
    )
    if (!isInternalReconcile) {
      delete currentData.webhook_verified
    }

    // 3. If this is a payment verification call from the frontend (payment completed in Razorpay modal),
    // preserve the existing server razorpay_order_id and authoritative amount (newPaise).
    const hasVerification = Boolean(
      currentData.razorpay_payment_id && currentData.razorpay_signature
    )
    if (hasVerification) {
      return {
        data: {
          ...currentData,
          amount: newPaise,
          key_id: this.options_.key_id,
        },
      }
    }

    const existingAmount = currentData.amount
    const isKeyMismatched = Boolean(currentData.key_id && currentData.key_id !== this.options_.key_id)
    const isAmountUnchanged =
      existingAmount !== undefined &&
      Number(existingAmount) === newPaise &&
      Boolean(currentData.razorpay_order_id) &&
      !isKeyMismatched

    // If order exists and total amount has not changed, merge incoming data and keep existing order
    if (isAmountUnchanged) {
      return {
        data: {
          ...currentData,
          amount: newPaise,
          key_id: this.options_.key_id,
        },
      }
    }

    // Amount changed or order not created yet: create a new Razorpay order
    const sessionId = (currentData.session_id as string) || (currentData.id as string) || ""
    if (!sessionId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Cannot update Razorpay payment: session_id is required"
      )
    }

    const order = await this.client_.orders.create({
      amount: newPaise,
      currency,
      receipt: context?.idempotency_key
        ? String(context.idempotency_key).slice(0, 40)
        : undefined,
      notes: {
        session_id: sessionId,
      },
    })

    const cleanData = { ...currentData }
    delete cleanData.razorpay_order_id
    delete cleanData.amount
    delete cleanData.currency
    delete cleanData.webhook_verified

    return {
      data: {
        ...cleanData,
        razorpay_order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        status: order.status,
        key_id: this.options_.key_id,
      },
    }
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const paymentId = input.data?.razorpay_payment_id as string | undefined
    if (!paymentId) {
      return { status: PaymentSessionStatus.PENDING, data: input.data }
    }

    try {
      const payment = await this.client_.payments.fetch(paymentId)
      if (payment.status === "captured") {
        return { status: PaymentSessionStatus.CAPTURED, data: { ...input.data, ...payment } }
      }
      if (payment.status === "authorized") {
        return { status: PaymentSessionStatus.AUTHORIZED, data: { ...input.data, ...payment } }
      }
      if (payment.status === "failed") {
        return { status: PaymentSessionStatus.ERROR, data: { ...input.data, ...payment } }
      }
      return { status: PaymentSessionStatus.PENDING, data: { ...input.data, ...payment } }
    } catch (error: any) {
      this.logger_?.error?.(
        `[Razorpay] Failed to get payment status for ${paymentId}: ${error?.message || error}`
      )
      return { status: PaymentSessionStatus.PENDING, data: input.data }
    }
  }

  // Webhook handler (POST /hooks/payment/pp_razorpay_razorpay)
  async getWebhookActionAndData(payload: ProviderWebhookPayload["payload"]): Promise<WebhookActionResult> {
    const { data, rawData, headers } = payload
    const signature = headers?.["x-razorpay-signature"] as string | undefined

    if (!signature) {
      this.logger_?.warn?.(
        "[Razorpay Webhook] Rejected: missing x-razorpay-signature header"
      )
      return { action: PaymentActions.NOT_SUPPORTED }
    }

    if (!this.options_.webhook_secret) {
      this.logger_?.warn?.(
        "[Razorpay Webhook] Rejected: missing webhook_secret in options"
      )
      return { action: PaymentActions.NOT_SUPPORTED }
    }

    const expected = crypto
      .createHmac("sha256", this.options_.webhook_secret)
      .update(rawData as any)
      .digest("hex")

    const sigBuf = Buffer.from(signature)
    const expBuf = Buffer.from(expected)

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      this.logger_?.warn?.(
        `[Razorpay Webhook] Rejected: invalid signature (event=${data?.event || "unknown"})`
      )
      return { action: PaymentActions.NOT_SUPPORTED }
    }

    const event = data?.event as string
    const paymentEntity = (data?.payload as any)?.payment?.entity
    const orderEntity = (data?.payload as any)?.order?.entity
    const entity = paymentEntity || orderEntity
    const paymentId = paymentEntity?.id || "unknown"
    const orderId = entity?.order_id || orderEntity?.id || "unknown"
    const sessionId =
      entity?.notes?.session_id ||
      paymentEntity?.notes?.session_id ||
      orderEntity?.notes?.session_id

    if (!entity || !sessionId) {
      this.logger_?.warn?.(
        `[Razorpay Webhook] Ignored: missing session_id (event=${event || "unknown"}, payment_id=${paymentId}, order_id=${orderId})`
      )
      return { action: PaymentActions.NOT_SUPPORTED }
    }

    const amount = fromPaise(entity.amount_paid ?? entity.amount)

    switch (event) {
      case "payment.authorized":
        return {
          action: PaymentActions.AUTHORIZED,
          data: {
            session_id: sessionId,
            amount,
          },
        }
      case "payment.captured":
      case "order.paid":
        return {
          action: PaymentActions.SUCCESSFUL,
          data: {
            session_id: sessionId,
            amount,
          },
        }
      case "payment.failed":
        return {
          action: PaymentActions.FAILED,
          data: {
            session_id: sessionId,
            amount,
          },
        }
      case "refund.processed":
      case "refund.failed":
        // Medusa's PaymentActions does not include refund actions (only authorized, captured, failed,
        // canceled, pending, requires_more, not_supported, pending_authorization). Returning any of these
        // would mutate the cart/payment session status incorrectly. Intentionally unhandled.
        this.logger_?.info?.(
          `[Razorpay Webhook] Event '${event}' intentionally unhandled: Medusa PaymentActions lacks refund action support (payment_id=${paymentId}, order_id=${orderId})`
        )
        return { action: PaymentActions.NOT_SUPPORTED }
      default:
        this.logger_?.info?.(
          `[Razorpay Webhook] Ignored: unsupported event type '${event}' (payment_id=${paymentId}, order_id=${orderId})`
        )
        return { action: PaymentActions.NOT_SUPPORTED }
    }
  }
}

export default RazorpayProviderService

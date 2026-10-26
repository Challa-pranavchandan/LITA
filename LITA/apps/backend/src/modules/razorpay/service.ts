import {
  AbstractPaymentProvider,
  BigNumber,
  MathBN,
  MedusaError,
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

  constructor(container: Record<string, unknown>, options: RazorpayOptions) {
    super(container, options)
    this.options_ = options
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
  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const { amount, currency_code, data, context } = input
    const paise = toPaise(amount)
    const sessionId = (data?.session_id as string) || (data?.id as string) || ""

    const order = await this.client_.orders.create({
      amount: paise,
      currency: String(currency_code).toUpperCase(),
      receipt: context?.idempotency_key
        ? String(context.idempotency_key).slice(0, 40)
        : undefined,
      notes: {
        session_id: sessionId,
      },
    })

    return {
      id: order.id,
      data: {
        ...(data ?? {}),
        razorpay_order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        status: order.status,
      },
    }
  }

  // Called during cart completion. Validates Razorpay HMAC signature.
  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      (input.data ?? {}) as Record<string, any>

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
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
        razorpay_signature,
      },
    }
  }

  // Auto-capture on => payment is already captured. Otherwise capture it.
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
    } catch {
      return { data: input.data }
    }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const { data, amount } = input
    const paymentId = data?.razorpay_payment_id as string | undefined
    if (!paymentId) {
      return { data: input.data }
    }

    const refund = await this.client_.payments.refund(paymentId, {
      amount: toPaise(amount),
    })

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
    } catch {
      return { data: input.data }
    }
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    const { amount, currency_code, data, context } = input
    const currentData = (data ?? {}) as Record<string, any>
    const newPaise = toPaise(amount)

    const existingAmount = currentData.amount
    const isAmountUnchanged =
      existingAmount !== undefined &&
      Number(existingAmount) === newPaise &&
      Boolean(currentData.razorpay_order_id)

    // If order exists and total amount has not changed, merge incoming data and keep existing order
    if (isAmountUnchanged) {
      return {
        data: {
          ...currentData,
        },
      }
    }

    // Amount changed or order not created yet: create a new Razorpay order
    const sessionId = (currentData.session_id as string) || (currentData.id as string) || ""
    const order = await this.client_.orders.create({
      amount: newPaise,
      currency: String(currency_code).toUpperCase(),
      receipt: context?.idempotency_key
        ? String(context.idempotency_key).slice(0, 40)
        : undefined,
      notes: {
        session_id: sessionId,
      },
    })

    return {
      data: {
        ...currentData,
        razorpay_order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        status: order.status,
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
    } catch {
      return { status: PaymentSessionStatus.PENDING, data: input.data }
    }
  }

  // Webhook handler (POST /hooks/payment/razorpay_razorpay)
  async getWebhookActionAndData(payload: ProviderWebhookPayload["payload"]): Promise<WebhookActionResult> {
    const { data, rawData, headers } = payload
    const signature = headers?.["x-razorpay-signature"] as string | undefined

    if (!signature || !this.options_.webhook_secret) {
      return { action: PaymentActions.NOT_SUPPORTED }
    }

    const expected = crypto
      .createHmac("sha256", this.options_.webhook_secret)
      .update(rawData as any)
      .digest("hex")

    const sigBuf = Buffer.from(signature)
    const expBuf = Buffer.from(expected)

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return { action: PaymentActions.NOT_SUPPORTED }
    }

    const event = data?.event as string
    const entity = (data?.payload as any)?.payment?.entity
    const sessionId = entity?.notes?.session_id

    if (!entity || !sessionId) {
      return { action: PaymentActions.NOT_SUPPORTED }
    }

    const amount = fromPaise(entity.amount)

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
      default:
        return { action: PaymentActions.NOT_SUPPORTED }
    }
  }
}

export default RazorpayProviderService

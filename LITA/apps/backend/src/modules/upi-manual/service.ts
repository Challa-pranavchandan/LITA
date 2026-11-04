import {
  AbstractPaymentProvider,
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
import crypto from "crypto"

export type UpiManualOptions = {
  vpa: string
  payee_name: string
  expiry_hours: number
}

const CLIENT_CONTROLLED_KEYS = [
  "reference_code",
  "status",
  "verified",
  "amount",
  "captured_at",
  "refunds",
]

function stripClientControlledData(
  data?: Record<string, unknown>
): Record<string, unknown> {
  const cleanData = { ...(data ?? {}) }
  for (const key of CLIENT_CONTROLLED_KEYS) {
    delete cleanData[key]
  }
  return cleanData
}

export class UpiManualProviderService extends AbstractPaymentProvider<UpiManualOptions> {
  static identifier = "upimanual"

  protected options_: UpiManualOptions

  constructor(container: Record<string, unknown>, options: UpiManualOptions) {
    super(container, options)
    this.options_ = options
  }

  static validateOptions(options: Record<string, unknown>): void {
    if (typeof options.vpa !== "string" || !options.vpa.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "UPI manual option 'vpa' is required"
      )
    }

    if (typeof options.payee_name !== "string" || !options.payee_name.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "UPI manual option 'payee_name' is required"
      )
    }

    if (
      options.expiry_hours !== undefined &&
      (typeof options.expiry_hours !== "number" ||
        !Number.isFinite(options.expiry_hours) ||
      !Number.isInteger(options.expiry_hours) ||
      options.expiry_hours < 6 ||
      options.expiry_hours > 168)
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "UPI manual option 'expiry_hours' must be an integer between 6 and 168"
      )
    }
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const currency = String(input.currency_code || "").toUpperCase()
    if (currency !== "INR") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Cannot initiate UPI manual payment: currency must be INR (received: ${input.currency_code})`
      )
    }

    const cleanData = stripClientControlledData(input.data)
    const sessionId =
      typeof cleanData.session_id === "string" && cleanData.session_id
        ? cleanData.session_id
        : typeof cleanData.id === "string" && cleanData.id
          ? cleanData.id
          : crypto.randomUUID()

    return {
      id: sessionId,
      data: {
        ...cleanData,
        method: "upi_manual",
        vpa: this.options_.vpa,
        payee_name: this.options_.payee_name,
        expiry_hours: this.options_.expiry_hours,
      },
    }
  }

  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    return {
      status: PaymentSessionStatus.AUTHORIZED,
      data: input.data,
    }
  }

  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    if (input.data?.verified !== true) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "UPI manual payment must be verified before it can be captured"
      )
    }

    return {
      data: {
        ...input.data,
        captured_at: new Date().toISOString(),
      },
    }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const data = input.data ?? {}
    const refunds = Array.isArray(data.refunds) ? data.refunds : []

    return {
      data: {
        ...data,
        refunds: [
          ...refunds,
          {
            amount: String(input.amount),
            refunded_at: new Date().toISOString(),
          },
        ],
      },
    }
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    return { data: input.data }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: input.data }
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    const cleanData = stripClientControlledData(input.data)

    return {
      data: {
        ...cleanData,
        method: "upi_manual",
        vpa: this.options_.vpa,
        payee_name: this.options_.payee_name,
        expiry_hours: this.options_.expiry_hours,
      },
    }
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    return { data: input.data }
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    return {
      status: input.data?.captured_at
        ? PaymentSessionStatus.CAPTURED
        : PaymentSessionStatus.AUTHORIZED,
      data: input.data,
    }
  }

  async getWebhookActionAndData(
    _payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    return { action: PaymentActions.NOT_SUPPORTED }
  }
}

export default UpiManualProviderService

import { MedusaError } from "@medusajs/framework/utils"
import { signProofToken } from "../../../../lib/upi"
import { GET as getByOrder } from "../by-order/[order_id]/route"
import { POST as submitProof } from "../[reference]/proof/route"
import { POST as createUploadUrl } from "../[reference]/upload-url/route"
import {
  ensureUpiPaymentForOrderWorkflow,
  submitUpiProofWorkflow,
} from "../../../../workflows/upi-payments"
import { getPresignedUploadUrl } from "../../../../lib/r2"
import { verifyTurnstileToken } from "../../../../lib/turnstile"

jest.mock("../../../../workflows/upi-payments", () => ({
  ensureUpiPaymentForOrderWorkflow: jest.fn(),
  submitUpiProofWorkflow: jest.fn(),
}))
jest.mock("../../../../lib/r2", () => ({
  getPresignedUploadUrl: jest.fn(),
}))
jest.mock("../../../../lib/turnstile", () => ({
  verifyTurnstileToken: jest.fn(),
}))

const ensureRun = ensureUpiPaymentForOrderWorkflow as unknown as jest.Mock
const submitRun = submitUpiProofWorkflow as unknown as jest.Mock
const uploadSigner = getPresignedUploadUrl as jest.Mock
const turnstile = verifyTurnstileToken as jest.Mock

const payment = {
  id: "upi_123",
  reference_code: "LITA-ABC234",
  order_id: "order_123",
  customer_id: "cus_123",
  status: "awaiting_proof",
  amount: 1250,
  currency_code: "inr",
  expires_at: new Date(Date.now() + 60 * 60 * 1000),
  attempts: 0,
  utr: null,
  screenshot_key: null,
  payer_vpa: null,
  reject_reason: null,
}

function createRequest({
  ref = payment.reference_code,
  body = {},
  records = [payment],
  token = signProofToken(payment.reference_code, payment.order_id),
  customerId,
}: {
  ref?: string
  body?: Record<string, unknown>
  records?: typeof payment[]
  token?: string
  customerId?: string
} = {}) {
  const paymentService = {
    listUpiPayments: jest.fn().mockResolvedValue(records),
  }
  const logger = { error: jest.fn(), info: jest.fn(), warn: jest.fn() }
  return {
    req: {
      params: { reference: ref, order_id: payment.order_id },
      headers: token ? { "x-upi-token": token } : {},
      auth_context: customerId ? { actor_id: customerId } : undefined,
      validatedBody: body,
      scope: {
        resolve: jest.fn((key: string) =>
          key === "upi_payment" ? paymentService : logger
        ),
      },
    },
    paymentService,
    logger,
  }
}

function createResponse() {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
  }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  return res
}

describe("UPI store payment routes", () => {
  const originalFlag = process.env.ENABLE_UPI_MANUAL
  const originalJwtSecret = process.env.JWT_SECRET

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.ENABLE_UPI_MANUAL = "true"
    process.env.JWT_SECRET = "test-jwt-secret"
    process.env.UPI_VPA = "lita@example"
    process.env.UPI_PAYEE_NAME = "LITA"
    turnstile.mockResolvedValue({ success: true })
    uploadSigner.mockResolvedValue("https://r2.example/presigned")
    ensureRun.mockReturnValue({
      run: jest.fn().mockResolvedValue({
        result: {
          ...payment,
          email: "private@example.com",
          utr: "123456789012",
        },
      }),
    })
    submitRun.mockReturnValue({
      run: jest.fn().mockResolvedValue({
        result: { status: "submitted", submitted_at: new Date(), attempts: 1 },
      }),
    })
  })

  afterAll(() => {
    process.env.ENABLE_UPI_MANUAL = originalFlag
    process.env.JWT_SECRET = originalJwtSecret
  })

  it("returns 404 for every UPI route when the feature flag is off", async () => {
    process.env.ENABLE_UPI_MANUAL = "false"
    const { req } = createRequest()
    const res = createResponse()

    await submitProof(req as never, res as never)

    expect(res.status).toHaveBeenCalledWith(404)
  })

  it.each(["missing", "invalid"])(
    "returns 401 for a %s proof token",
    async (tokenType) => {
      const { req } = createRequest({
        token: tokenType === "missing" ? "" : "invalid-token",
      })
      const res = createResponse()

      await submitProof(req as never, res as never)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(submitRun).not.toHaveBeenCalled()
    }
  )

  it("returns not found for a wrong reference", async () => {
    const { req } = createRequest({ ref: "LITA-WRONG", records: [] })
    const res = createResponse()

    await submitProof(req as never, res as never)

    expect(res.status).toHaveBeenCalledWith(404)
  })

  it("silently acknowledges a honeypot without writing proof", async () => {
    const { req } = createRequest({ body: { website: "bot-filled" } })
    const res = createResponse()

    await submitProof(req as never, res as never)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(submitRun).not.toHaveBeenCalled()
  })

  it("maps invalid UTR validation to 400", async () => {
    submitRun.mockReturnValue({
      run: jest.fn().mockRejectedValue(
        new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "UTR must contain exactly 12 digits."
        )
      ),
    })
    const { req } = createRequest({
      body: { utr: "abc", turnstile_token: "test-pass-proof" },
    })
    const res = createResponse()

    await submitProof(req as never, res as never)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it("maps duplicate UTR conflicts to 409 without disclosing the other record", async () => {
    submitRun.mockReturnValue({
      run: jest.fn().mockRejectedValue(
        new MedusaError(
          MedusaError.Types.CONFLICT,
          "This UTR is already linked to another order"
        )
      ),
    })
    const { req } = createRequest({
      body: { utr: "123456789012", turnstile_token: "test-pass-proof" },
    })
    const res = createResponse()

    await submitProof(req as never, res as never)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith({
      message: "This UTR is already linked to another order",
    })
  })

  it("rejects screenshot keys outside the reference prefix", async () => {
    submitRun.mockReturnValue({
      run: jest.fn().mockRejectedValue(
        new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Screenshot key is outside this payment's upload directory."
        )
      ),
    })
    const { req } = createRequest({
      body: {
        screenshot_key: "upi-proofs/another-reference/proof.png",
        turnstile_token: "test-pass-proof",
      },
    })
    const res = createResponse()

    await submitProof(req as never, res as never)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it("returns 410 for expired payments", async () => {
    submitRun.mockReturnValue({
      run: jest.fn().mockRejectedValue(
        new MedusaError(MedusaError.Types.NOT_FOUND, "This UPI payment has expired.")
      ),
    })
    const { req } = createRequest({
      body: { utr: "123456789012", turnstile_token: "test-pass-proof" },
    })
    const res = createResponse()

    await submitProof(req as never, res as never)

    expect(res.status).toHaveBeenCalledWith(410)
  })

  it("returns 409 for verified payments", async () => {
    submitRun.mockReturnValue({
      run: jest.fn().mockRejectedValue(
        new MedusaError(
          MedusaError.Types.CONFLICT,
          "This UPI payment has already been verified."
        )
      ),
    })
    const { req } = createRequest({
      body: { utr: "123456789012", turnstile_token: "test-pass-proof" },
    })
    const res = createResponse()

    await submitProof(req as never, res as never)

    expect(res.status).toHaveBeenCalledWith(409)
  })

  it("returns 429 when the proof attempt cap is reached", async () => {
    submitRun.mockReturnValue({
      run: jest.fn().mockRejectedValue(
        new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "UPI proof submission limit reached. Try again later."
        )
      ),
    })
    const { req } = createRequest({
      body: { utr: "123456789012", turnstile_token: "test-pass-proof" },
    })
    const res = createResponse()

    await submitProof(req as never, res as never)

    expect(res.status).toHaveBeenCalledWith(429)
  })

  it("returns only the public projection from the order lookup", async () => {
    const { req } = createRequest()
    const res = createResponse()

    await getByOrder(req as never, res as never)

    expect(res.status).toHaveBeenCalledWith(200)
    const responseBody = res.json.mock.calls[0][0]
    expect(responseBody).toMatchObject({
      reference_code: payment.reference_code,
      amount: payment.amount,
      currency_code: payment.currency_code,
      utr_last4: "9012",
    })
    expect(responseBody).not.toHaveProperty("email")
    expect(responseBody).not.toHaveProperty("customer_id")
    expect(responseBody).not.toHaveProperty("utr")
    expect(Object.keys(responseBody).sort()).toEqual(
      [
        "reference_code",
        "amount",
        "currency_code",
        "status",
        "expires_at",
        "reject_reason",
        "vpa",
        "payee_name",
        "upi_link",
        "proof_token",
        "has_screenshot",
        "utr_last4",
      ].sort()
    )
  })

  it("validates upload MIME type and size before signing", async () => {
    const invalidMime = createRequest({
      body: { filename: "proof.svg", contentType: "image/svg+xml", size: 1024 },
    })
    const mimeResponse = createResponse()
    await createUploadUrl(invalidMime.req as never, mimeResponse as never)
    expect(mimeResponse.status).toHaveBeenCalledWith(400)

    const invalidSize = createRequest({
      body: { filename: "proof.png", contentType: "image/png", size: 5 * 1024 * 1024 + 1 },
    })
    const sizeResponse = createResponse()
    await createUploadUrl(invalidSize.req as never, sizeResponse as never)
    expect(sizeResponse.status).toHaveBeenCalledWith(400)
    expect(uploadSigner).not.toHaveBeenCalled()
  })
})

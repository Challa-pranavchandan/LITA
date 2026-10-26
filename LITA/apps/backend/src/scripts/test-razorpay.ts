import crypto from "crypto"
import { PaymentActions, PaymentSessionStatus } from "@medusajs/framework/utils"
import {
  RazorpayProviderService,
  toPaise,
  fromPaise,
} from "../modules/razorpay/service"

async function runTests() {
  console.log("=== Running Razorpay Provider Tests ===")

  // 1. toPaise tests
  console.log("\n1. Testing toPaise & fromPaise...")
  if (toPaise(499) !== 49900) throw new Error("toPaise(499) failed")
  if (toPaise("499") !== 49900) throw new Error("toPaise('499') failed")
  if (toPaise(499.5) !== 49950) throw new Error("toPaise(499.5) failed")
  if (toPaise(499.99) !== 49999) throw new Error("toPaise(499.99) failed")
  if (toPaise("10.05") !== 1005) throw new Error("toPaise('10.05') failed")
  if (fromPaise(49900).numeric !== 499) throw new Error("fromPaise(49900) failed")
  if (fromPaise(49950).numeric !== 499.5) throw new Error("fromPaise(49950) failed")
  console.log("   [PASS] toPaise and fromPaise conversions verified")

  // 2. validateOptions tests
  console.log("\n2. Testing validateOptions...")
  try {
    RazorpayProviderService.validateOptions({
      key_id: "test_key",
      key_secret: "test_secret",
      webhook_secret: "test_webhook",
    })
    console.log("   [PASS] validateOptions accepted valid options")
  } catch (e: any) {
    throw new Error("validateOptions threw unexpectedly on valid options: " + e.message)
  }

  let threwMissingKey = false
  try {
    RazorpayProviderService.validateOptions({
      key_secret: "test_secret",
      webhook_secret: "test_webhook",
    })
  } catch {
    threwMissingKey = true
  }
  if (!threwMissingKey) throw new Error("validateOptions should have thrown on missing key_id")
  console.log("   [PASS] validateOptions rejected missing key_id")

  // 3. Service initialization
  const options = {
    key_id: "rzp_test_mock12345",
    key_secret: "mock_secret_abcdef12345",
    webhook_secret: "mock_webhook_secret_xyz789",
  }
  const service = new RazorpayProviderService({}, options)

  // 4. authorizePayment HMAC signature verification
  console.log("\n3. Testing authorizePayment signature verification...")
  const orderId = "order_rzp_mock_111"
  const paymentId = "pay_rzp_mock_222"
  const validSignature = crypto
    .createHmac("sha256", options.key_secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex")

  const authSuccess = await service.authorizePayment({
    data: {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: validSignature,
    },
  })
  if (authSuccess.status !== PaymentSessionStatus.AUTHORIZED) {
    throw new Error(`Expected status AUTHORIZED, got: ${authSuccess.status}`)
  }
  console.log("   [PASS] Valid HMAC signature correctly AUTHORIZED")

  const authTampered = await service.authorizePayment({
    data: {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: "tampered_signature_hex_00000000000000000000000000000000",
    },
  })
  if (authTampered.status !== PaymentSessionStatus.ERROR) {
    throw new Error(`Expected status ERROR for tampered signature, got: ${authTampered.status}`)
  }
  console.log("   [PASS] Tampered HMAC signature correctly rejected with ERROR")

  const authMissing = await service.authorizePayment({
    data: {
      razorpay_order_id: orderId,
    },
  })
  if (authMissing.status !== PaymentSessionStatus.REQUIRES_MORE) {
    throw new Error(`Expected REQUIRES_MORE when fields missing, got: ${authMissing.status}`)
  }
  console.log("   [PASS] Missing payment fields correctly returned REQUIRES_MORE")

  // 5. Webhook signature and event mapping
  console.log("\n4. Testing getWebhookActionAndData...")
  const createWebhook = (event: string, entity: Record<string, any>) => {
    const rawData = JSON.stringify({
      event,
      payload: { payment: { entity } },
    })
    const signature = crypto
      .createHmac("sha256", options.webhook_secret)
      .update(rawData)
      .digest("hex")
    return {
      rawData,
      data: JSON.parse(rawData),
      headers: { "x-razorpay-signature": signature },
    }
  }

  // payment.authorized webhook
  const whAuth = createWebhook("payment.authorized", {
    id: "pay_wh_1",
    amount: 99900,
    notes: { session_id: "sess_wh_1" },
  })
  const resWhAuth = await service.getWebhookActionAndData(whAuth as any)
  if (resWhAuth.action !== PaymentActions.AUTHORIZED) {
    throw new Error(`Expected action 'authorized', got ${resWhAuth.action}`)
  }
  if (resWhAuth.data?.session_id !== "sess_wh_1" || (resWhAuth.data?.amount as any).numeric !== 999) {
    throw new Error(`Webhook authorized data mismatch: ${JSON.stringify(resWhAuth.data)}`)
  }
  console.log("   [PASS] payment.authorized webhook mapped to PaymentActions.AUTHORIZED (₹999)")

  // payment.captured webhook
  const whCap = createWebhook("payment.captured", {
    id: "pay_wh_2",
    amount: 149950,
    notes: { session_id: "sess_wh_2" },
  })
  const resWhCap = await service.getWebhookActionAndData(whCap as any)
  if (resWhCap.action !== PaymentActions.SUCCESSFUL) {
    throw new Error(`Expected action 'captured', got ${resWhCap.action}`)
  }
  if ((resWhCap.data?.amount as any).numeric !== 1499.5) {
    throw new Error(`Webhook captured amount mismatch: ${(resWhCap.data?.amount as any).numeric}`)
  }
  console.log("   [PASS] payment.captured webhook mapped to PaymentActions.SUCCESSFUL (₹1499.50)")

  // payment.failed webhook
  const whFail = createWebhook("payment.failed", {
    id: "pay_wh_3",
    amount: 99900,
    notes: { session_id: "sess_wh_3" },
  })
  const resWhFail = await service.getWebhookActionAndData(whFail as any)
  if (resWhFail.action !== PaymentActions.FAILED) {
    throw new Error(`Expected action 'failed', got ${resWhFail.action}`)
  }
  console.log("   [PASS] payment.failed webhook mapped to PaymentActions.FAILED")

  // Invalid webhook signature
  const whInvalid = createWebhook("payment.captured", {
    id: "pay_wh_4",
    amount: 50000,
    notes: { session_id: "sess_wh_4" },
  })
  whInvalid.headers["x-razorpay-signature"] = "tampered_sig"
  const resWhInvalid = await service.getWebhookActionAndData(whInvalid as any)
  if (resWhInvalid.action !== PaymentActions.NOT_SUPPORTED) {
    throw new Error(`Expected not_supported for tampered webhook, got ${resWhInvalid.action}`)
  }
  console.log("   [PASS] Tampered webhook signature correctly ignored (NOT_SUPPORTED)")

  // 6. updatePayment idempotency (same amount => no new order)
  console.log("\n5. Testing updatePayment unchanged amount behavior...")
  const updateRes = await service.updatePayment({
    amount: 499,
    currency_code: "inr",
    data: {
      razorpay_order_id: "order_existing_123",
      amount: 49900,
      session_id: "ps_existing",
      razorpay_payment_id: "pay_xyz",
    },
  })
  if (updateRes.data?.razorpay_order_id !== "order_existing_123" || updateRes.data?.razorpay_payment_id !== "pay_xyz") {
    throw new Error("updatePayment failed to preserve existing order and payment data")
  }
  console.log("   [PASS] updatePayment correctly preserves existing order & payment details when amount unchanged")

  console.log("\n>>> ALL RAZORPAY PROVIDER UNIT TESTS PASSED SUCCESSFULLY! <<<\n")
}

runTests().catch((err) => {
  console.error("Test failed with error:", err)
  process.exit(1)
})

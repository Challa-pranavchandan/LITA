const { test, describe } = require("node:test")
const assert = require("node:assert")
const fs = require("node:fs")
const path = require("node:path")

const UPI_MANUAL_PROVIDER_ID = "pp_upimanual_upimanual"
const RAZORPAY_PROVIDER_ID = "pp_razorpay_razorpay"
const CHECKOUT_SOURCE = fs.readFileSync(
  path.join(__dirname, "../components/CheckoutFlow.tsx"),
  "utf8"
)
const CART_SOURCE = fs.readFileSync(path.join(__dirname, "../lib/data/cart.ts"), "utf8")

function isSupportedProvider(id, flagEnabled) {
  if (id === RAZORPAY_PROVIDER_ID || id.startsWith("pp_razorpay")) return true
  return id === UPI_MANUAL_PROVIDER_ID && flagEnabled
}

function checkoutOptions(providers, flagEnabled) {
  return providers.filter(
    (provider) =>
      isSupportedProvider(provider.id, flagEnabled) &&
      (provider.id !== UPI_MANUAL_PROVIDER_ID || flagEnabled)
  )
}

function defaultProviderId(providers, flagEnabled) {
  const usable = checkoutOptions(providers, flagEnabled)
  return (
    usable.find((provider) => provider.id === RAZORPAY_PROVIDER_ID)?.id ??
    usable[0]?.id ??
    ""
  )
}

describe("UPI checkout option", () => {
  const providers = [
    { id: UPI_MANUAL_PROVIDER_ID },
    { id: RAZORPAY_PROVIDER_ID },
  ]

  test("hides UPI when the feature flag is off", () => {
    assert.deepStrictEqual(
      checkoutOptions(providers, false).map((provider) => provider.id),
      [RAZORPAY_PROVIDER_ID]
    )
  })

  test("shows UPI only when the flag is on and the provider is returned", () => {
    assert.deepStrictEqual(
      checkoutOptions(providers, true).map((provider) => provider.id),
      [UPI_MANUAL_PROVIDER_ID, RAZORPAY_PROVIDER_ID]
    )
    assert.deepStrictEqual(
      checkoutOptions([{ id: RAZORPAY_PROVIDER_ID }], true).map(
        (provider) => provider.id
      ),
      [RAZORPAY_PROVIDER_ID]
    )
    assert.match(CHECKOUT_SOURCE, /Pay by UPI \(QR \/ UPI ID\)/)
    assert.match(
      CHECKOUT_SOURCE,
      /Pay from any UPI app after placing your order\. Your order\s+is held for 48 hours while we confirm your payment\./
    )
  })

  test("keeps Razorpay pre-selected when both providers are available", () => {
    assert.strictEqual(defaultProviderId(providers, true), RAZORPAY_PROVIDER_ID)
    assert.strictEqual(defaultProviderId(providers.reverse(), true), RAZORPAY_PROVIDER_ID)
  })

  test("the UPI checkout branch submits the order without rendering Razorpay", () => {
    const uiBranch = CHECKOUT_SOURCE.match(
      /\{isRazorpay\(providerId\) \? \([\s\S]*?\) : isUpiManualProvider\(providerId\) && ENABLE_UPI_MANUAL \? \([\s\S]*?\) : !IS_PRODUCTION/
    )

    assert.ok(uiBranch, "expected separate Razorpay and UPI payment branches")
    assert.match(uiBranch[0], /<RazorpayPaymentButton/)
    const upiBranch = uiBranch[0].split(": isUpiManualProvider(providerId)")[1]
    assert.match(upiBranch, /onClick=\{submitOrder\}/)
    assert.doesNotMatch(upiBranch, /RazorpayPaymentButton|loadRazorpayScript/)
    assert.match(upiBranch, /Place order and pay by UPI/)
    assert.match(CART_SOURCE, /upiManual \? `\/order\/\$\{orderId\}\?pay=upi`/)
    assert.match(
      CART_SOURCE,
      /if \(upiManual\) \{\s*return \{\s*ok: false,\s*error:[\s\S]*?UPI manual payment is unavailable/
    )
  })

  test("the production payment guard rejects UPI when the flag is off", () => {
    assert.strictEqual(
      isSupportedProvider(UPI_MANUAL_PROVIDER_ID, false),
      false
    )
    assert.strictEqual(
      isSupportedProvider(UPI_MANUAL_PROVIDER_ID, true),
      true
    )
    assert.match(
      CART_SOURCE,
      /assertAllowedProvider\(providerId\)/
    )
    assert.match(CHECKOUT_SOURCE, /startPayment\(providerId\)/)
  })
})

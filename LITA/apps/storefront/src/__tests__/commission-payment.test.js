const { test, describe } = require("node:test")
const assert = require("node:assert")
const fs = require("node:fs")
const path = require("node:path")

describe("Storefront Commission Payment Flow (B10)", () => {
  test("commission.ts exports payment session initialization and completion actions", () => {
    const commissionSource = fs.readFileSync(
      path.resolve(__dirname, "../lib/data/commission.ts"),
      "utf8"
    )
    assert.strictEqual(
      commissionSource.includes("export async function initCommissionPaymentSession"),
      true,
      "Expected commission.ts to export initCommissionPaymentSession"
    )
    assert.strictEqual(
      commissionSource.includes("export async function completeCommissionPayment"),
      true,
      "Expected commission.ts to export completeCommissionPayment"
    )
    assert.strictEqual(
      commissionSource.includes("/store/commissions/${id}/payment-session"),
      true,
      "Expected commission.ts to call /store/commissions/:id/payment-session"
    )
    assert.strictEqual(
      commissionSource.includes("/store/commissions/${id}/pay"),
      true,
      "Expected commission.ts to call /store/commissions/:id/pay"
    )
  })

  test("commission.ts requires customer authentication headers before payment initiation", () => {
    const commissionSource = fs.readFileSync(
      path.resolve(__dirname, "../lib/data/commission.ts"),
      "utf8"
    )
    assert.strictEqual(
      commissionSource.includes("authHeaders.authorization"),
      true,
      "Expected commission.ts to check authHeaders.authorization"
    )
  })

  test("AccountDashboard.tsx integrates CommissionPayButton and handles awaiting_payment and paid statuses", () => {
    const dashboardSource = fs.readFileSync(
      path.resolve(__dirname, "../components/auth/AccountDashboard.tsx"),
      "utf8"
    )
    assert.strictEqual(
      dashboardSource.includes("CommissionPayButton"),
      true,
      "Expected AccountDashboard.tsx to import CommissionPayButton"
    )
    assert.strictEqual(
      dashboardSource.includes("c.status === \"awaiting_payment\""),
      true,
      "Expected AccountDashboard.tsx to check awaiting_payment status"
    )
    assert.strictEqual(
      dashboardSource.includes("c.status === \"paid\""),
      true,
      "Expected AccountDashboard.tsx to check paid status"
    )
  })

  test("Dedicated commission checkout page enforces authentication and displays all-inclusive summary", () => {
    const pageSource = fs.readFileSync(
      path.resolve(__dirname, "../app/account/commissions/[id]/pay/page.tsx"),
      "utf8"
    )
    assert.strictEqual(
      pageSource.includes("getCustomer()"),
      true,
      "Expected commission pay page to check customer session"
    );
    assert.strictEqual(
      pageSource.includes("CommissionPayButton"),
      true,
      "Expected commission pay page to render CommissionPayButton"
    );
    assert.strictEqual(
      pageSource.includes("GST"),
      true,
      "Expected commission pay page to indicate GST inclusion"
    );
  })

  test("CommissionPayButton handles Razorpay checkout SDK loading and verification states", () => {
    const buttonSource = fs.readFileSync(
      path.resolve(__dirname, "../components/commission/CommissionPayButton.tsx"),
      "utf8"
    )
    assert.strictEqual(
      buttonSource.includes("checkout.razorpay.com/v1/checkout.js"),
      true,
      "Expected CommissionPayButton to load official Razorpay SDK"
    )
    assert.strictEqual(
      buttonSource.includes("#5f2f3c"),
      true,
      "Expected CommissionPayButton to use brand color #5f2f3c in Razorpay theme"
    )
    assert.strictEqual(
      buttonSource.includes("Payment received! Confirming with studio atelier..."),
      true,
      "Expected CommissionPayButton to show clear confirming state"
    )
  })
})

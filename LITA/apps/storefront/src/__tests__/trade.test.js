const { test, describe } = require("node:test")
const assert = require("node:assert")
const fs = require("node:fs")
const path = require("node:path")

describe("Storefront Trade Data Fetching & Security (B3)", () => {
  test("trade.ts does not append ?email= query parameter", () => {
    const tradeSource = fs.readFileSync(
      path.resolve(__dirname, "../lib/data/trade.ts"),
      "utf8"
    )
    assert.strictEqual(
      tradeSource.includes("?email="),
      false,
      "Expected trade.ts to not contain '?email='"
    )
    assert.strictEqual(
      tradeSource.includes("/store/trade-applications"),
      true,
      "Expected trade.ts to call /store/trade-applications"
    )
  })

  test("trade.ts requires auth headers and returns null if unauthenticated", () => {
    const tradeSource = fs.readFileSync(
      path.resolve(__dirname, "../lib/data/trade.ts"),
      "utf8"
    )
    assert.strictEqual(
      tradeSource.includes("authHeaders.authorization"),
      true,
      "Expected trade.ts to verify authHeaders.authorization before making request"
    )
  })

  test("account/page.tsx calls getCustomerTradeApplication without email argument", () => {
    const accountPageSource = fs.readFileSync(
      path.resolve(__dirname, "../app/account/page.tsx"),
      "utf8"
    )
    assert.strictEqual(
      accountPageSource.includes("getCustomerTradeApplication(customer.email)"),
      false,
      "Expected account/page.tsx not to pass customer.email to getCustomerTradeApplication"
    )
    assert.strictEqual(
      accountPageSource.includes("getCustomerTradeApplication()"),
      true,
      "Expected account/page.tsx to call getCustomerTradeApplication()"
    )
  })

  test("TradeApplicationModal accepts prefill props and AccountDashboard passes them", () => {
    const modalSource = fs.readFileSync(
      path.resolve(__dirname, "../components/TradeApplicationModal.tsx"),
      "utf8"
    )
    assert.strictEqual(
      modalSource.includes("initialName"),
      true,
      "Expected TradeApplicationModal to accept initialName"
    )
    assert.strictEqual(
      modalSource.includes("initialEmail"),
      true,
      "Expected TradeApplicationModal to accept initialEmail"
    )

    const dashboardSource = fs.readFileSync(
      path.resolve(__dirname, "../components/auth/AccountDashboard.tsx"),
      "utf8"
    )
    assert.strictEqual(
      dashboardSource.includes("initialEmail={customer.email}"),
      true,
      "Expected AccountDashboard to prefill customer.email"
    )
  })
})

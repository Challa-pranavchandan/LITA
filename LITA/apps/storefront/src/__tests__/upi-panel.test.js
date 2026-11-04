const { test, describe } = require("node:test")
const assert = require("node:assert")
const fs = require("node:fs")
const path = require("node:path")
const { isValidUtr } = require("../lib/upi-validation.js")

const COMPONENT_SOURCE = fs.readFileSync(
  path.join(__dirname, "../components/upi/UpiPayPanel.tsx"),
  "utf8"
)
const ACTION_SOURCE = fs.readFileSync(path.join(__dirname, "../lib/data/upi.ts"), "utf8")
const ORDER_PAGE_SOURCE = fs.readFileSync(
  path.join(__dirname, "../app/order/[id]/page.tsx"),
  "utf8"
)

describe("UPI order payment panel", () => {
  test("renders awaiting, submitted, verified, rejected, and expired states", () => {
    for (const status of [
      "awaiting_proof",
      "submitted",
      "verified",
      "rejected",
      "expired",
    ]) {
      assert.match(COMPONENT_SOURCE, new RegExp(`status === "${status}"`))
    }

    assert.match(COMPONENT_SOURCE, /We are checking your payment/)
    assert.match(COMPONENT_SOURCE, /utr_last4/)
    assert.match(COMPONENT_SOURCE, /payment\.reject_reason/)
    assert.match(COMPONENT_SOURCE, /canShowProofForm/)
    assert.match(COMPONENT_SOURCE, /This order can no longer be paid/)
    assert.match(COMPONENT_SOURCE, /href="\/artworks"/)
    assert.match(COMPONENT_SOURCE, /Complete your payment/)
  })

  test("accepts exactly 12 digits for a UTR after trimming whitespace", () => {
    assert.strictEqual(isValidUtr("123456789012"), true)
    assert.strictEqual(isValidUtr(" 123456789012 "), true)
    assert.strictEqual(isValidUtr("12345678901"), false)
    assert.strictEqual(isValidUtr("1234567890123"), false)
    assert.strictEqual(isValidUtr("12345678901a"), false)
    assert.strictEqual(isValidUtr("1234 6789012"), false)
  })

  test("uses mobile deep link and desktop QR branches", () => {
    assert.match(COMPONENT_SOURCE, /navigator\.userAgent/)
    assert.match(COMPONENT_SOURCE, /isMobile \? \(/)
    assert.match(COMPONENT_SOURCE, /Open UPI app/)
    assert.match(COMPONENT_SOURCE, /alt="UPI payment QR code"/)
    assert.match(COMPONENT_SOURCE, /onDrop=\{\(event\) =>/)
  })

  test("generates the QR from the server-provided UPI link", () => {
    assert.match(
      COMPONENT_SOURCE,
      /QRCode\.toDataURL\(payment\.upi_link,\s*\{ width: 240, margin: 1 \}\)/
    )
    assert.doesNotMatch(COMPONENT_SOURCE, /buildUpiLink|URLSearchParams/)
  })

  test("keeps the proof token out of URLs and sends it in the request header", () => {
    assert.match(ACTION_SOURCE, /"x-upi-token": proofToken/)
    assert.doesNotMatch(ACTION_SOURCE, /proof_token[=:]\s*proofToken/)
    assert.doesNotMatch(COMPONENT_SOURCE, /href=\{[^}]*proof_token/)
    assert.doesNotMatch(ACTION_SOURCE, /searchParams\.set\(["'](?:token|proof_token)/)
  })

  test("shows the panel only for a UPI query or an identified UPI payment", () => {
    assert.match(ORDER_PAGE_SOURCE, /pay === "upi" \|\| Boolean\(upiResult\.payment\)/)
    assert.match(
      ORDER_PAGE_SOURCE,
      /showUpiPanel && upiResult\.payment[\s\S]*?<UpiPayPanel/
    )
  })
})

import crypto from "crypto"
import {
  buildUpiLink,
  generateReferenceCode,
  isValidUtr,
  signProofToken,
  verifyProofToken,
} from "../lib/upi"

describe("UPI helper functions", () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe("generateReferenceCode", () => {
    test("uses the LITA prefix and only unambiguous alphabet characters", () => {
      for (let index = 0; index < 100; index += 1) {
        expect(generateReferenceCode()).toMatch(/^LITA-[A-HJ-NP-Z2-9]{6}$/)
      }
    })

    test("generates unique codes across 10,000 distinct random selections", () => {
      const alphabetLength = 32
      let candidate = 0
      let characterPosition = 0
      jest.spyOn(crypto, "randomInt").mockImplementation((max: number) => {
        const character = Math.floor(
          candidate / alphabetLength ** (5 - characterPosition)
        ) % alphabetLength
        characterPosition += 1
        if (characterPosition === 6) {
          characterPosition = 0
          candidate += 1
        }
        return character % max
      })

      const references = new Set(
        Array.from({ length: 10_000 }, () => generateReferenceCode())
      )
      expect(references.size).toBe(10_000)
    })
  })

  describe("isValidUtr", () => {
    test.each([
      ["11 digits", "12345678901", false],
      ["12 digits", "123456789012", true],
      ["13 digits", "1234567890123", false],
      ["letters", "12345678901A", false],
      ["internal spaces", "12345 789012", false],
      ["trimmed surrounding spaces", " 123456789012 ", true],
    ])("validates %s", (_description, value, expected) => {
      expect(isValidUtr(value)).toBe(expected)
    })
  })

  test("builds an encoded UPI link with a two-decimal INR amount", () => {
    const link = buildUpiLink({
      vpa: "art&studio@example.com",
      name: "LITA Studio & Gallery",
      amount: 1250,
      reference: "LITA-7K3Q9M",
    })
    const parsed = new URL(link)

    expect(parsed.protocol).toBe("upi:")
    expect(parsed.hostname).toBe("pay")
    expect(parsed.searchParams.get("pa")).toBe("art&studio@example.com")
    expect(parsed.searchParams.get("pn")).toBe("LITA Studio & Gallery")
    expect(parsed.searchParams.get("am")).toBe("1250.00")
    expect(parsed.searchParams.get("cu")).toBe("INR")
    expect(parsed.searchParams.get("tn")).toBe("LITA-7K3Q9M")
    expect(parsed.searchParams.get("tr")).toBe("LITA-7K3Q9M")
    expect(link).toContain("pa=art%26studio%40example.com")
  })

  describe("proof tokens", () => {
    const originalJwtSecret = process.env.JWT_SECRET

    beforeEach(() => {
      process.env.JWT_SECRET = "unit-test-upi-proof-secret"
    })

    afterAll(() => {
      if (originalJwtSecret === undefined) {
        delete process.env.JWT_SECRET
      } else {
        process.env.JWT_SECRET = originalJwtSecret
      }
    })

    test("round-trips for the same reference and order", () => {
      const token = signProofToken("LITA-7K3Q9M", "order_123")
      expect(verifyProofToken(token, "LITA-7K3Q9M", "order_123")).toBe(true)
    })

    test("rejects tampered tokens and mismatched reference or order", () => {
      const token = signProofToken("LITA-7K3Q9M", "order_123")
      const tampered = `${token.slice(0, -1)}${token.endsWith("0") ? "1" : "0"}`

      expect(verifyProofToken(tampered, "LITA-7K3Q9M", "order_123")).toBe(false)
      expect(verifyProofToken(token, "LITA-OTHER", "order_123")).toBe(false)
      expect(verifyProofToken(token, "LITA-7K3Q9M", "order_456")).toBe(false)
    })
  })
})

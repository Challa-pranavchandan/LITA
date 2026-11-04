import crypto from "crypto"
import { MedusaError } from "@medusajs/framework/utils"

const REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
const REFERENCE_LENGTH = 6

function getProofSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new MedusaError(
      MedusaError.Types.INVALID_ARGUMENT,
      "JWT_SECRET must be configured to sign UPI proof tokens."
    )
  }
  return secret
}

function createProofSignature(reference: string, orderId: string): string {
  return crypto
    .createHmac("sha256", getProofSecret())
    .update(JSON.stringify([reference, orderId]))
    .digest("hex")
}

export function generateReferenceCode(): string {
  let suffix = ""
  for (let index = 0; index < REFERENCE_LENGTH; index += 1) {
    suffix += REFERENCE_ALPHABET[crypto.randomInt(REFERENCE_ALPHABET.length)]
  }
  return `LITA-${suffix}`
}

export function isValidUtr(value: string): boolean {
  return /^\d{12}$/.test(value.trim())
}

export function buildUpiLink({
  vpa,
  name,
  amount,
  reference,
}: {
  vpa: string
  name: string
  amount: number
  reference: string
}): string {
  const params = new URLSearchParams({
    pa: vpa,
    pn: name,
    am: amount.toFixed(2),
    cu: "INR",
    tn: reference,
    tr: reference,
  })
  return `upi://pay?${params.toString()}`
}

export function signProofToken(reference: string, orderId: string): string {
  return createProofSignature(reference, orderId)
}

export function verifyProofToken(
  token: string,
  reference: string,
  orderId: string
): boolean {
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return false
  }

  const actual = Buffer.from(token, "hex")
  const expected = Buffer.from(createProofSignature(reference, orderId), "hex")
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected)
}

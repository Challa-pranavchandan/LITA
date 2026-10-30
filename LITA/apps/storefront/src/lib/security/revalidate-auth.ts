import { createHash, timingSafeEqual } from "node:crypto"

const MIN_SECRET_LENGTH = 32

/**
 * Verifies that a provided revalidation secret matches the configured REVALIDATE_SECRET.
 *
 * Rules:
 * - Returns false if process.env.REVALIDATE_SECRET is missing, empty, or shorter than 32 characters.
 * - Returns false if provided is missing, not a string, or empty.
 * - Compares in constant time: hashes both secrets with SHA-256 and compares digests using crypto.timingSafeEqual.
 */
export function verifyRevalidateSecret(
  provided: string | null | undefined
): boolean {
  const configured = process.env.REVALIDATE_SECRET

  if (!configured || typeof configured !== "string" || configured.length < MIN_SECRET_LENGTH) {
    return false
  }

  if (!provided || typeof provided !== "string" || provided.length === 0) {
    return false
  }

  const configuredDigest = createHash("sha256").update(configured).digest()
  const providedDigest = createHash("sha256").update(provided).digest()

  return timingSafeEqual(configuredDigest, providedDigest)
}

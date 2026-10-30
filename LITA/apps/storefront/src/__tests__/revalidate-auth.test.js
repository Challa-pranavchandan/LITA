const { test, describe, beforeEach, afterEach } = require("node:test")
const assert = require("node:assert")
const fs = require("node:fs")
const path = require("node:path")
const vm = require("node:vm")
const crypto = require("node:crypto")

/**
 * Loads and executes the actual TypeScript implementation of verifyRevalidateSecret
 * from apps/storefront/src/lib/security/revalidate-auth.ts in a Node VM.
 */
function loadRevalidateAuthModule() {
  const filePath = path.resolve(__dirname, "../lib/security/revalidate-auth.ts")
  const tsCode = fs.readFileSync(filePath, "utf8")

  // Strip TypeScript type annotations and ESM imports/exports for CommonJS execution
  const jsCode = tsCode
    .replace(/import\s*\{[^}]*\}\s*from\s*["'][^"']+["'];?/g, "")
    .replace(/export\s+function/g, "function")
    .replace(/:\s*string\s*\|\s*null\s*\|\s*undefined/g, "")
    .replace(/:\s*boolean/g, "")

  const context = {
    process,
    createHash: crypto.createHash,
    timingSafeEqual: crypto.timingSafeEqual,
    exports: {},
  }
  vm.createContext(context)
  vm.runInContext(`${jsCode}\nexports.verifyRevalidateSecret = verifyRevalidateSecret;`, context)
  return context.exports
}

describe("Revalidate Auth Security & Secret Verification", () => {
  const originalEnv = { ...process.env }
  const VALID_SECRET = "a-very-secure-revalidate-secret-that-is-at-least-32-chars-long"
  const SHORT_SECRET = "short-secret-under-32-chars"
  const DIFFERENT_SECRET = "another-secret-value-that-is-at-least-32-characters-long"

  let verifyRevalidateSecret

  beforeEach(() => {
    process.env = { ...originalEnv }
    const mod = loadRevalidateAuthModule()
    verifyRevalidateSecret = mod.verifyRevalidateSecret
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  test("rejects when process.env.REVALIDATE_SECRET is unset", () => {
    delete process.env.REVALIDATE_SECRET
    assert.strictEqual(
      verifyRevalidateSecret(VALID_SECRET),
      false,
      "Expected verification to fail when env var is unset"
    )
  })

  test("rejects when process.env.REVALIDATE_SECRET is empty string", () => {
    process.env.REVALIDATE_SECRET = ""
    assert.strictEqual(
      verifyRevalidateSecret(VALID_SECRET),
      false,
      "Expected verification to fail when env var is empty"
    )
  })

  test("rejects when process.env.REVALIDATE_SECRET is shorter than 32 characters", () => {
    process.env.REVALIDATE_SECRET = SHORT_SECRET
    assert.strictEqual(
      verifyRevalidateSecret(SHORT_SECRET),
      false,
      "Expected verification to fail when env secret is under 32 characters"
    )
  })

  test("rejects when provided secret is missing, null, undefined, or empty", () => {
    process.env.REVALIDATE_SECRET = VALID_SECRET
    assert.strictEqual(verifyRevalidateSecret(undefined), false, "Expected undefined to fail")
    assert.strictEqual(verifyRevalidateSecret(null), false, "Expected null to fail")
    assert.strictEqual(verifyRevalidateSecret(""), false, "Expected empty string to fail")
  })

  test("rejects when provided secret does not match configured secret", () => {
    process.env.REVALIDATE_SECRET = VALID_SECRET
    assert.strictEqual(
      verifyRevalidateSecret(DIFFERENT_SECRET),
      false,
      "Expected mismatching secret to fail"
    )
  })

  test("accepts when provided secret matches configured secret (>= 32 chars)", () => {
    process.env.REVALIDATE_SECRET = VALID_SECRET
    assert.strictEqual(
      verifyRevalidateSecret(VALID_SECRET),
      true,
      "Expected matching secret to succeed"
    )
  })

  test("regression: old bug cannot return (env unset + request without secret)", () => {
    delete process.env.REVALIDATE_SECRET
    // In old buggy code: (undefined !== undefined) was false, which allowed unauthorized calls!
    assert.strictEqual(
      verifyRevalidateSecret(undefined),
      false,
      "Unset env + undefined secret must be rejected"
    )
    assert.strictEqual(
      verifyRevalidateSecret(null),
      false,
      "Unset env + null secret must be rejected"
    )
    assert.strictEqual(
      verifyRevalidateSecret(""),
      false,
      "Unset env + empty secret must be rejected"
    )
  })

  test("source file integrity check: verifyRevalidateSecret exists and enforces 32-char guard and timing-safe compare", () => {
    const filePath = path.resolve(__dirname, "../lib/security/revalidate-auth.ts")
    assert.ok(fs.existsSync(filePath), "Expected revalidate-auth.ts to exist")
    const content = fs.readFileSync(filePath, "utf8")
    assert.ok(content.includes("export function verifyRevalidateSecret"), "Exports verifyRevalidateSecret")
    assert.ok(content.includes("32"), "Contains 32-character minimum guard")
    assert.ok(content.includes("timingSafeEqual"), "Uses timingSafeEqual for constant-time comparison")
    assert.ok(content.includes("createHash(\"sha256\")") || content.includes("createHash('sha256')"), "Uses SHA-256 digests")
  })

  test("route integrity check: apps/storefront/src/app/api/revalidate/route.ts exports POST and has no GET handler", () => {
    const routePath = path.resolve(__dirname, "../app/api/revalidate/route.ts")
    assert.ok(fs.existsSync(routePath), "Expected route.ts to exist")
    const content = fs.readFileSync(routePath, "utf8")
    assert.ok(content.includes("export async function POST"), "Route exports POST handler")
    assert.strictEqual(content.includes("export async function GET"), false, "Route must NOT export GET handler (secrets in URLs end up in logs)")
    assert.ok(content.includes("verifyRevalidateSecret"), "Route uses verifyRevalidateSecret")
    assert.ok(content.includes("x-revalidate-secret"), "Route checks x-revalidate-secret header")
  })
})

const { test, describe, beforeEach, afterEach } = require("node:test")
const assert = require("node:assert")
const path = require("node:path")

describe("next.config.js images remotePatterns", () => {
  const originalEnv = { ...process.env }
  const configPath = path.resolve(__dirname, "../../next.config.js")

  beforeEach(() => {
    delete require.cache[require.resolve(configPath)]
    process.env = { ...originalEnv, NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: "pk_test" }
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  test("derives R2 pattern from R2_PUBLIC_HOSTNAME", () => {
    process.env.R2_PUBLIC_HOSTNAME = "pub-test12345.r2.dev"
    delete process.env.R2_FILE_URL

    const nextConfig = require(configPath)
    const patterns = nextConfig.images?.remotePatterns || []

    const r2Pattern = patterns.find((p) => p.hostname === "pub-test12345.r2.dev")
    assert.ok(r2Pattern, "Expected remotePatterns to contain R2_PUBLIC_HOSTNAME")
    assert.strictEqual(r2Pattern.protocol, "https")
  })

  test("derives R2 pattern by parsing hostname from R2_FILE_URL if R2_PUBLIC_HOSTNAME is unset", () => {
    delete process.env.R2_PUBLIC_HOSTNAME
    process.env.R2_FILE_URL = "https://media.lita-art.com/uploads"

    const nextConfig = require(configPath)
    const patterns = nextConfig.images?.remotePatterns || []

    const r2Pattern = patterns.find((p) => p.hostname === "media.lita-art.com")
    assert.ok(r2Pattern, "Expected remotePatterns to contain parsed hostname from R2_FILE_URL")
    assert.strictEqual(r2Pattern.protocol, "https")
  })

  test("does not add R2 pattern when R2 env vars are unset", () => {
    delete process.env.R2_PUBLIC_HOSTNAME
    delete process.env.R2_FILE_URL

    const nextConfig = require(configPath)
    const patterns = nextConfig.images?.remotePatterns || []

    const invalidPattern = patterns.find((p) => !p.hostname || p.hostname === "undefined")
    assert.strictEqual(invalidPattern, undefined, "Expected no undefined hostnames in remotePatterns")
  })
})

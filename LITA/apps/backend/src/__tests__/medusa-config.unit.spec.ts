describe("medusa-config file module configuration", () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  test("in development without R2 env vars, uses default local file provider", () => {
    delete process.env.NODE_ENV
    delete process.env.R2_FILE_URL
    delete process.env.R2_ACCESS_KEY_ID
    delete process.env.R2_SECRET_ACCESS_KEY
    delete process.env.R2_BUCKET
    delete process.env.R2_ENDPOINT

    const config = require("../../medusa-config")
    const fileModule = config.modules?.file
    expect(fileModule).toBeDefined()
    expect(fileModule.options.providers[0].id).toBe("local")
    expect(fileModule.options.providers[0].resolve).toBe("@medusajs/medusa/file-local")
  })

  test("in development with all R2 env vars, registers @medusajs/medusa/file with file-s3 provider", () => {
    process.env.NODE_ENV = "development"
    process.env.R2_FILE_URL = "https://pub-abc.r2.dev"
    process.env.R2_ACCESS_KEY_ID = "test-access-key"
    process.env.R2_SECRET_ACCESS_KEY = "test-secret-key"
    process.env.R2_BUCKET = "test-bucket"
    process.env.R2_ENDPOINT = "https://account123.r2.cloudflarestorage.com"

    const config = require("../../medusa-config")
    const fileModule = config.modules?.file
    expect(fileModule).toBeDefined()

    const s3Provider = fileModule.options.providers.find(
      (p: any) => p.resolve === "@medusajs/medusa/file-s3"
    )
    expect(s3Provider).toBeDefined()
    expect(s3Provider.id).toBe("s3")
    expect(s3Provider.options).toMatchObject({
      file_url: "https://pub-abc.r2.dev",
      access_key_id: "test-access-key",
      secret_access_key: "test-secret-key",
      region: "auto",
      bucket: "test-bucket",
      endpoint: "https://account123.r2.cloudflarestorage.com",
      additional_client_config: {
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED",
      },
    })
  })

  test("in production, startup fails if any required R2 variable is missing", () => {
    process.env.NODE_ENV = "production"
    process.env.JWT_SECRET = "supersecret_minimum_32_characters_long_jwt_secret"
    process.env.COOKIE_SECRET = "supersecret_minimum_32_characters_long_cookie_secret"
    process.env.STORE_CORS = "https://example.com"
    process.env.ADMIN_CORS = "https://admin.example.com"
    process.env.AUTH_CORS = "https://auth.example.com"

    // Leave R2_ACCESS_KEY_ID unset
    process.env.R2_FILE_URL = "https://assets.example.com"
    delete process.env.R2_ACCESS_KEY_ID
    process.env.R2_SECRET_ACCESS_KEY = "test-secret-key"
    process.env.R2_BUCKET = "test-bucket"
    process.env.R2_ENDPOINT = "https://account123.r2.cloudflarestorage.com"

    expect(() => {
      require("../../medusa-config")
    }).toThrow(/\[startup\] R2_ACCESS_KEY_ID must be set in production/i)
  })

  test("in production with all required vars, config loads successfully", () => {
    process.env.NODE_ENV = "production"
    process.env.JWT_SECRET = "supersecret_minimum_32_characters_long_jwt_secret"
    process.env.COOKIE_SECRET = "supersecret_minimum_32_characters_long_cookie_secret"
    process.env.STORE_CORS = "https://example.com"
    process.env.ADMIN_CORS = "https://admin.example.com"
    process.env.AUTH_CORS = "https://auth.example.com"

    process.env.R2_FILE_URL = "https://assets.example.com"
    process.env.R2_ACCESS_KEY_ID = "test-access-key"
    process.env.R2_SECRET_ACCESS_KEY = "test-secret-key"
    process.env.R2_BUCKET = "test-bucket"
    process.env.R2_ENDPOINT = "https://account123.r2.cloudflarestorage.com"

    expect(() => {
      const config = require("../../medusa-config")
      expect(config.modules?.file).toBeDefined()
      expect(config.modules.file.options.providers[0].id).toBe("s3")
    }).not.toThrow()
  })
})

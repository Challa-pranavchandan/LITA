import path from "path"

jest.mock("@medusajs/framework/utils", () => {
  const actual = jest.requireActual("@medusajs/framework/utils")
  return {
    ...actual,
    loadEnv: jest.fn(),
  }
})

describe("medusa-config module and environment configuration", () => {
  const originalEnv = process.env
  const originalCwd = process.cwd()

  beforeAll(() => {
    // Ensure cwd is apps/backend so relative modules (./src/modules/...) resolve properly
    process.chdir(path.resolve(__dirname, "../../"))
  })

  afterAll(() => {
    process.chdir(originalCwd)
    process.env = originalEnv
  })

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  describe("manual UPI payment module feature flag", () => {
    test.each([undefined, "false"])(
      "does not register the UPI payment module unless explicitly enabled (%s)",
      (enabled) => {
        if (enabled === undefined) {
          delete process.env.ENABLE_UPI_MANUAL
        } else {
          process.env.ENABLE_UPI_MANUAL = enabled
        }

        const config = require("../../medusa-config")
        const upiModule = Object.values(config.modules ?? {}).find(
          (module) =>
            (module as { resolve?: string }).resolve === "./src/modules/upi-payment"
        )

        expect(upiModule).toBeUndefined()
      }
    )

    test("registers the UPI payment module when explicitly enabled", () => {
      process.env.ENABLE_UPI_MANUAL = "true"
      process.env.UPI_VPA = "payments@example"
      process.env.UPI_PAYEE_NAME = "LITA"

      const config = require("../../medusa-config")
      const upiModule = Object.values(config.modules ?? {}).find(
        (module) =>
          (module as { resolve?: string }).resolve === "./src/modules/upi-payment"
      )

      expect(upiModule).toBeDefined()
    })

    test("registers the manual UPI provider with configured options only when enabled", () => {
      process.env.ENABLE_UPI_MANUAL = "true"
      process.env.UPI_VPA = "payments@example"
      process.env.UPI_PAYEE_NAME = "LITA"
      process.env.UPI_ORDER_EXPIRY_HOURS = "36"

      const config = require("../../medusa-config")
      const paymentModule = config.modules?.payment
      const provider = paymentModule?.options?.providers?.find(
        (entry: { id?: string }) => entry.id === "upimanual"
      )

      expect(provider).toMatchObject({
        resolve: "./src/modules/upi-manual",
        id: "upimanual",
        options: {
          vpa: "payments@example",
          payee_name: "LITA",
          expiry_hours: 36,
        },
      })
    })

    test("uses a 48-hour expiry by default", () => {
      process.env.ENABLE_UPI_MANUAL = "true"
      process.env.UPI_VPA = "payments@example"
      process.env.UPI_PAYEE_NAME = "LITA"
      delete process.env.UPI_ORDER_EXPIRY_HOURS

      const config = require("../../medusa-config")
      const provider = config.modules?.payment?.options?.providers?.find(
        (entry: { id?: string }) => entry.id === "upimanual"
      )

      expect(provider.options.expiry_hours).toBe(48)
    })

    test("fails startup with a clear error if required UPI config is missing", () => {
      process.env.ENABLE_UPI_MANUAL = "true"
      delete process.env.UPI_VPA
      delete process.env.UPI_PAYEE_NAME

      expect(() => require("../../medusa-config")).toThrow(
        "[startup] ENABLE_UPI_MANUAL=true requires both UPI_VPA and UPI_PAYEE_NAME."
      )
    })

    it.each(["5", "169", "6.5", "invalid"])(
      "rejects an expiry outside the allowed range (%s)",
      (expiryHours) => {
        process.env.ENABLE_UPI_MANUAL = "true"
        process.env.UPI_VPA = "payments@example"
        process.env.UPI_PAYEE_NAME = "LITA"
        process.env.UPI_ORDER_EXPIRY_HOURS = expiryHours

        expect(() => require("../../medusa-config")).toThrow(
          "UPI_ORDER_EXPIRY_HOURS must be an integer between 6 and 168."
        )
      }
    )
  })

  describe("Redis infrastructure configuration (B4)", () => {
    test("in development without REDIS_URL, keeps in-memory defaults and redisUrl is undefined", () => {
      delete process.env.NODE_ENV
      delete process.env.REDIS_URL

      const config = require("../../medusa-config")
      expect(config.projectConfig.redisUrl).toBeUndefined()
      expect(config.modules?.event_bus?.resolve).not.toContain("event-bus-redis")
      expect(config.modules?.workflows?.resolve).not.toContain("workflow-engine-redis")
    })

    test("in development with REDIS_URL, registers the four Redis modules and sets projectConfig.redisUrl", () => {
      process.env.NODE_ENV = "development"
      process.env.REDIS_URL = "redis://localhost:6379"

      const config = require("../../medusa-config")
      expect(config.projectConfig.redisUrl).toBe("redis://localhost:6379")

      // 1. Event Bus with Redis
      const eventBusModule = config.modules?.event_bus
      expect(eventBusModule).toBeDefined()
      expect(eventBusModule.resolve).toBe("@medusajs/medusa/event-bus-redis")
      expect(eventBusModule.options).toMatchObject({
        redisUrl: "redis://localhost:6379",
      })

      // 2. Workflow Engine with Redis
      const workflowsModule = config.modules?.workflows
      expect(workflowsModule).toBeDefined()
      expect(workflowsModule.resolve).toBe("@medusajs/medusa/workflow-engine-redis")
      expect(workflowsModule.options?.redis).toMatchObject({
        redisUrl: "redis://localhost:6379",
      })

      // 3. Locking Module with Redis Provider
      const lockingModule = config.modules?.locking
      expect(lockingModule).toBeDefined()
      expect(lockingModule.resolve).toBe("@medusajs/medusa/locking")
      const redisLockingProvider = lockingModule.options?.providers?.find(
        (p: any) => p.resolve === "@medusajs/medusa/locking-redis"
      )
      expect(redisLockingProvider).toBeDefined()
      expect(redisLockingProvider.is_default).toBe(true)
      expect(redisLockingProvider.options).toMatchObject({
        redisUrl: "redis://localhost:6379",
      })

      // 4. Caching Module with Redis Provider
      const cachingModule = config.modules?.caching
      expect(cachingModule).toBeDefined()
      expect(cachingModule.resolve).toBe("@medusajs/caching")
      const redisCachingProvider = cachingModule.options?.providers?.find(
        (p: any) => p.resolve === "@medusajs/medusa/caching-redis"
      )
      expect(redisCachingProvider).toBeDefined()
      expect(redisCachingProvider.is_default).toBe(true)
      expect(redisCachingProvider.options).toMatchObject({
        redisUrl: "redis://localhost:6379",
      })
    })

    test("supports TLS rediss:// URL for managed Redis in development and sets projectConfig.redisUrl", () => {
      process.env.NODE_ENV = "development"
      process.env.REDIS_URL = "rediss://default:secret@upstash.io:6379"

      const config = require("../../medusa-config")
      expect(config.projectConfig.redisUrl).toBe("rediss://default:secret@upstash.io:6379")
      expect(config.modules?.event_bus?.options?.redisUrl).toBe("rediss://default:secret@upstash.io:6379")
    })

    test("in production without REDIS_URL, startup fails with clear error message", () => {
      process.env.NODE_ENV = "production"
      process.env.JWT_SECRET = "supersecret_minimum_32_characters_long_jwt_secret"
      process.env.COOKIE_SECRET = "supersecret_minimum_32_characters_long_cookie_secret"
      process.env.REVALIDATE_SECRET = "supersecret_minimum_32_characters_long_revalidate_secret"
      process.env.STORE_CORS = "https://example.com"
      process.env.ADMIN_CORS = "https://admin.example.com"
      process.env.AUTH_CORS = "https://auth.example.com"
      process.env.R2_FILE_URL = "https://assets.example.com"
      process.env.R2_ACCESS_KEY_ID = "test-access-key"
      process.env.R2_SECRET_ACCESS_KEY = "test-secret-key"
      process.env.R2_BUCKET = "test-bucket"
      process.env.R2_ENDPOINT = "https://account123.r2.cloudflarestorage.com"

      delete process.env.REDIS_URL

      expect(() => {
        require("../../medusa-config")
      }).toThrow(/\[startup\] REDIS_URL must be set in production/i)
    })

    test("in production with invalid REDIS_URL protocol, startup fails with clear error message", () => {
      process.env.NODE_ENV = "production"
      process.env.JWT_SECRET = "supersecret_minimum_32_characters_long_jwt_secret"
      process.env.COOKIE_SECRET = "supersecret_minimum_32_characters_long_cookie_secret"
      process.env.REVALIDATE_SECRET = "supersecret_minimum_32_characters_long_revalidate_secret"
      process.env.STORE_CORS = "https://example.com"
      process.env.ADMIN_CORS = "https://admin.example.com"
      process.env.AUTH_CORS = "https://auth.example.com"
      process.env.R2_FILE_URL = "https://assets.example.com"
      process.env.R2_ACCESS_KEY_ID = "test-access-key"
      process.env.R2_SECRET_ACCESS_KEY = "test-secret-key"
      process.env.R2_BUCKET = "test-bucket"
      process.env.R2_ENDPOINT = "https://account123.r2.cloudflarestorage.com"

      process.env.REDIS_URL = "http://localhost:6379"

      expect(() => {
        require("../../medusa-config")
      }).toThrow(/\[startup\] REDIS_URL must start with redis:\/\/ or rediss:\/\//i)
    })
  })

  describe("Worker mode & admin configuration", () => {
    test("defaults workerMode to 'shared' when MEDUSA_WORKER_MODE is unset", () => {
      delete process.env.MEDUSA_WORKER_MODE

      const config = require("../../medusa-config")
      expect(config.projectConfig.workerMode).toBe("shared")
    })

    test("sets workerMode to 'server' when MEDUSA_WORKER_MODE=server", () => {
      process.env.MEDUSA_WORKER_MODE = "server"

      const config = require("../../medusa-config")
      expect(config.projectConfig.workerMode).toBe("server")
    })

    test("sets workerMode to 'worker' when MEDUSA_WORKER_MODE=worker", () => {
      process.env.MEDUSA_WORKER_MODE = "worker"

      const config = require("../../medusa-config")
      expect(config.projectConfig.workerMode).toBe("worker")
    })

    test("disables admin dashboard when DISABLE_MEDUSA_ADMIN=true", () => {
      process.env.DISABLE_MEDUSA_ADMIN = "true"

      const config = require("../../medusa-config")
      expect(config.admin?.disable).toBe(true)
    })

    test("keeps admin dashboard enabled when DISABLE_MEDUSA_ADMIN is false or unset", () => {
      delete process.env.DISABLE_MEDUSA_ADMIN

      const config = require("../../medusa-config")
      expect(config.admin?.disable).toBe(false)
    })
  })

  describe("Cloudflare R2 file module configuration", () => {
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
      process.env.REVALIDATE_SECRET = "supersecret_minimum_32_characters_long_revalidate_secret"
      process.env.STORE_CORS = "https://example.com"
      process.env.ADMIN_CORS = "https://admin.example.com"
      process.env.AUTH_CORS = "https://auth.example.com"
      process.env.REDIS_URL = "redis://localhost:6379"

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

    test("in production with all required vars and TLS rediss URL, config loads successfully", () => {
      process.env.NODE_ENV = "production"
      process.env.JWT_SECRET = "supersecret_minimum_32_characters_long_jwt_secret"
      process.env.COOKIE_SECRET = "supersecret_minimum_32_characters_long_cookie_secret"
      process.env.REVALIDATE_SECRET = "supersecret_minimum_32_characters_long_revalidate_secret"
      process.env.STORE_CORS = "https://example.com"
      process.env.ADMIN_CORS = "https://admin.example.com"
      process.env.AUTH_CORS = "https://auth.example.com"
      process.env.REDIS_URL = "rediss://default:password@upstash.io:6379"

      process.env.R2_FILE_URL = "https://assets.example.com"
      process.env.R2_ACCESS_KEY_ID = "test-access-key"
      process.env.R2_SECRET_ACCESS_KEY = "test-secret-key"
      process.env.R2_BUCKET = "test-bucket"
      process.env.R2_ENDPOINT = "https://account123.r2.cloudflarestorage.com"

      expect(() => {
        const config = require("../../medusa-config")
        expect(config.modules?.file).toBeDefined()
        expect(config.modules.file.options.providers[0].id).toBe("s3")
        expect(config.projectConfig.redisUrl).toBe("rediss://default:password@upstash.io:6379")
      }).not.toThrow()
    })
  })
})

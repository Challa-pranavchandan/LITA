import { loadEnv, defineConfig, MedusaError } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// ---------------------------------------------------------------------------
// Production startup guard
// Crashes immediately with a clear message rather than running with weak or
// missing configuration. This block is a no-op in development.
// ---------------------------------------------------------------------------
if (process.env.NODE_ENV === 'production') {
  const requiredSecrets: Array<{ key: string; minLength: number }> = [
    { key: 'JWT_SECRET', minLength: 32 },
    { key: 'COOKIE_SECRET', minLength: 32 },
    { key: 'REVALIDATE_SECRET', minLength: 32 },
  ]
  for (const { key, minLength } of requiredSecrets) {
    const value = process.env[key]
    if (!value || value.length < minLength) {
      throw new MedusaError(
        MedusaError.Types.INVALID_ARGUMENT,
        `[startup] ${key} must be set and at least ${minLength} characters long in production. ` +
        `Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
      )
    }
  }

  const requiredCors: Array<string> = ['STORE_CORS', 'ADMIN_CORS', 'AUTH_CORS']
  for (const key of requiredCors) {
    if (!process.env[key]) {
      throw new MedusaError(
        MedusaError.Types.INVALID_ARGUMENT,
        `[startup] ${key} must be set in production. ` +
        `Example: STORE_CORS=https://yourdomain.com,https://www.yourdomain.com`
      )
    }
  }

  const requiredR2: Array<string> = [
    'R2_FILE_URL',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET',
    'R2_ENDPOINT',
  ]
  for (const key of requiredR2) {
    if (!process.env[key]) {
      throw new MedusaError(
        MedusaError.Types.INVALID_ARGUMENT,
        `[startup] ${key} must be set in production for Cloudflare R2 file storage.`
      )
    }
  }
}
// ---------------------------------------------------------------------------

const isR2Configured = Boolean(
  process.env.R2_FILE_URL &&
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY &&
  process.env.R2_BUCKET &&
  process.env.R2_ENDPOINT
)

const allowDevPaymentPlaceholders =
  process.env.ALLOW_DEV_PAYMENT_PLACEHOLDERS === "true"

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    databaseDriverOptions: process.env.DATABASE_EXTRA
      ? JSON.parse(process.env.DATABASE_EXTRA)
      : undefined,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
      jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
    }
  },
  modules: [
    {
      resolve: "./src/modules/journal",
    },
    {
      resolve: "./src/modules/gallery",
    },
    {
      resolve: "./src/modules/trade",
    },
    {
      resolve: "./src/modules/commission",
    },
    {
      resolve: "./src/modules/feedback",
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "./src/modules/razorpay",
            id: "razorpay",
            options: {
              key_id:
                process.env.RAZORPAY_KEY_ID ||
                (allowDevPaymentPlaceholders ? "rzp_test_placeholder" : ""),
              key_secret:
                process.env.RAZORPAY_KEY_SECRET ||
                (allowDevPaymentPlaceholders ? "dummy_secret" : ""),
              webhook_secret:
                process.env.RAZORPAY_WEBHOOK_SECRET ||
                (allowDevPaymentPlaceholders ? "dummy_webhook_secret" : ""),
            },
          },
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          {
            resolve: "./src/modules/resend",
            id: "resend",
            options: {
              channels: ["email"],
              api_key: process.env.RESEND_API_KEY,
              from: process.env.RESEND_FROM_EMAIL || "LITA <onboarding@resend.dev>",
            },
          },
        ],
      },
    },
    ...(isR2Configured
      ? [
          {
            resolve: "@medusajs/medusa/file",
            options: {
              providers: [
                {
                  resolve: "@medusajs/medusa/file-s3",
                  id: "s3",
                  options: {
                    file_url: process.env.R2_FILE_URL,
                    access_key_id: process.env.R2_ACCESS_KEY_ID,
                    secret_access_key: process.env.R2_SECRET_ACCESS_KEY,
                    region: process.env.R2_REGION || "auto",
                    bucket: process.env.R2_BUCKET,
                    endpoint: process.env.R2_ENDPOINT,
                    additional_client_config: {
                      requestChecksumCalculation: "WHEN_REQUIRED",
                      responseChecksumValidation: "WHEN_REQUIRED",
                    },
                  },
                },
              ],
            },
          },
        ]
      : []),
  ],
})


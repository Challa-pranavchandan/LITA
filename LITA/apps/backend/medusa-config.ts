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
}
// ---------------------------------------------------------------------------

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
  }
})

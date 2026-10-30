const checkEnvVariables = require("./check-env-variables")

checkEnvVariables()

/**
 * Medusa Cloud-related environment variables
 */
const S3_HOSTNAME = process.env.MEDUSA_CLOUD_S3_HOSTNAME
const S3_PATHNAME = process.env.MEDUSA_CLOUD_S3_PATHNAME

/**
 * Cloudflare R2-related environment variables
 */
const getCleanHostname = (input) => {
  if (!input) return undefined
  try {
    const url = input.startsWith("http://") || input.startsWith("https://")
      ? new URL(input)
      : new URL(`https://${input}`)
    return url.hostname
  } catch {
    return input.replace(/^https?:\/\//, "").split("/")[0]
  }
}

const R2_HOSTNAME = getCleanHostname(
  process.env.R2_PUBLIC_HOSTNAME ||
  process.env.R2_FILE_URL ||
  process.env.NEXT_PUBLIC_R2_PUBLIC_HOSTNAME ||
  process.env.NEXT_PUBLIC_R2_FILE_URL
)


const path = require("path")

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  allowedDevOrigins: [
    "192.168.55.104",
    "192.168.55.104:8000",
    "localhost:8000",
    "127.0.0.1:8000",
  ],
  turbopack: {
    root: path.resolve(__dirname, "../../"),
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      react: path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
      "@": path.resolve(__dirname, "src"),
      "@lib": path.resolve(__dirname, "src/lib"),
      "@modules": path.resolve(__dirname, "src/modules"),
      "@pages": path.resolve(__dirname, "src/pages"),
    }
    return config
  },
  reactStrictMode: true,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "*.s3.*.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "*.s3.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "**.medusajs.com",
      },
      {
        protocol: "https",
        hostname: "*.r2.dev",
      },
      ...(S3_HOSTNAME && S3_PATHNAME
        ? [
            {
              protocol: "https",
              hostname: S3_HOSTNAME,
              pathname: S3_PATHNAME,
            },
          ]
        : []),
      ...(R2_HOSTNAME && R2_HOSTNAME !== "*.r2.dev"
        ? [
            {
              protocol: "https",
              hostname: R2_HOSTNAME,
            },
          ]
        : []),
    ],
  },
  async headers() {
    const cspReportOnly = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      `img-src 'self' data: blob: http://localhost:* https://*.s3.*.amazonaws.com https://*.s3.amazonaws.com https://res.cloudinary.com https://*.medusajs.com https://*.r2.dev ${R2_HOSTNAME ? `https://${R2_HOSTNAME}` : ""}`.trim(),
      `connect-src 'self' http://localhost:9000 http://127.0.0.1:9000 ${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || ""}`.trim(),
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")

    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy-Report-Only",
            value: cspReportOnly,
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig

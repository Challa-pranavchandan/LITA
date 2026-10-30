import { loadEnv } from "@medusajs/framework/utils"
import fs from "fs"
import path from "path"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

async function testR2Upload() {
  console.log("\n==================================================")
  console.log("       LITA — Cloudflare R2 Upload Diagnostic")
  console.log("==================================================")
  console.log(`Bucket:     ${process.env.R2_BUCKET || "MISSING"}`)
  console.log(`Endpoint:   ${process.env.R2_ENDPOINT || "MISSING"}`)
  console.log(`Public URL: ${process.env.R2_FILE_URL || "MISSING"}`)
  console.log(`Access Key: ${process.env.R2_ACCESS_KEY_ID ? "SET (configured)" : "MISSING"}`)
  console.log(`Secret Key: ${process.env.R2_SECRET_ACCESS_KEY ? "SET (configured)" : "MISSING"}`)

  if (
    !process.env.R2_BUCKET ||
    !process.env.R2_ENDPOINT ||
    !process.env.R2_FILE_URL ||
    !process.env.R2_ACCESS_KEY_ID ||
    !process.env.R2_SECRET_ACCESS_KEY
  ) {
    console.error("\n❌ Error: Missing required R2 environment variables in apps/backend/.env")
    return
  }

  const { S3FileService } = require("@medusajs/file-s3/dist/services/s3-file")

  const logger = {
    info: console.log,
    warn: console.warn,
    error: console.error,
    debug: () => {},
  }

  const s3Service = new S3FileService(
    { logger },
    {
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
    }
  )

  const imagePath = "C:\\Users\\chall\\.gemini\\antigravity-ide\\brain\\0eee6557-1180-43f3-ac16-1c8c3ee02f9a\\.user_uploaded\\media_1792825886221.jpg"

  if (!fs.existsSync(imagePath)) {
    console.error(`\n❌ Error: Test image not found at ${imagePath}`)
    return
  }

  const fileBuffer = fs.readFileSync(imagePath)
  console.log(`\nLocal image size: ${(fileBuffer.length / 1024).toFixed(1)} KB`)
  console.log("Uploading image to Cloudflare R2 via S3 File Provider...")

  try {
    const result = await s3Service.upload({
      filename: "portrait-artwork.jpg",
      mimeType: "image/jpeg",
      content: fileBuffer.toString("binary"),
      access: "public",
    })

    console.log("\n✅ UPLOAD SUCCESSFUL!")
    console.log(`R2 Object Key: ${result.key}`)
    console.log(`Public URL:    ${result.url}`)

    console.log("\nVerifying public URL download...")
    const fetchRes = await fetch(result.url)
    if (fetchRes.ok) {
      const contentLength = fetchRes.headers.get("content-length")
      const contentType = fetchRes.headers.get("content-type")
      console.log(`✅ URL Verified: HTTP ${fetchRes.status}`)
      console.log(`   Content-Type:   ${contentType}`)
      console.log(`   Content-Length: ${contentLength} bytes`)
    } else {
      console.warn(`⚠️ Warning: Public URL returned HTTP ${fetchRes.status}`)
      console.warn("  If using r2.dev, make sure R2.dev subdomain is Enabled in your bucket Settings.")
    }
  } catch (err: any) {
    console.error("\n❌ Upload failed:", err?.message || err)
    if (err?.Code || err?.name) {
      console.error(`Error Code: ${err.Code || err.name}`)
    }
  }
}

testR2Upload()

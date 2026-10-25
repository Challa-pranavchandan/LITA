import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const endpoint =
  process.env.R2_ENDPOINT ||
  (process.env.R2_ACCOUNT_ID
    ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : undefined)

export const r2 = new S3Client({
  region: process.env.R2_REGION || "auto",
  endpoint,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
})

export const R2_BUCKET = process.env.R2_BUCKET || ""

/**
 * Generate a short-lived presigned PUT URL for client-side direct upload
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds = 300
): Promise<string> {
  if (!R2_BUCKET) {
    throw new Error("R2_BUCKET environment variable is not configured.")
  }

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
  })

  return await getSignedUrl(r2, command, { expiresIn: expiresInSeconds })
}

/**
 * Generate a short-lived presigned GET URL for viewing private reference images
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresInSeconds = 900
): Promise<string> {
  if (!R2_BUCKET) {
    // If bucket is not configured, fallback to public file url or key
    if (process.env.R2_FILE_URL) {
      return `${process.env.R2_FILE_URL.replace(/\/$/, "")}/${key}`
    }
    return key
  }

  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  })

  return await getSignedUrl(r2, command, { expiresIn: expiresInSeconds })
}

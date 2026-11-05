import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3"
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

function assertPrivateR2Configured(): void {
  if (
    !R2_BUCKET ||
    !process.env.R2_ACCESS_KEY_ID ||
    !process.env.R2_SECRET_ACCESS_KEY ||
    !endpoint
  ) {
    throw new Error(
      "Private commission image storage is not configured. Set R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_ENDPOINT or R2_ACCOUNT_ID."
    )
  }
}

/**
 * Generate a short-lived presigned PUT URL for client-side direct upload
 */
async function createPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds: number,
  contentLength?: number
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
    ...(contentLength ? { ContentLength: contentLength } : {}),
  })

  return await getSignedUrl(r2, command, { expiresIn: expiresInSeconds })
}

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds = 300,
  contentLength?: number
): Promise<string> {
  if (!R2_BUCKET) {
    throw new Error("R2_BUCKET environment variable is not configured.")
  }
  return createPresignedUploadUrl(key, contentType, expiresInSeconds, contentLength)
}

export async function getPresignedPrivateUploadUrl(
  key: string,
  contentType: string,
  contentLength: number,
  expiresInSeconds = 300
): Promise<string> {
  assertPrivateR2Configured()
  return createPresignedUploadUrl(key, contentType, expiresInSeconds, contentLength)
}

/**
 * Generate a short-lived presigned GET URL for viewing private reference images
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresInSeconds = 900
): Promise<string> {
  if (!R2_BUCKET) {
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

export async function getPresignedPrivateDownloadUrl(
  key: string,
  expiresInSeconds = 900
): Promise<string> {
  assertPrivateR2Configured()

  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  })

  return await getSignedUrl(r2, command, { expiresIn: expiresInSeconds })
}

export async function getCommissionImageMetadata(
  key: string
): Promise<{
  contentType?: string
  contentLength?: number
  imageMime?: "image/jpeg" | "image/png" | "image/webp"
}> {
  assertPrivateR2Configured()
  const result = await r2.send(
    new HeadObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    })
  )
  const image = await r2.send(
    new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Range: "bytes=0-11",
    })
  )
  const header = await image.Body?.transformToByteArray()
  const bytes = header ? Buffer.from(header) : Buffer.alloc(0)
  const isPng =
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  const isJpeg =
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  const isWebp =
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"

  const imageMime = isPng
    ? "image/png"
    : isJpeg
      ? "image/jpeg"
      : isWebp
        ? "image/webp"
        : undefined

  return {
    contentType: result.ContentType,
    contentLength: result.ContentLength,
    imageMime,
  }
}

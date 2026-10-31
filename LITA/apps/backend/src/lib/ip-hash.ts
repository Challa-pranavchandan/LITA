import crypto from "crypto"

export function hashIp(ip?: string | null): string | null {
  if (!ip) {
    return null
  }
  const cleanIp = ip.split(",")[0].trim()
  const salt = process.env.IP_HASH_SALT || process.env.JWT_SECRET || "lita-salt-secret-default"
  return crypto.createHash("sha256").update(`${salt}:${cleanIp}`).digest("hex")
}

export function extractClientIp(req: any): string {
  const forwarded = req.headers["x-forwarded-for"]
  if (typeof forwarded === "string" && forwarded) {
    return forwarded.split(",")[0].trim()
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].trim()
  }
  return req.socket?.remoteAddress || req.ip || "127.0.0.1"
}

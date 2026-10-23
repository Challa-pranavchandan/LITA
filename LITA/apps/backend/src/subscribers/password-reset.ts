import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

type PasswordResetData = {
  entity_id: string
  actor_type: string
  token: string
  metadata?: Record<string, unknown>
}

export default async function passwordResetHandler({
  event: { data },
  container,
}: SubscriberArgs<PasswordResetData>) {
  const { entity_id: email, actor_type, token } = data
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  const storefrontUrl = (
    process.env.STOREFRONT_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "http://localhost:8000"
  ).replace(/\/$/, "")

  const resetUrl = `${storefrontUrl}/account/reset-password?token=${encodeURIComponent(token)}`
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL || "LITA <onboarding@resend.dev>"

  if (!apiKey) {
    logger.warn(
      `[password-reset] RESEND_API_KEY is not configured. Reset link for ${email} (${actor_type}): ${resetUrl}`
    )
    return
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: "Reset your LITA password",
        html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your password - LITA</title>
</head>
<body style="margin: 0; padding: 0; background-color: #faf8f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #faf8f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #ffffff; border: 1px solid #e7dfd5; border-radius: 4px; overflow: hidden; padding: 48px 40px; text-align: left;">
          <tr>
            <td style="padding-bottom: 28px; border-bottom: 1px solid #eee7de;">
              <span style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 24px; font-weight: 500; letter-spacing: 0.15em; text-transform: uppercase; color: #5f2f3c; display: block;">
                Livin In The Art
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 32px; padding-bottom: 16px;">
              <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 500; color: #1a1a1a;">
                Password Reset Request
              </h1>
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #555555;">
                We received a request to reset the password for your account associated with <strong>${email}</strong>.
              </p>
              <p style="margin: 0 0 28px 0; font-size: 14px; line-height: 1.6; color: #555555;">
                Click the button below to choose a new password. This link is valid for 15 minutes.
              </p>
              <div style="margin: 28px 0; text-align: left;">
                <a href="${resetUrl}" style="background-color: #5f2f3c; color: #ffffff; padding: 14px 28px; text-decoration: none; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 500; border-radius: 2px; display: inline-block;">
                  Reset Password
                </a>
              </div>
              <p style="margin: 28px 0 0 0; font-size: 12px; line-height: 1.5; color: #888888;">
                If you did not request this change, you can safely ignore this email — your password will not be changed.
              </p>
              <p style="margin: 16px 0 0 0; font-size: 12px; line-height: 1.5; color: #888888; word-break: break-all;">
                If the button above does not work, copy and paste this link into your browser:<br />
                <a href="${resetUrl}" style="color: #5f2f3c; text-decoration: underline;">${resetUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 32px; border-top: 1px solid #eee7de; font-size: 11px; color: #999999; text-align: center;">
              &copy; ${new Date().getFullYear()} LITA (Livin In The Art). All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      logger.error(
        `[password-reset] Failed to send email via Resend (${res.status}): ${errText}`
      )
    } else {
      logger.info(`[password-reset] Successfully sent password reset email to ${email}`)
    }
  } catch (err) {
    logger.error(`[password-reset] Error sending password reset email: ${err}`)
  }
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
}

export interface EditorialEmailProps {
  title: string
  preheader?: string
  contentHtml: string
}

export function renderEditorialEmail({
  title,
  preheader,
  contentHtml,
}: EditorialEmailProps): string {
  const year = new Date().getFullYear()

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} - LITA</title>
  ${preheader ? `<span style="display:none;font-size:0px;line-height:0px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</span>` : ""}
</head>
<body style="margin: 0; padding: 0; background-color: #faf8f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #faf8f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border: 1px solid #e7dfd5; border-radius: 4px; overflow: hidden; padding: 48px 40px; text-align: left; box-sizing: border-box;">
          <!-- Header -->
          <tr>
            <td style="padding-bottom: 28px; border-bottom: 1px solid #eee7de;">
              <span style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 24px; font-weight: 500; letter-spacing: 0.15em; text-transform: uppercase; color: #5f2f3c; display: block;">
                Livin In The Art
              </span>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding-top: 32px; padding-bottom: 16px;">
              ${contentHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px; border-top: 1px solid #eee7de; font-size: 11px; color: #999999; text-align: center; line-height: 1.6;">
              &copy; ${year} LITA (Livin In The Art). All rights reserved.<br />
              Artisan handcrafted originals &amp; limited curated collections.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function escapeHtml(str: string): string {
  if (!str) return ""
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export function formatCurrency(amount: number, currencyCode = "inr"): string {
  const code = currencyCode.toUpperCase()
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${code} ${amount.toFixed(2)}`
  }
}

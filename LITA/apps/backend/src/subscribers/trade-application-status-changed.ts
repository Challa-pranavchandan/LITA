import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { tradeApplicationStatusTemplate } from "../modules/resend/emails/templates"

type TradeStatusChangedData = {
  id: string
  name: string
  email: string
  company?: string
  status: string
  previous_status?: string
}

export default async function tradeApplicationStatusChangedHandler({
  event: { data },
  container,
}: SubscriberArgs<TradeStatusChangedData>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  if (!data?.email || !data?.status) {
    logger.warn("[trade-application-status-changed] Missing email or status in payload.")
    return
  }

  // Only dispatch notifications on terminal decision statuses (approved / rejected)
  const normalizedStatus = data.status.toLowerCase().trim()
  if (normalizedStatus !== "approved" && normalizedStatus !== "rejected") {
    logger.debug(
      `[trade-application-status-changed] Status '${data.status}' does not trigger email. Skipping.`
    )
    return
  }

  const storefrontUrl = (
    process.env.STOREFRONT_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "http://localhost:8000"
  ).replace(/\/$/, "")

  try {
    const templateData = {
      name: data.name || "Designer",
      company: data.company,
      status: normalizedStatus as "approved" | "rejected",
      storefrontUrl,
    }

    const { subject, html } = tradeApplicationStatusTemplate(templateData)

    const notificationService: any = container.resolve(Modules.NOTIFICATION)
    await notificationService.createNotifications({
      to: data.email,
      channel: "email",
      template: `trade-${normalizedStatus}`,
      data: templateData,
      content: { subject, html },
    })

    logger.info(
      `[trade-application-status-changed] Dispatched '${normalizedStatus}' notification to ${data.email}`
    )
  } catch (err: any) {
    logger.error(
      `[trade-application-status-changed] Failed to send trade status notification: ${err?.message || err}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "trade_application.status_changed",
}

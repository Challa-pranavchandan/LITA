import {
  AbstractNotificationProviderService,
  MedusaError,
} from "@medusajs/framework/utils"
import { Logger } from "@medusajs/framework/types"
import {
  orderPlacedTemplate,
  orderFulfillmentTemplate,
  tradeApplicationStatusTemplate,
  commissionStatusTemplate,
  passwordResetTemplate,
} from "./emails/templates"

export interface ResendServiceOptions {
  api_key?: string
  from?: string
  channels?: string[]
}

type InjectedDependencies = {
  logger: Logger
}

export class ResendNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "resend"

  protected config_: ResendServiceOptions
  protected logger_: Logger

  constructor({ logger }: InjectedDependencies, options: ResendServiceOptions) {
    super()
    this.config_ = {
      api_key: options.api_key || process.env.RESEND_API_KEY,
      from: options.from || process.env.RESEND_FROM_EMAIL || "LITA <onboarding@resend.dev>",
      channels: options.channels || ["email"],
    }
    this.logger_ = logger
  }

  async send(notification: any): Promise<Record<string, unknown>> {
    if (!notification) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "No notification information provided to Resend provider"
      )
    }

    const to = notification.to
    if (!to) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "No recipient ('to') provided for notification"
      )
    }

    const from = notification.from?.trim() || this.config_.from || "LITA <onboarding@resend.dev>"
    let subject = notification.content?.subject || notification.data?.subject
    let html = notification.content?.html || notification.data?.html

    // If template is provided, render via registered editorial templates
    if (notification.template && (!subject || !html)) {
      const templateData = notification.data || {}
      switch (notification.template) {
        case "order-placed":
        case "order.placed": {
          const rendered = orderPlacedTemplate(templateData)
          subject = subject || rendered.subject
          html = html || rendered.html
          break
        }
        case "order-fulfillment-created":
        case "order.fulfillment_created":
        case "order-shipped": {
          const rendered = orderFulfillmentTemplate(templateData)
          subject = subject || rendered.subject
          html = html || rendered.html
          break
        }
        case "trade-status":
        case "trade_application.status_changed": {
          const rendered = tradeApplicationStatusTemplate(templateData)
          subject = subject || rendered.subject
          html = html || rendered.html
          break
        }
        case "commission-status":
        case "commission.status_changed": {
          const rendered = commissionStatusTemplate(templateData)
          subject = subject || rendered.subject
          html = html || rendered.html
          break
        }
        case "password-reset":
        case "auth.password_reset": {
          const rendered = passwordResetTemplate(templateData)
          subject = subject || rendered.subject
          html = html || rendered.html
          break
        }
        default:
          break
      }
    }

    if (!subject) {
      subject = "Notification from LITA"
    }
    if (!html) {
      html = `<p>${notification.content?.text || "You have a new notification from LITA."}</p>`
    }

    const apiKey = this.config_.api_key || process.env.RESEND_API_KEY
    const isProduction = process.env.NODE_ENV === "production"

    if (!apiKey) {
      if (isProduction) {
        this.logger_.error(
          `[notification-resend] RESEND_API_KEY is not configured in production. Failed to send email to ${to}.`
        )
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          "RESEND_API_KEY is not configured in production"
        )
      }

      this.logger_.warn(
        `[notification-resend] RESEND_API_KEY is not configured in development. [DEV MOCK] Simulated email to '${to}' with subject: '${subject}'`
      )
      return { id: "mock_resend_delivery" }
    }

    const attachments = Array.isArray(notification.attachments)
      ? notification.attachments.map((att: any) => ({
          filename: att.filename,
          content: att.content,
        }))
      : undefined

    const payload: Record<string, unknown> = {
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    }

    if (attachments && attachments.length) {
      payload.attachments = attachments
    }

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errText = await res.text()
        this.logger_.error(
          `[notification-resend] Failed to send email via Resend (${res.status}): ${errText}`
        )
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          `Failed to send email via Resend (${res.status}): ${errText}`
        )
      }

      const data = (await res.json().catch(() => ({}))) as { id?: string }
      this.logger_.info(
        `[notification-resend] Successfully sent '${subject}' to ${to} (id: ${data.id || "ok"})`
      )
      return { id: data.id || "ok" }
    } catch (err: any) {
      if (err instanceof MedusaError) {
        throw err
      }
      this.logger_.error(`[notification-resend] Network error reaching Resend: ${err.message || err}`)
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Network error reaching Resend: ${err.message || err}`
      )
    }
  }
}

export default ResendNotificationProviderService

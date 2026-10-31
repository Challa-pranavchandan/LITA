import crypto from "crypto"
import { Modules } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { INQUIRY_MODULE } from "../modules/inquiry"
import InquiryModuleService from "../modules/inquiry/service"
import {
  inquiryCustomerAcknowledgementTemplate,
  inquiryStudioNotificationTemplate,
  newsletterConfirmationTemplate,
} from "../modules/resend/emails/templates"

export type CreateInquiryInput = {
  kind: "contact" | "artwork" | "commission_general" | "trade_general"
  name: string
  email: string
  phone?: string | null
  artwork_handle?: string | null
  budget?: string | null
  message: string
  source_url?: string | null
  ip_hash?: string | null
  user_agent?: string | null
  website?: string | null
  metadata?: Record<string, unknown> | null
}

export type CreateInquiryOutput = {
  inquiry: any
  isHoneypot: boolean
}

export const createInquiryRecordStep = createStep(
  "create-inquiry-record",
  async (
    input: CreateInquiryInput,
    { container }
  ): Promise<StepResponse<CreateInquiryOutput, string | null>> => {
    // If honeypot is triggered, silently succeed without storing
    if (input.website && input.website.trim().length > 0) {
      return new StepResponse(
        {
          inquiry: null,
          isHoneypot: true,
        },
        null
      )
    }

    const inquiryService: InquiryModuleService = container.resolve(INQUIRY_MODULE)
    const normalizedEmail = input.email.trim().toLowerCase()

    const created = await inquiryService.createInquiries({
      kind: input.kind,
      name: input.name.trim(),
      email: normalizedEmail,
      phone: input.phone?.trim() || null,
      artwork_handle: input.artwork_handle?.trim() || null,
      budget: input.budget?.trim() || null,
      message: input.message.trim(),
      status: "new",
      source_url: input.source_url?.trim() || null,
      ip_hash: input.ip_hash || null,
      user_agent: input.user_agent?.trim() || null,
      metadata: input.metadata || null,
    })

    return new StepResponse(
      {
        inquiry: created,
        isHoneypot: false,
      },
      created.id
    )
  },
  async (createdId, { container }) => {
    if (!createdId) return
    const inquiryService: InquiryModuleService = container.resolve(INQUIRY_MODULE)
    await inquiryService.deleteInquiries([createdId]).catch(() => null)
  }
)

export const sendInquiryEmailsStep = createStep(
  "send-inquiry-emails",
  async (
    input: { inquiry: any; isHoneypot: boolean },
    { container }
  ): Promise<StepResponse<{ studioEmailSent: boolean; ackEmailSent: boolean }>> => {
    if (input.isHoneypot || !input.inquiry) {
      return new StepResponse({ studioEmailSent: false, ackEmailSent: false })
    }

    const inquiry = input.inquiry
    let studioEmailSent = false
    let ackEmailSent = false

    try {
      const notificationService: any = container.resolve(Modules.NOTIFICATION)
      const studioEmail =
        process.env.STUDIO_EMAIL ||
        process.env.RESEND_FROM_EMAIL ||
        "studio@livinintheart.com"

      // 1. Studio notification email
      const studioTemplate = inquiryStudioNotificationTemplate({
        inquiryId: inquiry.id,
        kind: inquiry.kind,
        name: inquiry.name,
        email: inquiry.email,
        phone: inquiry.phone,
        artworkHandle: inquiry.artwork_handle,
        budget: inquiry.budget,
        message: inquiry.message,
        sourceUrl: inquiry.source_url,
      })

      await notificationService.createNotifications({
        to: studioEmail,
        channel: "email",
        template: "inquiry-studio-notification",
        data: { inquiryId: inquiry.id, kind: inquiry.kind },
        content: {
          subject: studioTemplate.subject,
          html: studioTemplate.html,
        },
      })
      studioEmailSent = true

      // 2. Customer acknowledgement email
      const ackTemplate = inquiryCustomerAcknowledgementTemplate({
        name: inquiry.name,
        email: inquiry.email,
        kind: inquiry.kind,
        artworkHandle: inquiry.artwork_handle,
        message: inquiry.message,
      })

      await notificationService.createNotifications({
        to: inquiry.email,
        channel: "email",
        template: "inquiry-customer-acknowledgement",
        data: { inquiryId: inquiry.id },
        content: {
          subject: ackTemplate.subject,
          html: ackTemplate.html,
        },
      })
      ackEmailSent = true
    } catch {
      // In local dev without notification service or Resend key, continue gracefully
    }

    return new StepResponse({ studioEmailSent, ackEmailSent })
  }
)

export const createInquiryWorkflow = createWorkflow(
  "create-inquiry",
  (input: CreateInquiryInput) => {
    const recordResult = createInquiryRecordStep(input)
    sendInquiryEmailsStep(recordResult)
    return new WorkflowResponse(recordResult)
  }
)

/* ==========================================================================
   Newsletter Workflows
   ========================================================================== */

export type SubscribeNewsletterInput = {
  email: string
  source?: string | null
  website?: string | null
}

export type SubscribeNewsletterOutput = {
  subscriber: any
  isHoneypot: boolean
  alreadyConfirmed: boolean
}

export const subscribeNewsletterRecordStep = createStep(
  "subscribe-newsletter-record",
  async (
    input: SubscribeNewsletterInput,
    { container }
  ): Promise<
    StepResponse<
      SubscribeNewsletterOutput & { token: string | null },
      string | null
    >
  > => {
    if (input.website && input.website.trim().length > 0) {
      return new StepResponse(
        {
          subscriber: null,
          isHoneypot: true,
          alreadyConfirmed: false,
          token: null,
        },
        null
      )
    }

    const inquiryService: InquiryModuleService = container.resolve(INQUIRY_MODULE)
    const normalizedEmail = input.email.trim().toLowerCase()

    const existingList = await inquiryService.listNewsletterSubscribers(
      {
        email: normalizedEmail,
      },
      { take: 1 }
    )
    const existing = existingList[0]

    if (existing && existing.status === "confirmed") {
      return new StepResponse(
        {
          subscriber: existing,
          isHoneypot: false,
          alreadyConfirmed: true,
          token: null,
        },
        null
      )
    }

    // Generate single-use token and hash
    const rawToken = crypto.randomBytes(32).toString("hex")
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex")

    let subscriber: any
    if (existing) {
      const updated = await inquiryService.updateNewsletterSubscribers({
        id: existing.id,
        status: "pending",
        confirm_token_hash: tokenHash,
        source: input.source?.trim() || existing.source || null,
      })
      subscriber = Array.isArray(updated) ? updated[0] : updated
    } else {
      subscriber = await inquiryService.createNewsletterSubscribers({
        email: normalizedEmail,
        status: "pending",
        confirm_token_hash: tokenHash,
        source: input.source?.trim() || null,
      })
    }

    return new StepResponse(
      {
        subscriber,
        isHoneypot: false,
        alreadyConfirmed: false,
        token: rawToken,
      },
      subscriber.id
    )
  }
)

export const sendNewsletterConfirmationEmailStep = createStep(
  "send-newsletter-confirmation-email",
  async (
    input: SubscribeNewsletterOutput & { token: string | null },
    { container }
  ): Promise<StepResponse<{ sent: boolean }>> => {
    if (input.isHoneypot || input.alreadyConfirmed || !input.token || !input.subscriber) {
      return new StepResponse({ sent: false })
    }

    const storefrontUrl = (
      process.env.STOREFRONT_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      "http://localhost:8000"
    ).replace(/\/$/, "")

    const confirmUrl = `${storefrontUrl}/newsletter/confirm?token=${input.token}`
    let sent = false

    try {
      const notificationService: any = container.resolve(Modules.NOTIFICATION)
      const template = newsletterConfirmationTemplate({
        email: input.subscriber.email,
        confirmUrl,
      })

      await notificationService.createNotifications({
        to: input.subscriber.email,
        channel: "email",
        template: "newsletter-confirmation",
        data: { email: input.subscriber.email, confirmUrl },
        content: {
          subject: template.subject,
          html: template.html,
        },
      })
      sent = true
    } catch {
      // In local dev without notification provider, continue
    }

    return new StepResponse({ sent })
  }
)

export const subscribeNewsletterWorkflow = createWorkflow(
  "subscribe-newsletter",
  (input: SubscribeNewsletterInput) => {
    const stepResult = subscribeNewsletterRecordStep(input)
    sendNewsletterConfirmationEmailStep(stepResult)
    return new WorkflowResponse(stepResult)
  }
)

export type ConfirmNewsletterInput = {
  token: string
}

export const confirmNewsletterStep = createStep(
  "confirm-newsletter",
  async (
    input: ConfirmNewsletterInput,
    { container }
  ): Promise<StepResponse<{ subscriber: any; confirmed: boolean }>> => {
    if (!input.token || typeof input.token !== "string") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "A valid confirmation token is required"
      )
    }

    const tokenHash = crypto.createHash("sha256").update(input.token.trim()).digest("hex")
    const inquiryService: InquiryModuleService = container.resolve(INQUIRY_MODULE)

    const subscribers = await inquiryService.listNewsletterSubscribers(
      {
        confirm_token_hash: tokenHash,
      },
      { take: 1 }
    )

    const subscriber = subscribers[0]
    if (!subscriber) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Invalid or expired confirmation token"
      )
    }

    const updated = await inquiryService.updateNewsletterSubscribers({
      id: subscriber.id,
      status: "confirmed",
      confirmed_at: new Date(),
      confirm_token_hash: null,
    })

    const finalSubscriber = Array.isArray(updated) ? updated[0] : updated
    return new StepResponse({ subscriber: finalSubscriber, confirmed: true })
  }
)

export const confirmNewsletterWorkflow = createWorkflow(
  "confirm-newsletter",
  (input: ConfirmNewsletterInput) => {
    return new WorkflowResponse(confirmNewsletterStep(input))
  }
)

export type UnsubscribeNewsletterInput = {
  email: string
}

export const unsubscribeNewsletterStep = createStep(
  "unsubscribe-newsletter",
  async (
    input: UnsubscribeNewsletterInput,
    { container }
  ): Promise<StepResponse<{ subscriber: any; unsubscribed: boolean }>> => {
    if (!input.email || typeof input.email !== "string") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "A valid email address is required"
      )
    }

    const inquiryService: InquiryModuleService = container.resolve(INQUIRY_MODULE)
    const normalizedEmail = input.email.trim().toLowerCase()

    const subscribers = await inquiryService.listNewsletterSubscribers(
      {
        email: normalizedEmail,
      },
      { take: 1 }
    )

    const subscriber = subscribers[0]
    if (!subscriber) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Subscriber not found"
      )
    }

    const updated = await inquiryService.updateNewsletterSubscribers({
      id: subscriber.id,
      status: "unsubscribed",
      unsubscribed_at: new Date(),
    })

    const finalSubscriber = Array.isArray(updated) ? updated[0] : updated
    return new StepResponse({ subscriber: finalSubscriber, unsubscribed: true })
  }
)

export const unsubscribeNewsletterWorkflow = createWorkflow(
  "unsubscribe-newsletter",
  (input: UnsubscribeNewsletterInput) => {
    return new WorkflowResponse(unsubscribeNewsletterStep(input))
  }
)

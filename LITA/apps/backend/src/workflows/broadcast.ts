import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { BROADCAST_MODULE } from "../modules/broadcast"
import BroadcastModuleService from "../modules/broadcast/service"
import { INQUIRY_MODULE } from "../modules/inquiry"
import InquiryModuleService from "../modules/inquiry/service"
import { broadcastEmailTemplate } from "../modules/resend/emails/templates"

export type CreateBroadcastInput = {
  title: string
  channels?: string[]
  status?: "draft" | "scheduled" | "active" | "completed" | "archived"
  target_audience?: "all_subscribers" | "opted_in_customers" | "all_users"
  email_subject?: string | null
  email_preheader?: string | null
  email_content_html?: string | null
  popup_title?: string | null
  popup_body?: string | null
  popup_image_url?: string | null
  popup_coupon_code?: string | null
  popup_cta_text?: string | null
  popup_cta_link?: string | null
  popup_type?: "modal" | "banner" | "both"
  popup_frequency?: "once_per_visitor" | "once_per_session" | "always"
  is_popup_active?: boolean
  starts_at?: string | Date | null
  ends_at?: string | Date | null
  metadata?: Record<string, unknown> | null
}

export type UpdateBroadcastInput = {
  id: string
} & Partial<CreateBroadcastInput>

/* --------------------------------------------------------------------------
   Create Broadcast
   -------------------------------------------------------------------------- */
export const createBroadcastStep = createStep(
  "create-broadcast",
  async (input: CreateBroadcastInput, { container }) => {
    const service: BroadcastModuleService = container.resolve(BROADCAST_MODULE)
    const broadcast = await service.createBroadcasts({
      ...input,
      channels: input.channels || ["email"],
      status: input.status || "draft",
      target_audience: input.target_audience || "all_subscribers",
      is_popup_active: Boolean(input.is_popup_active),
      starts_at: input.starts_at ? new Date(input.starts_at) : null,
      ends_at: input.ends_at ? new Date(input.ends_at) : null,
    } as any)
    return new StepResponse(broadcast, broadcast.id)
  },
  async (id, { container }) => {
    if (!id) return
    const service: BroadcastModuleService = container.resolve(BROADCAST_MODULE)
    await service.deleteBroadcasts(id)
  }
)

export const createBroadcastWorkflow = createWorkflow(
  "create-broadcast",
  (input: CreateBroadcastInput) => new WorkflowResponse(createBroadcastStep(input))
)

/* --------------------------------------------------------------------------
   Update Broadcast
   -------------------------------------------------------------------------- */
export const updateBroadcastStep = createStep(
  "update-broadcast",
  async (input: UpdateBroadcastInput, { container }) => {
    const service: BroadcastModuleService = container.resolve(BROADCAST_MODULE)
    const prev = await service.retrieveBroadcast(input.id)
    const { id, ...data } = input
    const patch: any = { id, ...data }
    if (data.starts_at !== undefined) {
      patch.starts_at = data.starts_at ? new Date(data.starts_at) : null
    }
    if (data.ends_at !== undefined) {
      patch.ends_at = data.ends_at ? new Date(data.ends_at) : null
    }
    const updated = await service.updateBroadcasts(patch)
    return new StepResponse(updated, prev)
  },
  async (prev, { container }) => {
    if (!prev) return
    const service: BroadcastModuleService = container.resolve(BROADCAST_MODULE)
    await service.updateBroadcasts(prev)
  }
)

export const updateBroadcastWorkflow = createWorkflow(
  "update-broadcast",
  (input: UpdateBroadcastInput) => new WorkflowResponse(updateBroadcastStep(input))
)

/* --------------------------------------------------------------------------
   Delete Broadcast
   -------------------------------------------------------------------------- */
export const deleteBroadcastStep = createStep(
  "delete-broadcast",
  async (id: string, { container }) => {
    const service: BroadcastModuleService = container.resolve(BROADCAST_MODULE)
    const prev = await service.retrieveBroadcast(id)
    await service.deleteBroadcasts(id)
    return new StepResponse({ success: true }, prev)
  },
  async (prev, { container }) => {
    if (!prev) return
    const service: BroadcastModuleService = container.resolve(BROADCAST_MODULE)
    await service.createBroadcasts(prev as any)
  }
)

export const deleteBroadcastWorkflow = createWorkflow(
  "delete-broadcast",
  (id: string) => new WorkflowResponse(deleteBroadcastStep(id))
)

/* --------------------------------------------------------------------------
   Track Event (Impression / Click) Workflow
   -------------------------------------------------------------------------- */
export type TrackBroadcastEventInput = {
  id: string
  event: "impression" | "click"
}

export const trackBroadcastEventStep = createStep(
  "track-broadcast-event",
  async ({ id, event }: TrackBroadcastEventInput, { container }) => {
    const service: BroadcastModuleService = container.resolve(BROADCAST_MODULE)
    const broadcast = await service.retrieveBroadcast(id).catch(() => null)
    if (!broadcast) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Broadcast with ID ${id} was not found.`
      )
    }

    const patch: Record<string, any> = { id }
    if (event === "impression") {
      patch.impressions_count = (broadcast.impressions_count || 0) + 1
    } else if (event === "click") {
      patch.clicks_count = (broadcast.clicks_count || 0) + 1
    }

    const updated = await service.updateBroadcasts(patch)
    return new StepResponse(updated)
  }
)

export const trackBroadcastEventWorkflow = createWorkflow(
  "track-broadcast-event",
  (input: TrackBroadcastEventInput) =>
    new WorkflowResponse(trackBroadcastEventStep(input))
)

/* --------------------------------------------------------------------------
   Send Broadcast to All Target Recipients
   -------------------------------------------------------------------------- */
export type SendBroadcastInput = {
  id: string
}

export const sendBroadcastStep = createStep(
  "send-broadcast",
  async ({ id }: SendBroadcastInput, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const broadcastService: BroadcastModuleService = container.resolve(BROADCAST_MODULE)
    const broadcast = await broadcastService.retrieveBroadcast(id)

    if (!broadcast) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Broadcast with ID ${id} not found.`
      )
    }

    const storefrontUrl = (
      process.env.STOREFRONT_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      "http://localhost:8000"
    ).replace(/\/$/, "")

    // 1. Gather recipients based on target_audience
    const recipientEmails = new Set<string>()

    // Inquiry module -> newsletter subscribers
    try {
      const inquiryService: InquiryModuleService = container.resolve(INQUIRY_MODULE)
      const subFilter =
        broadcast.target_audience === "all_users"
          ? {}
          : { status: "confirmed" }
      const subscribers = await inquiryService.listNewsletterSubscribers(subFilter, {
        take: 10000,
      })
      for (const sub of subscribers) {
        if (sub.email && sub.status !== "unsubscribed") {
          recipientEmails.add(sub.email.trim().toLowerCase())
        }
      }
    } catch (err: any) {
      logger.warn(`[broadcast] Failed to fetch newsletter subscribers: ${err.message}`)
    }

    // Customer module -> registered customers
    if (
      broadcast.target_audience === "opted_in_customers" ||
      broadcast.target_audience === "all_users"
    ) {
      try {
        const customerService: any = container.resolve(Modules.CUSTOMER)
        const customers = await customerService.listCustomers(
          {},
          { select: ["id", "email", "metadata"], take: 10000 }
        )
        for (const cust of customers) {
          if (cust.email) {
            const isOptedOut = cust.metadata?.marketing_opt_in === false
            if (!isOptedOut) {
              recipientEmails.add(cust.email.trim().toLowerCase())
            }
          }
        }
      } catch (err: any) {
        logger.warn(`[broadcast] Failed to fetch customer accounts: ${err.message}`)
      }
    }

    const recipients = Array.from(recipientEmails)
    logger.info(`[broadcast] Found ${recipients.length} target recipients for broadcast "${broadcast.title}"`)

    if (recipients.length === 0) {
      await broadcastService.updateBroadcasts({
        id: broadcast.id,
        recipients_count: 0,
        sent_count: 0,
        failed_count: 0,
        sent_at: new Date(),
        status: "completed",
      })
      return new StepResponse({
        id: broadcast.id,
        recipients_count: 0,
        sent_count: 0,
        failed_count: 0,
      })
    }

    // 2. Dispatch emails using Notification service in batches
    const notificationService: any = container.resolve(Modules.NOTIFICATION)
    let sentCount = 0
    let failedCount = 0

    const batchSize = 2
    for (let i = 0; i < recipients.length; i += batchSize) {
      if (i > 0) {
        // Sleep 1s between batches of 2 to strictly respect Resend's 2 req/sec rate limit
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
      const batch = recipients.slice(i, i + batchSize)
      await Promise.allSettled(
        batch.map(async (email) => {
          try {
            const unsubscribeUrl = `${storefrontUrl}/api/store/newsletter/unsubscribe?email=${encodeURIComponent(
              email
            )}`
            const templateData = {
              subject: broadcast.email_subject || broadcast.title,
              preheader: broadcast.email_preheader || undefined,
              headline: broadcast.popup_title || broadcast.title,
              bodyHtml: broadcast.email_content_html || broadcast.popup_body || "",
              imageUrl: broadcast.popup_image_url || undefined,
              couponCode: broadcast.popup_coupon_code || undefined,
              ctaText: broadcast.popup_cta_text || undefined,
              ctaLink: broadcast.popup_cta_link
                ? broadcast.popup_cta_link.startsWith("http")
                  ? broadcast.popup_cta_link
                  : `${storefrontUrl}${broadcast.popup_cta_link.startsWith("/") ? "" : "/"}${broadcast.popup_cta_link}`
                : undefined,
              storefrontUrl,
              recipientEmail: email,
              unsubscribeUrl,
            }

            const { subject, html } = broadcastEmailTemplate(templateData)

            await notificationService.createNotifications({
              to: email,
              channel: "email",
              template: "broadcast",
              data: templateData,
              content: { subject, html },
            })
            sentCount++
          } catch (err: any) {
            logger.error(`[broadcast] Error sending to ${email}: ${err.message}`)
            failedCount++
          }
        })
      )
    }

    // 3. Update broadcast metrics
    const updated = await broadcastService.updateBroadcasts({
      id: broadcast.id,
      recipients_count: recipients.length,
      sent_count: sentCount,
      failed_count: failedCount,
      sent_at: new Date(),
      status: "completed",
    })

    logger.info(
      `[broadcast] Broadcast "${broadcast.title}" finished: ${sentCount} sent, ${failedCount} failed.`
    )

    return new StepResponse(updated)
  }
)

export const sendBroadcastWorkflow = createWorkflow(
  "send-broadcast",
  (input: SendBroadcastInput) => new WorkflowResponse(sendBroadcastStep(input))
)

/* --------------------------------------------------------------------------
   Send Test Broadcast Email (Admin Only)
   -------------------------------------------------------------------------- */
export type SendTestBroadcastInput = {
  id: string
  testEmail: string
}

export const sendTestBroadcastStep = createStep(
  "send-test-broadcast",
  async ({ id, testEmail }: SendTestBroadcastInput, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const broadcastService: BroadcastModuleService = container.resolve(BROADCAST_MODULE)
    const broadcast = await broadcastService.retrieveBroadcast(id)

    if (!broadcast) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Broadcast with ID ${id} not found.`
      )
    }

    const storefrontUrl = (
      process.env.STOREFRONT_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      "http://localhost:8000"
    ).replace(/\/$/, "")

    const notificationService: any = container.resolve(Modules.NOTIFICATION)

    const templateData = {
      subject: `[TEST] ${broadcast.email_subject || broadcast.title}`,
      preheader: broadcast.email_preheader || undefined,
      headline: broadcast.popup_title || broadcast.title,
      bodyHtml:
        broadcast.email_content_html ||
        broadcast.popup_body ||
        "<p>This is a test preview of your broadcast email.</p>",
      imageUrl: broadcast.popup_image_url || undefined,
      couponCode: broadcast.popup_coupon_code || undefined,
      ctaText: broadcast.popup_cta_text || undefined,
      ctaLink: broadcast.popup_cta_link
        ? broadcast.popup_cta_link.startsWith("http")
          ? broadcast.popup_cta_link
          : `${storefrontUrl}${broadcast.popup_cta_link.startsWith("/") ? "" : "/"}${broadcast.popup_cta_link}`
        : undefined,
      storefrontUrl,
      recipientEmail: testEmail,
      unsubscribeUrl: `${storefrontUrl}/api/store/newsletter/unsubscribe?email=${encodeURIComponent(
        testEmail
      )}`,
    }

    const { subject, html } = broadcastEmailTemplate(templateData)

    await notificationService.createNotifications({
      to: testEmail,
      channel: "email",
      template: "broadcast",
      data: templateData,
      content: { subject, html },
    })

    logger.info(`[broadcast] Sent test email for broadcast "${broadcast.title}" to ${testEmail}`)
    return new StepResponse({ success: true, testEmail })
  }
)

export const sendTestBroadcastWorkflow = createWorkflow(
  "send-test-broadcast",
  (input: SendTestBroadcastInput) => new WorkflowResponse(sendTestBroadcastStep(input))
)

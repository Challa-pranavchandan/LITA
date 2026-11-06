import { asValue, createContainer } from "awilix"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { BROADCAST_MODULE } from "../../modules/broadcast"
import { INQUIRY_MODULE } from "../../modules/inquiry"
import {
  broadcastEmailTemplate,
} from "../../modules/resend/emails/templates"
import {
  sendBroadcastWorkflow,
  sendTestBroadcastWorkflow,
  trackBroadcastEventWorkflow,
} from "../broadcast"

describe("Broadcast & Notification System", () => {
  describe("broadcastEmailTemplate", () => {
    it("renders editorial broadcast email with coupon code and CTA button", () => {
      const result = broadcastEmailTemplate({
        subject: "Exclusive Preview: Diwali 2026 Collection",
        preheader: "Handcrafted originals available for private acquisition",
        headline: "Private Exhibition Access",
        bodyHtml: "<p>We invite you to experience our newest curated originals.</p>",
        couponCode: "DIWALI15",
        ctaText: "Acquire Selected Works",
        ctaLink: "https://lita.art/artworks",
        storefrontUrl: "https://lita.art",
        unsubscribeUrl: "https://lita.art/api/store/newsletter/unsubscribe?email=test@example.com",
      })

      expect(result.subject).toBe("Exclusive Preview: Diwali 2026 Collection")
      expect(result.html).toContain("Livin In The Art")
      expect(result.html).toContain("Private Exhibition Access")
      expect(result.html).toContain("DIWALI15")
      expect(result.html).toContain("Acquire Selected Works")
      expect(result.html).toContain("https://lita.art/artworks")
      expect(result.html).toContain("Manage email preferences or unsubscribe")
    })

    it("renders gracefully without optional coupon code and image", () => {
      const result = broadcastEmailTemplate({
        subject: "Studio Update",
        bodyHtml: "<p>The studio will be closed for curation this Monday.</p>",
        storefrontUrl: "https://lita.art",
      })

      expect(result.subject).toBe("Studio Update")
      expect(result.html).toContain("The studio will be closed")
      expect(result.html).not.toContain("Exclusive Collector Offer")
    })
  })

  describe("Broadcast Workflows", () => {
    let container: any
    let mockBroadcastService: any
    let mockInquiryService: any
    let mockCustomerService: any
    let mockNotificationService: any
    let mockLogger: any

    beforeEach(() => {
      mockBroadcastService = {
        retrieveBroadcast: jest.fn(),
        updateBroadcasts: jest.fn().mockImplementation((patch) => Promise.resolve(patch)),
      }

      mockInquiryService = {
        listNewsletterSubscribers: jest.fn().mockResolvedValue([
          { email: "collector1@example.com", status: "confirmed" },
          { email: "collector2@example.com", status: "confirmed" },
          { email: "unsub@example.com", status: "unsubscribed" },
        ]),
      }

      mockCustomerService = {
        listCustomers: jest.fn().mockResolvedValue([
          { email: "collector1@example.com", metadata: { marketing_opt_in: true } },
          { email: "collector3@example.com", metadata: { marketing_opt_in: true } },
          { email: "opted_out@example.com", metadata: { marketing_opt_in: false } },
        ]),
      }

      mockNotificationService = {
        createNotifications: jest.fn().mockResolvedValue({ id: "notif_123" }),
      }

      mockLogger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      }

      container = createContainer()
      container.register({
        [ContainerRegistrationKeys.LOGGER]: asValue(mockLogger),
        [BROADCAST_MODULE]: asValue(mockBroadcastService),
        [INQUIRY_MODULE]: asValue(mockInquiryService),
        [Modules.CUSTOMER]: asValue(mockCustomerService),
        [Modules.NOTIFICATION]: asValue(mockNotificationService),
      })
    })

    it("sendTestBroadcastWorkflow sends a test email to admin", async () => {
      mockBroadcastService.retrieveBroadcast.mockResolvedValue({
        id: "camp_1",
        title: "Test Campaign",
        email_subject: "Preview Subject",
        email_content_html: "<p>Hello</p>",
      })

      const response = await sendTestBroadcastWorkflow(container as never).run({
        input: {
          id: "camp_1",
          testEmail: "admin@lita.art",
        },
      })

      expect(response.result).toEqual({
        success: true,
        testEmail: "admin@lita.art",
      })
      expect(mockNotificationService.createNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "admin@lita.art",
          channel: "email",
          template: "broadcast",
        })
      )
    })

    it("sendBroadcastWorkflow deduplicates emails and updates recipient stats", async () => {
      mockBroadcastService.retrieveBroadcast.mockResolvedValue({
        id: "camp_1",
        title: "Collector Blast",
        target_audience: "opted_in_customers",
        email_subject: "Collector Blast Subject",
        email_content_html: "<p>Exclusive release</p>",
      })

      await sendBroadcastWorkflow(container as never).run({
        input: { id: "camp_1" },
      })

      // collector1@example.com is in both subscribers and customers -> deduplicated to 1
      // collector2@example.com is in subscribers (confirmed) -> included
      // unsub@example.com is unsubscribed -> excluded
      // collector3@example.com is in customers (opted in) -> included
      // opted_out@example.com has marketing_opt_in = false -> excluded
      // Total valid unique recipients = 3: collector1, collector2, collector3
      expect(mockNotificationService.createNotifications).toHaveBeenCalledTimes(3)
      expect(mockBroadcastService.updateBroadcasts).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "camp_1",
          recipients_count: 3,
          sent_count: 3,
          failed_count: 0,
          status: "completed",
        })
      )
    })

    it("trackBroadcastEventWorkflow tracks impressions and clicks", async () => {
      mockBroadcastService.retrieveBroadcast.mockResolvedValue({
        id: "camp_1",
        impressions_count: 5,
        clicks_count: 2,
      })

      await trackBroadcastEventWorkflow(container as never).run({
        input: { id: "camp_1", event: "impression" },
      })

      expect(mockBroadcastService.updateBroadcasts).toHaveBeenCalledWith({
        id: "camp_1",
        impressions_count: 6,
      })

      await trackBroadcastEventWorkflow(container as never).run({
        input: { id: "camp_1", event: "click" },
      })

      expect(mockBroadcastService.updateBroadcasts).toHaveBeenCalledWith({
        id: "camp_1",
        clicks_count: 3,
      })
    })
  })
})

import { createContainer, asValue } from "awilix"
import { Modules } from "@medusajs/framework/utils"
import {
  PostInquirySchema,
  SubscribeNewsletterSchema,
  UnsubscribeNewsletterSchema,
  UpdateInquirySchema,
} from "../api/middlewares"
import {
  createRateLimitMiddleware,
  checkBackendRateLimit,
  resetBackendRateLimitStore,
} from "../api/middlewares/rate-limit"
import { verifyTurnstileToken } from "../lib/turnstile"
import { INQUIRY_MODULE } from "../modules/inquiry"
import {
  createInquiryWorkflow,
  subscribeNewsletterWorkflow,
  confirmNewsletterWorkflow,
  unsubscribeNewsletterWorkflow,
} from "../workflows/inquiries"

describe("B6 - Backend Inquiries, Newsletter & Rate Limiting", () => {
  describe("Zod Validation Schemas", () => {
    it("validates PostInquirySchema with valid data and trims email", () => {
      const valid = PostInquirySchema.parse({
        kind: "artwork",
        name: "  Priya Sharma  ",
        email: "  PRIYA@STUDIO.IN  ",
        artwork_handle: "whispers-in-bronze",
        message: "I am interested in acquiring this original canvas.",
      })
      expect(valid.kind).toBe("artwork")
      expect(valid.name).toBe("Priya Sharma")
      expect(valid.email).toBe("priya@studio.in")
      expect(valid.artwork_handle).toBe("whispers-in-bronze")
    })

    it("rejects PostInquirySchema on missing required fields or invalid email", () => {
      expect(() =>
        PostInquirySchema.parse({
          kind: "artwork",
          name: "Priya",
          email: "not-an-email",
          message: "Hello",
        })
      ).toThrow()

      expect(() =>
        PostInquirySchema.parse({
          kind: "invalid-kind",
          name: "Priya",
          email: "priya@studio.in",
          message: "Hello",
        })
      ).toThrow()
    })

    it("enforces max lengths on inquiry fields", () => {
      expect(() =>
        PostInquirySchema.parse({
          kind: "contact",
          name: "A".repeat(121),
          email: "valid@studio.in",
          message: "Hello",
        })
      ).toThrow()

      expect(() =>
        PostInquirySchema.parse({
          kind: "contact",
          name: "Valid",
          email: "valid@studio.in",
          message: "M".repeat(4001),
        })
      ).toThrow()
    })

    it("validates SubscribeNewsletterSchema with email normalization", () => {
      const valid = SubscribeNewsletterSchema.parse({
        email: "  COLLECTOR@GALLERY.COM  ",
        source: "footer",
      })
      expect(valid.email).toBe("collector@gallery.com")
      expect(valid.source).toBe("footer")
    })

    it("validates UnsubscribeNewsletterSchema and UpdateInquirySchema", () => {
      const unsub = UnsubscribeNewsletterSchema.parse({
        email: "COLLECTOR@GALLERY.COM",
      })
      expect(unsub.email).toBe("collector@gallery.com")

      const update = UpdateInquirySchema.parse({ status: "replied" })
      expect(update.status).toBe("replied")

      expect(() => UpdateInquirySchema.parse({ status: "invalid" })).toThrow()
    })
  })

  describe("Turnstile Token Verification", () => {
    it("accepts valid test tokens in development", async () => {
      const res1 = await verifyTurnstileToken("dummy-turnstile-token")
      expect(res1.success).toBe(true)

      const res2 = await verifyTurnstileToken("test-pass-abc123")
      expect(res2.success).toBe(true)
    })

    it("rejects missing tokens", async () => {
      const res = await verifyTurnstileToken(undefined)
      expect(res.success).toBe(false)
      expect(res.errorCodes).toContain("missing-input-response")
    })

    it("rejects invalid test tokens", async () => {
      const res = await verifyTurnstileToken("invalid-turnstile-token")
      expect(res.success).toBe(false)
      expect(res.errorCodes).toContain("invalid-input-response")
    })
  })

  describe("Rate Limiter Middleware", () => {
    beforeEach(() => {
      resetBackendRateLimitStore()
    })

    it("permits 5 requests in window and rejects 6th request with 429 and Retry-After", async () => {
      const action = "inquiry"
      const clientKey = `${action}:hashed_client_ip_1`

      for (let i = 1; i <= 5; i++) {
        const result = checkBackendRateLimit(clientKey, 5, 60000)
        expect(result.success).toBe(true)
        expect(result.remaining).toBe(5 - i)
      }

      // 6th attempt should be blocked
      const blocked = checkBackendRateLimit(clientKey, 5, 60000)
      expect(blocked.success).toBe(false)
      expect(blocked.remaining).toBe(0)
      expect(blocked.resetInSeconds).toBeGreaterThan(0)
    })

    it("middleware sets rate limit headers and blocks when exceeded", async () => {
      const middleware = createRateLimitMiddleware("inquiry", 2, 60000)

      const headers: Record<string, string> = {}
      const res: any = {
        setHeader: jest.fn((k: string, v: string) => {
          headers[k] = v
        }),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      }
      const req: any = {
        headers: { "x-forwarded-for": "203.0.113.195" },
      }
      const next = jest.fn()

      // Request 1
      await middleware(req, res, next)
      expect(next).toHaveBeenCalledTimes(1)
      expect(headers["X-RateLimit-Limit"]).toBe("2")
      expect(headers["X-RateLimit-Remaining"]).toBe("1")

      // Request 2
      await middleware(req, res, next)
      expect(next).toHaveBeenCalledTimes(2)
      expect(headers["X-RateLimit-Remaining"]).toBe("0")

      // Request 3 (exceeded)
      await middleware(req, res, next)
      expect(next).toHaveBeenCalledTimes(2)
      expect(res.status).toHaveBeenCalledWith(429)
      expect(headers["Retry-After"]).toBeDefined()
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Too many requests. Please try again later.",
        })
      )
    })
  })

  describe("createInquiryWorkflow", () => {
    it("stores valid inquiry and queues studio and customer acknowledgment emails", async () => {
      const mockCreated = {
        id: "inq_test_123",
        kind: "artwork",
        name: "Arjun Mehta",
        email: "arjun@artadvisory.in",
        phone: "+919876543210",
        artwork_handle: "whispers-in-bronze",
        budget: "₹50,000",
        message: "Inquiring about private studio viewing.",
        status: "new",
        source_url: "/artworks/whispers-in-bronze",
        ip_hash: "hashed123",
        user_agent: "Mozilla/5.0",
        created_at: new Date(),
      }

      const mockInquiryService = {
        createInquiries: jest.fn().mockResolvedValue(mockCreated),
        deleteInquiries: jest.fn().mockResolvedValue([]),
      }

      const mockNotificationService = {
        createNotifications: jest.fn().mockResolvedValue([]),
      }

      const container = createContainer()
      container.register({
        [INQUIRY_MODULE]: asValue(mockInquiryService),
        [Modules.NOTIFICATION]: asValue(mockNotificationService),
      })

      const { result } = await createInquiryWorkflow(container as any).run({
        input: {
          kind: "artwork",
          name: "Arjun Mehta",
          email: "arjun@artadvisory.in",
          phone: "+919876543210",
          artwork_handle: "whispers-in-bronze",
          budget: "₹50,000",
          message: "Inquiring about private studio viewing.",
          source_url: "/artworks/whispers-in-bronze",
          ip_hash: "hashed123",
          user_agent: "Mozilla/5.0",
        },
      })

      expect(mockInquiryService.createInquiries).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Arjun Mehta",
          email: "arjun@artadvisory.in",
          status: "new",
        })
      )
      expect(result.isHoneypot).toBe(false)
      expect(result.inquiry.id).toBe("inq_test_123")

      expect(mockNotificationService.createNotifications).toHaveBeenCalledTimes(2)
      // Check studio notification
      expect(mockNotificationService.createNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: "email",
          template: "inquiry-studio-notification",
        })
      )
      // Check customer acknowledgment
      expect(mockNotificationService.createNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "arjun@artadvisory.in",
          channel: "email",
          template: "inquiry-customer-acknowledgement",
        })
      )
    })

    it("silently accepts honeypot submissions without storing or sending email", async () => {
      const mockInquiryService = {
        createInquiries: jest.fn(),
      }
      const mockNotificationService = {
        createNotifications: jest.fn(),
      }

      const container = createContainer()
      container.register({
        [INQUIRY_MODULE]: asValue(mockInquiryService),
        [Modules.NOTIFICATION]: asValue(mockNotificationService),
      })

      const { result } = await createInquiryWorkflow(container as any).run({
        input: {
          kind: "contact",
          name: "Bot",
          email: "bot@spam.com",
          message: "Spam message",
          website: "http://spam-link.ru", // Honeypot field filled
        },
      })

      expect(mockInquiryService.createInquiries).not.toHaveBeenCalled()
      expect(result.isHoneypot).toBe(true)
      expect(result.inquiry).toBeNull()
      expect(mockNotificationService.createNotifications).not.toHaveBeenCalled()
    })
  })

  describe("Newsletter Double Opt-In Flow & Unsubscribe", () => {
    it("subscribes new user as pending with single-use token and sends confirmation email", async () => {
      let savedSubscriber: any = null
      const mockInquiryService = {
        listNewsletterSubscribers: jest.fn().mockResolvedValue([]),
        createNewsletterSubscribers: jest.fn().mockImplementation((data) => {
          savedSubscriber = { id: "sub_1", ...data }
          return Promise.resolve(savedSubscriber)
        }),
      }

      const mockNotificationService = {
        createNotifications: jest.fn().mockResolvedValue([]),
      }

      const container = createContainer()
      container.register({
        [INQUIRY_MODULE]: asValue(mockInquiryService),
        [Modules.NOTIFICATION]: asValue(mockNotificationService),
      })

      const { result } = await subscribeNewsletterWorkflow(container as any).run({
        input: { email: "collector@lita.in", source: "homepage" },
      })

      expect(result.isHoneypot).toBe(false)
      expect(result.alreadyConfirmed).toBe(false)
      expect(savedSubscriber.status).toBe("pending")
      expect(savedSubscriber.confirm_token_hash).toBeDefined()
      expect(mockNotificationService.createNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "collector@lita.in",
          channel: "email",
          template: "newsletter-confirmation",
        })
      )
    })

    it("confirmNewsletterWorkflow marks subscriber as confirmed and clears token", async () => {
      let subscriberState: Record<string, any> = {
        id: "sub_1",
        email: "collector@lita.in",
        status: "pending",
        confirm_token_hash: "dummy_hash",
      }

      const mockInquiryService = {
        listNewsletterSubscribers: jest.fn().mockImplementation(() => [subscriberState]),
        updateNewsletterSubscribers: jest.fn().mockImplementation(({ id, status, confirmed_at, confirm_token_hash }) => {
          subscriberState = { ...subscriberState, status, confirmed_at, confirm_token_hash }
          return Promise.resolve(subscriberState)
        }),
      }

      const container = createContainer()
      container.register({
        [INQUIRY_MODULE]: asValue(mockInquiryService),
      })

      const { result } = await confirmNewsletterWorkflow(container as any).run({
        input: { token: "valid_token" },
      })

      expect(result.confirmed).toBe(true)
      expect(subscriberState.status).toBe("confirmed")
      expect(subscriberState.confirm_token_hash).toBeNull()
    })

    it("unsubscribe token / link cannot be reused (re-confirmation throws INVALID_DATA)", async () => {
      const mockInquiryService = {
        listNewsletterSubscribers: jest.fn().mockResolvedValue([]), // Token cleared so not found
      }

      const container = createContainer()
      container.register({
        [INQUIRY_MODULE]: asValue(mockInquiryService),
      })

      const { errors } = await confirmNewsletterWorkflow(container as any).run({
        input: { token: "reused_token" },
        throwOnError: false,
      })

      expect(errors).toBeDefined()
      expect(errors.length).toBeGreaterThan(0)
      expect((errors[0].error as any).message).toContain("Invalid or expired confirmation token")
    })

    it("unsubscribeNewsletterWorkflow marks subscriber as unsubscribed", async () => {
      let subscriber = {
        id: "sub_1",
        email: "collector@lita.in",
        status: "confirmed",
      }

      const mockInquiryService = {
        listNewsletterSubscribers: jest.fn().mockResolvedValue([subscriber]),
        updateNewsletterSubscribers: jest.fn().mockImplementation((data) => {
          subscriber = { ...subscriber, ...data }
          return Promise.resolve(subscriber)
        }),
      }

      const container = createContainer()
      container.register({
        [INQUIRY_MODULE]: asValue(mockInquiryService),
      })

      const { result } = await unsubscribeNewsletterWorkflow(container as any).run({
        input: { email: "collector@lita.in" },
      })

      expect(result.unsubscribed).toBe(true)
      expect(subscriber.status).toBe("unsubscribed")
    })
  })
})

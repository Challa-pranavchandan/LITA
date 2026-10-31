import { authenticate, configureStoreSearch, defineMiddlewares, validateAndTransformBody } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import multer from "multer"
import { createRateLimitMiddleware } from "./middlewares/rate-limit"

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
})

const PostSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  content: z.string().min(1),
  excerpt: z.string().optional().nullable(),
  cover_image_url: z.string().optional().nullable(),
  status: z.enum(["draft", "published"]).optional(),
  tags: z.array(z.string()).optional().nullable(),
})

const CreateItems = z.object({
  items: z
    .array(
      z.object({
        image_url: z.string().url(),
        file_id: z.string().optional(),
        alt: z.string().optional(),
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
      })
    )
    .min(1),
})

const UpdateLayout = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      position: z.number().int().min(0),
      col_span: z.number().int().min(1).max(2),
      row_span: z.number().int().min(1).max(2),
    })
  ),
})

const UpdateItem = z.object({
  alt: z.string().nullable().optional(),
  caption: z.string().nullable().optional(),
  is_published: z.boolean().optional(),
})

export const PostTradeApplicationSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120, "Name cannot exceed 120 characters"),
  email: z.string().trim().toLowerCase().pipe(z.string().email("Valid email is required")),
  company: z.string().trim().max(120, "Company cannot exceed 120 characters").optional().nullable(),
  role: z.string().trim().max(100, "Role cannot exceed 100 characters").optional().nullable(),
  phone: z.string().trim().max(10, "Phone cannot exceed 10 characters").optional().nullable(),
  website: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    z.string().trim().max(100, "Website cannot exceed 100 characters").url("Website must be a valid URL").optional().nullable()
  ),
  message: z.string().trim().max(4000, "Message cannot exceed 4000 characters").optional().nullable(),
})

export const UpdateTradeApplicationSchema = z.object({
  status: z.enum(["approved", "rejected", "pending"]),
})

export const PostInquirySchema = z.object({
  kind: z.enum(["contact", "artwork", "commission_general", "trade_general"]),
  name: z.string().trim().min(1, "Name is required").max(120, "Name cannot exceed 120 characters"),
  email: z.string().trim().toLowerCase().pipe(z.string().email("Valid email is required")),
  phone: z.string().trim().max(30, "Phone cannot exceed 30 characters").optional().nullable(),
  artwork_handle: z.string().trim().max(120, "Artwork handle cannot exceed 120 characters").optional().nullable(),
  budget: z.string().trim().max(60, "Budget cannot exceed 60 characters").optional().nullable(),
  message: z.string().trim().min(1, "Message is required").max(4000, "Message cannot exceed 4000 characters"),
  source_url: z.string().trim().max(500, "Source URL cannot exceed 500 characters").optional().nullable(),
  turnstile_token: z.string().trim().max(2048).optional().nullable(),
  "cf-turnstile-response": z.string().trim().max(2048).optional().nullable(),
  website: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
})

export const SubscribeNewsletterSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.string().email("Valid email is required")),
  source: z.string().trim().max(100, "Source cannot exceed 100 characters").optional().nullable(),
  turnstile_token: z.string().trim().max(2048).optional().nullable(),
  "cf-turnstile-response": z.string().trim().max(2048).optional().nullable(),
  website: z.string().optional().nullable(),
})

export const UnsubscribeNewsletterSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.string().email("Valid email is required")),
  website: z.string().optional().nullable(),
})

export const UpdateInquirySchema = z.object({
  status: z.enum(["new", "replied", "archived"]),
})

export default defineMiddlewares({
  routes: [
    {
      method: ["POST"],
      matcher: "/store/feedback",
      middlewares: [
        createRateLimitMiddleware("feedback", 5, 15 * 60 * 1000),
        upload.single("image"),
      ],
    },
    {
      method: ["POST"],
      matcher: "/store/search",
      middlewares: [
        configureStoreSearch({
          allowed_indexes: {
            product: true,
          },
        }),
      ],
    },
    {
      matcher: "/admin/journal",
      method: "POST",
      middlewares: [validateAndTransformBody(PostSchema)],
    },
    {
      matcher: "/admin/journal/:id",
      method: "POST",
      middlewares: [validateAndTransformBody(PostSchema.partial())],
    },
    {
      matcher: "/admin/gallery",
      method: "POST",
      middlewares: [validateAndTransformBody(CreateItems)],
    },
    {
      matcher: "/admin/gallery/layout",
      method: "POST",
      middlewares: [validateAndTransformBody(UpdateLayout)],
    },
    {
      matcher: "/admin/gallery/:id",
      method: "POST",
      middlewares: [validateAndTransformBody(UpdateItem)],
    },
    {
      matcher: "/store/trade-applications",
      method: "POST",
      middlewares: [
        createRateLimitMiddleware("trade", 5, 15 * 60 * 1000),
        validateAndTransformBody(PostTradeApplicationSchema),
      ],
    },
    {
      matcher: "/store/trade-applications",
      method: "GET",
      middlewares: [
        authenticate("customer", ["bearer", "session"]),
      ],
    },
    {
      matcher: "/admin/trade-applications/:id",
      method: "POST",
      middlewares: [validateAndTransformBody(UpdateTradeApplicationSchema)],
    },
    {
      matcher: "/store/inquiries",
      method: "POST",
      middlewares: [
        createRateLimitMiddleware("inquiry", 5, 15 * 60 * 1000),
        validateAndTransformBody(PostInquirySchema),
      ],
    },
    {
      matcher: "/store/newsletter/subscribe",
      method: "POST",
      middlewares: [
        createRateLimitMiddleware("newsletter", 5, 15 * 60 * 1000),
        validateAndTransformBody(SubscribeNewsletterSchema),
      ],
    },
    {
      matcher: "/store/newsletter/unsubscribe",
      method: "POST",
      middlewares: [validateAndTransformBody(UnsubscribeNewsletterSchema)],
    },
    {
      matcher: "/admin/inquiries/:id",
      method: "POST",
      middlewares: [validateAndTransformBody(UpdateInquirySchema)],
    },
    {
      matcher: "/store/commissions/upload-url",
      method: "POST",
      middlewares: [
        createRateLimitMiddleware("commission_upload", 10, 15 * 60 * 1000),
      ],
    },
    {
      matcher: "/store/commissions",
      middlewares: [
        authenticate("customer", ["bearer", "session"], {
          allowUnauthenticated: true,
        }),
      ],
    },
    {
      matcher: "/store/commissions/*",
      middlewares: [
        authenticate("customer", ["bearer", "session"], {
          allowUnauthenticated: true,
        }),
      ],
    },
  ],
})

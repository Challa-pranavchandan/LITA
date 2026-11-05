import { z } from "@medusajs/framework/zod"

export const CommissionIdSchema = z.string().regex(/^com_[A-Za-z0-9_-]{1,100}$/)

const CommissionImageSchema = z.object({
  key: z.string().trim().min(1).max(512),
  filename: z.string().trim().min(1).max(255),
  mime: z.enum(["image/jpeg", "image/png", "image/webp"]),
  size: z.number().int().positive().max(10 * 1024 * 1024),
}).strict()

export const CreateCommissionSchema = z.object({
  title: z.string().trim().min(1).max(200),
  idea: z.string().trim().min(1).max(8000),
  requirements: z.string().trim().max(8000).optional(),
  medium: z.string().trim().max(120).optional(),
  size: z.string().trim().max(120).optional(),
  budget: z.number().int().positive().max(100_000_000).optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`)
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  }).optional(),
  images: z.array(CommissionImageSchema).max(5).optional(),
  charcoal_portrait: z.object({
    size: z.enum(["A4", "A3"]),
    person_count: z.number().int().min(1).max(20),
  }).strict().optional(),
}).strict()

export const CommissionUploadUrlSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  size: z.number().int().positive().max(10 * 1024 * 1024),
}).strict()

export const CommissionMessageSchema = z.object({
  body: z.string().trim().min(1).max(4000),
}).strict()

export const UpdateCommissionSchema = z.object({
  status: z.enum([
    "new",
    "in_discussion",
    "quoted",
    "accepted",
    "awaiting_payment",
    "paid",
    "converted",
    "rejected",
    "cancelled",
  ]).optional(),
  quoted_price: z.number().int().positive().max(100_000_000).optional(),
  currency_code: z.literal("inr").optional(),
  admin_notes: z.string().max(10000).nullable().optional(),
}).strict()

export const CommissionPaySchema = z.object({
  session_id: z.string().trim().min(1).max(255),
  razorpay_payment_id: z.string().trim().min(1).max(255),
  razorpay_order_id: z.string().trim().min(1).max(255),
  razorpay_signature: z.string().trim().min(1).max(512),
}).strict()

export const CommissionListQuerySchema = z.object({
  status: z.enum([
    "all",
    "new",
    "in_discussion",
    "quoted",
    "accepted",
    "awaiting_payment",
    "paid",
    "converted",
    "rejected",
    "cancelled",
  ]).optional(),
  q: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).max(100_000).optional(),
})

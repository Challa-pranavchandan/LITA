import { z } from "@medusajs/framework/zod"

export const CreateBroadcastSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  channels: z.array(z.enum(["email", "popup", "banner"])).default(["email"]),
  status: z.enum(["draft", "scheduled", "active", "completed", "archived"]).default("draft"),
  target_audience: z
    .enum(["all_subscribers", "opted_in_customers", "all_users"])
    .default("all_subscribers"),

  // Email
  email_subject: z.string().trim().max(300).nullable().optional(),
  email_preheader: z.string().trim().max(300).nullable().optional(),
  email_content_html: z.string().trim().max(20000).nullable().optional(),

  // Popup & banner
  popup_title: z.string().trim().max(300).nullable().optional(),
  popup_body: z.string().trim().max(5000).nullable().optional(),
  popup_image_url: z.string().trim().url().nullable().optional().or(z.literal("")),
  popup_coupon_code: z.string().trim().max(50).nullable().optional(),
  popup_cta_text: z.string().trim().max(100).nullable().optional(),
  popup_cta_link: z.string().trim().max(500).nullable().optional(),
  popup_type: z.enum(["modal", "banner", "both"]).default("modal"),
  popup_frequency: z.enum(["once_per_visitor", "once_per_session", "always"]).default("once_per_visitor"),
  is_popup_active: z.boolean().default(false),

  // Scheduling
  starts_at: z.string().nullable().optional(),
  ends_at: z.string().nullable().optional(),
})

export const UpdateBroadcastSchema = CreateBroadcastSchema.partial()

export const SendTestEmailSchema = z.object({
  test_email: z.string().trim().email("Please provide a valid test recipient email"),
})

export const TrackEventSchema = z.object({
  event: z.enum(["impression", "click"]),
})

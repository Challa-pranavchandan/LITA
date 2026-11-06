import { model } from "@medusajs/framework/utils"

export const Broadcast = model.define("broadcast", {
  id: model.id({ prefix: "bcast" }).primaryKey(),
  title: model.text(),
  channels: model.json().nullable(), // Array of 'email' | 'popup' | 'banner'
  status: model.enum(["draft", "scheduled", "active", "completed", "archived"]).default("draft"),
  target_audience: model.enum(["all_subscribers", "opted_in_customers", "all_users"]).default("all_subscribers"),

  // Email parameters
  email_subject: model.text().nullable(),
  email_preheader: model.text().nullable(),
  email_content_html: model.text().nullable(),

  // On-screen popup / banner parameters
  popup_title: model.text().nullable(),
  popup_body: model.text().nullable(),
  popup_image_url: model.text().nullable(),
  popup_coupon_code: model.text().nullable(),
  popup_cta_text: model.text().nullable(),
  popup_cta_link: model.text().nullable(),
  popup_type: model.enum(["modal", "banner", "both"]).default("modal"),
  popup_frequency: model.enum(["once_per_visitor", "once_per_session", "always"]).default("once_per_visitor"),
  is_popup_active: model.boolean().default(false),

  // Date scheduling
  starts_at: model.dateTime().nullable(),
  ends_at: model.dateTime().nullable(),
  sent_at: model.dateTime().nullable(),

  // Delivery & engagement metrics
  recipients_count: model.number().default(0),
  sent_count: model.number().default(0),
  failed_count: model.number().default(0),
  impressions_count: model.number().default(0),
  clicks_count: model.number().default(0),

  metadata: model.json().nullable(),
})

export default Broadcast

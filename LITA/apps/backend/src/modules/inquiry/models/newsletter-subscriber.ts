import { model } from "@medusajs/framework/utils"

export const NewsletterSubscriber = model.define("newsletter_subscriber", {
  id: model.id().primaryKey(),
  email: model.text().unique(),
  status: model.enum(["pending", "confirmed", "unsubscribed"]).default("pending"),
  confirm_token_hash: model.text().nullable(),
  confirmed_at: model.dateTime().nullable(),
  unsubscribed_at: model.dateTime().nullable(),
  source: model.text().nullable(),
})

export default NewsletterSubscriber

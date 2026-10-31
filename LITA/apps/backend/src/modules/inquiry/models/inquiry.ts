import { model } from "@medusajs/framework/utils"

export const Inquiry = model.define("inquiry", {
  id: model.id().primaryKey(),
  kind: model.enum(["contact", "artwork", "commission_general", "trade_general"]),
  name: model.text(),
  email: model.text(),
  phone: model.text().nullable(),
  artwork_handle: model.text().nullable(),
  budget: model.text().nullable(),
  message: model.text(),
  status: model.enum(["new", "replied", "archived"]).default("new"),
  source_url: model.text().nullable(),
  ip_hash: model.text().nullable(),
  user_agent: model.text().nullable(),
  metadata: model.json().nullable(),
})

export default Inquiry

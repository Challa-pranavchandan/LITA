import { model } from "@medusajs/framework/utils"

export const TradeApplication = model.define("trade_application", {
  id: model.id().primaryKey(),
  name: model.text(),
  email: model.text(),
  company: model.text().nullable(),
  role: model.text().nullable(),
  phone: model.text().nullable(),
  website: model.text().nullable(),
  message: model.text().nullable(),
  status: model.enum(["pending", "approved", "rejected"]).default("pending"),
})

export default TradeApplication

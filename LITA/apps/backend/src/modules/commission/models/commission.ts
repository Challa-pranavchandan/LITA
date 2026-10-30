import { model } from "@medusajs/framework/utils"

export const Commission = model.define("commission", {
  id: model.id({ prefix: "com" }).primaryKey(),
  customer_id: model.text().index(),
  title: model.text(),
  idea: model.text(),
  requirements: model.text().nullable(),
  medium: model.text().nullable(),
  size: model.text().nullable(),
  budget: model.number().nullable(),
  deadline: model.dateTime().nullable(),
  status: model
    .enum([
      "new",
      "in_discussion",
      "quoted",
      "accepted",
      "converted",
      "rejected",
      "cancelled",
    ])
    .default("new"),
  quoted_price: model.number().nullable(),
  currency_code: model.text().default("inr"),
  admin_notes: model.text().nullable(),
  order_id: model.text().nullable(),
  images: model.json().nullable(),
})

export default Commission

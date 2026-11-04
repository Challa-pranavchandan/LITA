import { model } from "@medusajs/framework/utils"

export const UpiPayment = model.define("upi_payment", {
  id: model.id({ prefix: "upi" }).primaryKey(),
  reference_code: model.text().unique(),
  order_id: model.text().index().nullable(),
  cart_id: model.text().index().nullable(),
  payment_session_id: model.text().nullable(),
  customer_id: model.text().index().nullable(),
  email: model.text(),
  amount: model.number(),
  currency_code: model.text().default("inr"),
  status: model
    .enum(["awaiting_proof", "submitted", "verified", "rejected", "expired"])
    .default("awaiting_proof"),
  utr: model.text().unique().nullable(),
  payer_vpa: model.text().nullable(),
  screenshot_key: model.text().nullable(),
  submitted_at: model.dateTime().nullable(),
  verified_at: model.dateTime().nullable(),
  rejected_at: model.dateTime().nullable(),
  verified_by: model.text().nullable(),
  reject_reason: model.text().nullable(),
  expires_at: model.dateTime(),
  attempts: model.number().default(0),
})

export default UpiPayment

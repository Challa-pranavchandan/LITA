import { model } from "@medusajs/framework/utils"

export const CommissionMessage = model.define("commission_message", {
  id: model.id({ prefix: "commsg" }).primaryKey(),
  commission_id: model.text().index(),
  sender: model.enum(["client", "admin"]),
  body: model.text(),
})

export default CommissionMessage

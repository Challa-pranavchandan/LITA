import { model } from "@medusajs/framework/utils"

const Feedback = model.define("feedback", {
  id: model.id().primaryKey(),
  type: model.enum(["feedback", "bug"]),
  message: model.text(),
  email: model.text().nullable(),
  page_url: model.text().nullable(),
  image_url: model.text().nullable(),
  status: model.enum(["new", "reviewed", "resolved"]).default("new"),
})

export default Feedback

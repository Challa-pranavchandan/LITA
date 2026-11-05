import { model } from "@medusajs/framework/utils"

const Exhibition = model.define("exhibition", {
  id: model.id({ prefix: "exh" }).primaryKey(),
  title: model.text(),
  description: model.text(),
  details: model.text().nullable(),
  location: model.text().nullable(),
  start_date: model.text(),
  end_date: model.text(),
  image_url: model.text().nullable(),
  image_alt: model.text().nullable(),
  is_published: model.boolean().default(true),
})

export default Exhibition

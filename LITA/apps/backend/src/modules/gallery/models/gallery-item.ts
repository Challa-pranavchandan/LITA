import { model } from "@medusajs/framework/utils"

const GalleryItem = model.define("gallery_item", {
  id: model.id().primaryKey(),
  file_id: model.text().nullable(),
  image_url: model.text(),
  alt: model.text().nullable(),
  caption: model.text().nullable(),
  width: model.number().nullable(),
  height: model.number().nullable(),
  position: model.number().default(0),
  col_span: model.number().default(1), // 1 or 2
  row_span: model.number().default(1), // 1 or 2
  is_published: model.boolean().default(true),
})

export default GalleryItem

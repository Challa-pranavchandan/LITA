import { model } from "@medusajs/framework/utils"

const JournalPost = model.define("journal_post", {
  id: model.id().primaryKey(),
  title: model.text(),
  slug: model.text().unique(),
  excerpt: model.text().nullable(),
  content: model.text(), // markdown
  cover_image_url: model.text().nullable(),
  status: model.enum(["draft", "published"]).default("draft"),
  published_at: model.dateTime().nullable(),
  tags: model.json().nullable(),
})

export default JournalPost

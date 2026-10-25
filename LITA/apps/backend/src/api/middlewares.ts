import { configureStoreSearch, defineMiddlewares, validateAndTransformBody } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"

const PostSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  content: z.string().min(1),
  excerpt: z.string().optional().nullable(),
  cover_image_url: z.string().optional().nullable(),
  status: z.enum(["draft", "published"]).optional(),
  tags: z.array(z.string()).optional().nullable(),
})

const CreateItems = z.object({
  items: z
    .array(
      z.object({
        image_url: z.string().url(),
        file_id: z.string().optional(),
        alt: z.string().optional(),
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
      })
    )
    .min(1),
})

const UpdateLayout = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      position: z.number().int().min(0),
      col_span: z.number().int().min(1).max(2),
      row_span: z.number().int().min(1).max(2),
    })
  ),
})

const UpdateItem = z.object({
  alt: z.string().nullable().optional(),
  caption: z.string().nullable().optional(),
  is_published: z.boolean().optional(),
})

export default defineMiddlewares({
  routes: [
    {
      method: ["POST"],
      matcher: "/store/search",
      middlewares: [
        configureStoreSearch({
          allowed_indexes: {
            product: true,
          },
        }),
      ],
    },
    {
      matcher: "/admin/journal",
      method: "POST",
      middlewares: [validateAndTransformBody(PostSchema)],
    },
    {
      matcher: "/admin/journal/:id",
      method: "POST",
      middlewares: [validateAndTransformBody(PostSchema.partial())],
    },
    {
      matcher: "/admin/gallery",
      method: "POST",
      middlewares: [validateAndTransformBody(CreateItems)],
    },
    {
      matcher: "/admin/gallery/layout",
      method: "POST",
      middlewares: [validateAndTransformBody(UpdateLayout)],
    },
    {
      matcher: "/admin/gallery/:id",
      method: "POST",
      middlewares: [validateAndTransformBody(UpdateItem)],
    },
  ],
})

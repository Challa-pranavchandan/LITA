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
  ],
})

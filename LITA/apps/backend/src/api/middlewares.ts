import { authenticate, configureStoreSearch, defineMiddlewares, validateAndTransformBody } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import multer from "multer"

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
})

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

export const PostTradeApplicationSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120, "Name cannot exceed 120 characters"),
  email: z.string().trim().toLowerCase().pipe(z.string().email("Valid email is required")),
  company: z.string().trim().max(120, "Company cannot exceed 120 characters").optional().nullable(),
  role: z.string().trim().max(100, "Role cannot exceed 100 characters").optional().nullable(),
  phone: z.string().trim().max(10, "Phone cannot exceed 10 characters").optional().nullable(),
  website: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    z.string().trim().max(100, "Website cannot exceed 100 characters").url("Website must be a valid URL").optional().nullable()
  ),
  message: z.string().trim().max(4000, "Message cannot exceed 4000 characters").optional().nullable(),
})

export const UpdateTradeApplicationSchema = z.object({
  status: z.enum(["approved", "rejected", "pending"]),
})

export default defineMiddlewares({
  routes: [
    {
      method: ["POST"],
      matcher: "/store/feedback",
      middlewares: [upload.single("image")],
    },
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
    {
      matcher: "/store/trade-applications",
      method: "POST",
      middlewares: [validateAndTransformBody(PostTradeApplicationSchema)],
    },
    {
      matcher: "/store/trade-applications",
      method: "GET",
      middlewares: [
        authenticate("customer", ["bearer", "session"]),
      ],
    },
    {
      matcher: "/admin/trade-applications/:id",
      method: "POST",
      middlewares: [validateAndTransformBody(UpdateTradeApplicationSchema)],
    },
    {
      matcher: "/store/commissions",
      middlewares: [
        authenticate("customer", ["bearer", "session"], {
          allowUnauthenticated: true,
        }),
      ],
    },
    {
      matcher: "/store/commissions/*",
      middlewares: [
        authenticate("customer", ["bearer", "session"], {
          allowUnauthenticated: true,
        }),
      ],
    },
  ],
})

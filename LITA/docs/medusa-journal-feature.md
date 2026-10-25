# Blog-style Admin Journal in Medusa v2

A guide plus a ready-to-paste prompt for adding a blog-style journal to a Medusa v2 backend (admin-managed posts, public read access from the storefront).

---

## Prompt (paste into your AI coding agent)

```
I have a Medusa v2 backend (with a Next.js storefront). Add a blog-style "Journal" feature where admins write posts and the storefront reads published ones.

Requirements:
1. Create a custom module at src/modules/journal with a JournalPost data model using Medusa's DML:
   - id (primary key), title, slug (unique), excerpt (nullable), content (markdown text),
     cover_image_url (nullable), status enum ["draft","published"] default "draft",
     published_at (nullable dateTime), tags (nullable json).
2. Create JournalModuleService extending MedusaService({ JournalPost }), export a JOURNAL_MODULE = "journal" constant, and register the module in medusa-config.ts.
3. Generate and run the migration (npx medusa db:generate journal, then npx medusa db:migrate).
4. Create workflows in src/workflows/journal-posts.ts for create and update, each with a compensation (rollback) function. Set published_at the first time a post becomes published.
5. Admin API routes (src/api/admin/journal):
   - GET list (paginated, newest first), POST create
   - GET/POST/DELETE at /admin/journal/[id]
   Use the workflows for create and update.
6. Public store API routes (src/api/store/journal):
   - GET list of published posts only (select only listing fields)
   - GET /store/journal/[slug] returning a single published post, 404 otherwise
7. Add src/api/middlewares.ts using zod + validateAndTransformBody for the admin POST routes (update schema is partial).
8. Admin dashboard UI: add a "Journal" sidebar page at src/admin/routes/journal/page.tsx using defineRouteConfig, @medusajs/ui and @tanstack/react-query. Show a table of posts (title, status badge) and add a create/edit form in a FocusModal with fields for title, slug, excerpt, cover image URL, tags, status and a markdown textarea for content. Create src/admin/lib/sdk.ts with the Medusa JS SDK (session auth).
9. Storefront (Next.js): add /journal (listing) and /journal/[slug] (post page) that fetch the store routes with the x-publishable-api-key header and render markdown with react-markdown.

Follow Medusa v2 conventions (imports from @medusajs/framework/*), keep code TypeScript, and explain any step I need to run manually.
```

---

## 1. Module

**`src/modules/journal/models/journal-post.ts`**

```ts
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
```

**`src/modules/journal/service.ts`**

```ts
import { MedusaService } from "@medusajs/framework/utils"
import JournalPost from "./models/journal-post"

class JournalModuleService extends MedusaService({ JournalPost }) {}

export default JournalModuleService
```

**`src/modules/journal/index.ts`**

```ts
import { Module } from "@medusajs/framework/utils"
import JournalModuleService from "./service"

export const JOURNAL_MODULE = "journal"

export default Module(JOURNAL_MODULE, { service: JournalModuleService })
```

Register in **`medusa-config.ts`**:

```ts
modules: [{ resolve: "./src/modules/journal" }]
```

## 2. Migration

```bash
npx medusa db:generate journal
npx medusa db:migrate
```

## 3. Workflows

**`src/workflows/journal-posts.ts`**

```ts
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { JOURNAL_MODULE } from "../modules/journal"
import JournalModuleService from "../modules/journal/service"

type CreateInput = {
  title: string
  slug: string
  content: string
  excerpt?: string
  cover_image_url?: string
  status?: "draft" | "published"
  tags?: string[]
}

const createPostStep = createStep(
  "create-journal-post",
  async (input: CreateInput, { container }) => {
    const service: JournalModuleService = container.resolve(JOURNAL_MODULE)
    const post = await service.createJournalPosts({
      ...input,
      published_at: input.status === "published" ? new Date() : null,
    })
    return new StepResponse(post, post.id)
  },
  async (id, { container }) => {
    if (!id) return
    const service: JournalModuleService = container.resolve(JOURNAL_MODULE)
    await service.deleteJournalPosts(id)
  }
)

export const createJournalPostWorkflow = createWorkflow(
  "create-journal-post",
  (input: CreateInput) => new WorkflowResponse(createPostStep(input))
)

type UpdateInput = { id: string } & Partial<CreateInput>

const updatePostStep = createStep(
  "update-journal-post",
  async (input: UpdateInput, { container }) => {
    const service: JournalModuleService = container.resolve(JOURNAL_MODULE)
    const prev = await service.retrieveJournalPost(input.id)
    const patch: any = { ...input }
    // set published_at the first time a post is published
    if (input.status === "published" && !prev.published_at) {
      patch.published_at = new Date()
    }
    const post = await service.updateJournalPosts(patch)
    return new StepResponse(post, prev)
  },
  async (prev, { container }) => {
    if (!prev) return
    const service: JournalModuleService = container.resolve(JOURNAL_MODULE)
    await service.updateJournalPosts(prev as any)
  }
)

export const updateJournalPostWorkflow = createWorkflow(
  "update-journal-post",
  (input: UpdateInput) => new WorkflowResponse(updatePostStep(input))
)
```

## 4. Admin API routes

Routes under `/admin` are authenticated automatically by Medusa.

**`src/api/admin/journal/route.ts`**

```ts
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { JOURNAL_MODULE } from "../../../modules/journal"
import { createJournalPostWorkflow } from "../../../workflows/journal-posts"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve(JOURNAL_MODULE)
  const [posts, count] = await service.listAndCountJournalPosts(
    {},
    {
      order: { created_at: "DESC" },
      take: 20,
      skip: Number(req.query.offset ?? 0),
    }
  )
  res.json({ posts, count })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { result } = await createJournalPostWorkflow(req.scope).run({
    input: req.validatedBody as any,
  })
  res.status(201).json({ post: result })
}
```

**`src/api/admin/journal/[id]/route.ts`**

```ts
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { JOURNAL_MODULE } from "../../../../modules/journal"
import { updateJournalPostWorkflow } from "../../../../workflows/journal-posts"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve(JOURNAL_MODULE)
  res.json({ post: await service.retrieveJournalPost(req.params.id) })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { result } = await updateJournalPostWorkflow(req.scope).run({
    input: { id: req.params.id, ...(req.validatedBody as any) },
  })
  res.json({ post: result })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve(JOURNAL_MODULE)
  await service.deleteJournalPosts(req.params.id)
  res.json({ id: req.params.id, deleted: true })
}
```

## 5. Public store API routes

**`src/api/store/journal/route.ts`**

```ts
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { JOURNAL_MODULE } from "../../../modules/journal"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve(JOURNAL_MODULE)
  const posts = await service.listJournalPosts(
    { status: "published" },
    {
      order: { published_at: "DESC" },
      select: ["id", "title", "slug", "excerpt", "cover_image_url", "published_at", "tags"],
    }
  )
  res.json({ posts })
}
```

**`src/api/store/journal/[slug]/route.ts`**

```ts
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { JOURNAL_MODULE } from "../../../../modules/journal"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve(JOURNAL_MODULE)
  const [post] = await service.listJournalPosts({
    slug: req.params.slug,
    status: "published",
  })
  if (!post) return res.status(404).json({ message: "Not found" })
  res.json({ post })
}
```

## 6. Validation middleware

**`src/api/middlewares.ts`**

```ts
import { defineMiddlewares, validateAndTransformBody } from "@medusajs/framework/http"
import { z } from "zod"

const PostSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  content: z.string().min(1),
  excerpt: z.string().optional(),
  cover_image_url: z.string().url().optional(),
  status: z.enum(["draft", "published"]).optional(),
  tags: z.array(z.string()).optional(),
})

export default defineMiddlewares({
  routes: [
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
```

## 7. Admin dashboard page

**`src/admin/lib/sdk.ts`**

```ts
import Medusa from "@medusajs/js-sdk"

export const sdk = new Medusa({
  baseUrl: import.meta.env.VITE_BACKEND_URL || "/",
  debug: import.meta.env.DEV,
  auth: { type: "session" },
})
```

**`src/admin/routes/journal/page.tsx`**

```tsx
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { BookOpen } from "@medusajs/icons"
import { Container, Heading, Table, Badge } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { sdk } from "../../lib/sdk"

const JournalPage = () => {
  const { data } = useQuery({
    queryKey: ["journal-posts"],
    queryFn: () => sdk.client.fetch<{ posts: any[] }>("/admin/journal"),
  })

  return (
    <Container>
      <Heading level="h1" className="mb-4">Journal</Heading>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Title</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {data?.posts.map((p) => (
            <Table.Row key={p.id}>
              <Table.Cell>{p.title}</Table.Cell>
              <Table.Cell><Badge>{p.status}</Badge></Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Container>
  )
}

export const config = defineRouteConfig({ label: "Journal", icon: BookOpen })
export default JournalPage
```

Add a create/edit form using `FocusModal` or `Drawer` from `@medusajs/ui` and `useMutation`, calling:

```ts
sdk.client.fetch("/admin/journal", { method: "POST", body })
```

The content field can be a plain textarea holding markdown.

## 8. Storefront (Next.js)

- `GET {MEDUSA_BACKEND_URL}/store/journal` for the listing page (`/journal`).
- `GET {MEDUSA_BACKEND_URL}/store/journal/{slug}` for the post page (`/journal/[slug]`).
- Send the header `x-publishable-api-key: <your key>` on every store request.
- Render `post.content` with `react-markdown`.
- Upload cover images to Cloudinary and save the URL in `cover_image_url`.

## Optional extras

- Add a `meta_title` / `meta_description` field for SEO.
- Link a post to products with a module link (`defineLink`) to show "featured in this post" items.
- Add a subscriber or scheduled job to publish posts at a scheduled time.

## References

- Medusa docs, Modules: https://docs.medusajs.com/learn/fundamentals/modules
- Medusa docs, Build Custom Features: https://docs.medusajs.com/learn/fundamentals/framework

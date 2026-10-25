# Admin-managed Photo Gallery (bento grid) in Medusa v2 with Cloudflare R2

The admin uploads photos in the Medusa dashboard, sees a live preview of the gallery grid, drags tiles to reorder them, resizes tiles (1x1, 2x1, 1x2, 2x2), and the storefront renders exactly the same layout.

Stack: Medusa v2, Cloudflare R2 (S3-compatible), Next.js storefront, `@dnd-kit` for drag and drop.

---

## Prompt (paste into your AI coding agent)

```
I have a Medusa v2 backend and a Next.js storefront. Files are stored in Cloudflare R2. Add a "Gallery" feature:

GOAL
Admins upload photos in the Medusa admin dashboard, see a live preview of the gallery as a bento-style grid (3 columns, tiles can span 1 or 2 columns and 1 or 2 rows, rounded corners, like a modern photo gallery page), reorder tiles by drag and drop, resize tiles, edit alt text, hide or delete tiles, and click Save. The storefront /gallery page renders the same layout.

BACKEND
1. File storage: configure Medusa's built-in S3 file provider (@medusajs/medusa/file-s3) for Cloudflare R2: region "auto", endpoint https://<ACCOUNT_ID>.r2.cloudflarestorage.com, file_url = my R2 public/custom domain, credentials from env vars. If uploads fail with a checksum error, apply the additional_client_config fix from the Medusa S3 provider docs.
2. Create a custom module src/modules/gallery with a GalleryItem data model (DML): id, file_id (nullable), image_url, alt (nullable), caption (nullable), width (nullable number), height (nullable number), position (number, default 0), col_span (number, default 1), row_span (number, default 1), is_published (boolean, default true). Add the service (MedusaService), export GALLERY_MODULE = "gallery", register it in medusa-config.ts, then generate and run the migration.
3. Workflows (with compensation/rollback): create gallery items (batch, appended at the end), update layout (batch update of position/col_span/row_span), delete item (also delete the file from R2 via the File module, wrapped in try/catch).
4. Admin API routes under src/api/admin/gallery: GET list (ordered by position), POST create (batch), POST /layout (batch layout update), POST /[id] (update alt/caption/is_published), DELETE /[id]. Validate bodies with zod via validateAndTransformBody in src/api/middlewares.ts. After a layout save, call the storefront revalidation endpoint (fire and forget).
5. Store API route: GET /store/gallery returns published items ordered by position.

ADMIN UI
6. Add src/admin/routes/gallery/page.tsx using defineRouteConfig (label "Gallery", icon from @medusajs/icons), @medusajs/ui, @tanstack/react-query and @dnd-kit/core + @dnd-kit/sortable (rectSortingStrategy). Features: multi-file upload via sdk.admin.upload.create then POST /admin/gallery (read image width/height in the browser first); a preview grid that uses the exact same CSS as the storefront (3 columns, auto rows, grid-auto-flow: dense); drag handle on tiles; hover toolbar with size buttons (1x1, 2x1, 1x2, 2x2), a hide/show toggle, alt-text edit and delete; a "Save layout" button enabled only when there are unsaved changes; toasts for success/failure. Create src/admin/lib/sdk.ts with the Medusa JS SDK (session auth).

STOREFRONT
7. Add /gallery in the Next.js app: server component fetching /store/gallery with the x-publishable-api-key header and fetch tag "gallery"; a shared GalleryGrid component with the same grid CSS; responsive (3 columns desktop, 2 tablet, 1 mobile where spans collapse to 1); next/image with the R2 domain in images.remotePatterns; optional lightbox on click.
8. Add an API route app/api/revalidate/route.ts that checks a secret and calls revalidateTag("gallery").

Use Medusa v2 conventions (imports from @medusajs/framework/*), TypeScript everywhere, and list any env vars and manual steps I need to do at the end.
```

---

## 0. Install dependencies

In the Medusa project:

```bash
npm i @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

## 1. Cloudflare R2 as the file provider

R2 is S3-compatible, so use Medusa's built-in S3 file provider.

**`medusa-config.ts`**

```ts
import { defineConfig } from "@medusajs/framework/utils"

module.exports = defineConfig({
  // ...
  modules: [
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/file-s3",
            id: "s3",
            options: {
              file_url: process.env.R2_PUBLIC_URL, // custom domain (prod) or r2.dev URL (dev)
              access_key_id: process.env.R2_ACCESS_KEY_ID,
              secret_access_key: process.env.R2_SECRET_ACCESS_KEY,
              region: "auto",
              bucket: process.env.R2_BUCKET,
              endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
              prefix: "gallery/",
              // If uploads fail with a checksum error, see the Cloudflare
              // checksum note in the Medusa S3 provider docs and add the
              // suggested additional_client_config here.
            },
          },
        ],
      },
    },
    { resolve: "./src/modules/gallery" },
  ],
})
```

**`.env`**

```
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_URL=https://media.yourdomain.com
STOREFRONT_URL=http://localhost:8000
REVALIDATE_SECRET=change-me
```

Cloudflare side:
- Enable public access on the bucket. Use a custom domain for production (the `r2.dev` URL is rate-limited and meant for development). A custom domain also gets Cloudflare edge caching.
- Create an R2 API token with read and write access to the bucket.

## 2. Gallery module

**`src/modules/gallery/models/gallery-item.ts`**

```ts
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
```

**`src/modules/gallery/service.ts`**

```ts
import { MedusaService } from "@medusajs/framework/utils"
import GalleryItem from "./models/gallery-item"

class GalleryModuleService extends MedusaService({ GalleryItem }) {}

export default GalleryModuleService
```

**`src/modules/gallery/index.ts`**

```ts
import { Module } from "@medusajs/framework/utils"
import GalleryModuleService from "./service"

export const GALLERY_MODULE = "gallery"

export default Module(GALLERY_MODULE, { service: GalleryModuleService })
```

Migration:

```bash
npx medusa db:generate gallery
npx medusa db:migrate
```

## 3. Workflows

**`src/workflows/gallery.ts`**

```ts
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { GALLERY_MODULE } from "../modules/gallery"
import GalleryModuleService from "../modules/gallery/service"

/* ---------- create (batch, appended at the end) ---------- */

type NewItem = {
  image_url: string
  file_id?: string
  alt?: string
  width?: number
  height?: number
}

const createItemsStep = createStep(
  "create-gallery-items",
  async (input: { items: NewItem[] }, { container }) => {
    const service: GalleryModuleService = container.resolve(GALLERY_MODULE)
    const existing = await service.listGalleryItems({}, { select: ["position"] })
    const start = existing.length
      ? Math.max(...existing.map((i) => i.position)) + 1
      : 0

    const created = await service.createGalleryItems(
      input.items.map((item, idx) => ({ ...item, position: start + idx }))
    )
    return new StepResponse(created, created.map((c) => c.id))
  },
  async (ids, { container }) => {
    if (!ids?.length) return
    const service: GalleryModuleService = container.resolve(GALLERY_MODULE)
    await service.deleteGalleryItems(ids)
  }
)

export const createGalleryItemsWorkflow = createWorkflow(
  "create-gallery-items",
  (input: { items: NewItem[] }) => new WorkflowResponse(createItemsStep(input))
)

/* ---------- update layout (batch) ---------- */

type LayoutItem = {
  id: string
  position: number
  col_span: number
  row_span: number
}

const updateLayoutStep = createStep(
  "update-gallery-layout",
  async (input: { items: LayoutItem[] }, { container }) => {
    const service: GalleryModuleService = container.resolve(GALLERY_MODULE)
    const ids = input.items.map((i) => i.id)
    const previous = await service.listGalleryItems(
      { id: ids },
      { select: ["id", "position", "col_span", "row_span"] }
    )
    const updated = await service.updateGalleryItems(input.items)
    return new StepResponse(updated, previous)
  },
  async (previous, { container }) => {
    if (!previous?.length) return
    const service: GalleryModuleService = container.resolve(GALLERY_MODULE)
    await service.updateGalleryItems(
      previous.map((p) => ({
        id: p.id,
        position: p.position,
        col_span: p.col_span,
        row_span: p.row_span,
      }))
    )
  }
)

export const updateGalleryLayoutWorkflow = createWorkflow(
  "update-gallery-layout",
  (input: { items: LayoutItem[] }) =>
    new WorkflowResponse(updateLayoutStep(input))
)

/* ---------- delete (record + file in R2) ---------- */

const deleteItemStep = createStep(
  "delete-gallery-item",
  async (input: { id: string }, { container }) => {
    const service: GalleryModuleService = container.resolve(GALLERY_MODULE)
    const item = await service.retrieveGalleryItem(input.id)
    await service.deleteGalleryItems(input.id)

    if (item.file_id) {
      try {
        const fileModule = container.resolve(Modules.FILE)
        await fileModule.deleteFiles(item.file_id)
      } catch (e) {
        // do not fail the workflow if the file is already gone
      }
    }
    return new StepResponse({ id: input.id }, item)
  },
  async (item, { container }) => {
    if (!item) return
    const service: GalleryModuleService = container.resolve(GALLERY_MODULE)
    await service.createGalleryItems({
      id: item.id,
      file_id: item.file_id,
      image_url: item.image_url,
      alt: item.alt,
      caption: item.caption,
      width: item.width,
      height: item.height,
      position: item.position,
      col_span: item.col_span,
      row_span: item.row_span,
      is_published: item.is_published,
    })
  }
)

export const deleteGalleryItemWorkflow = createWorkflow(
  "delete-gallery-item",
  (input: { id: string }) => new WorkflowResponse(deleteItemStep(input))
)
```

## 4. API routes

### Admin

**`src/api/admin/gallery/route.ts`**

```ts
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { GALLERY_MODULE } from "../../../modules/gallery"
import { createGalleryItemsWorkflow } from "../../../workflows/gallery"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve(GALLERY_MODULE)
  const items = await service.listGalleryItems({}, { order: { position: "ASC" } })
  res.json({ items })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { result } = await createGalleryItemsWorkflow(req.scope).run({
    input: req.validatedBody as any,
  })
  res.status(201).json({ items: result })
}
```

**`src/api/admin/gallery/layout/route.ts`**

```ts
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { updateGalleryLayoutWorkflow } from "../../../../workflows/gallery"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { result } = await updateGalleryLayoutWorkflow(req.scope).run({
    input: req.validatedBody as any,
  })

  // Tell the storefront to refresh its cache (fire and forget)
  if (process.env.STOREFRONT_URL && process.env.REVALIDATE_SECRET) {
    fetch(`${process.env.STOREFRONT_URL}/api/revalidate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ secret: process.env.REVALIDATE_SECRET, tag: "gallery" }),
    }).catch(() => {})
  }

  res.json({ items: result })
}
```

**`src/api/admin/gallery/[id]/route.ts`**

```ts
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { GALLERY_MODULE } from "../../../../modules/gallery"
import { deleteGalleryItemWorkflow } from "../../../../workflows/gallery"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve(GALLERY_MODULE)
  const item = await service.updateGalleryItems({
    id: req.params.id,
    ...(req.validatedBody as any),
  })
  res.json({ item })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  await deleteGalleryItemWorkflow(req.scope).run({ input: { id: req.params.id } })
  res.json({ id: req.params.id, deleted: true })
}
```

### Store

**`src/api/store/gallery/route.ts`**

```ts
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { GALLERY_MODULE } from "../../../modules/gallery"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve(GALLERY_MODULE)
  const items = await service.listGalleryItems(
    { is_published: true },
    {
      order: { position: "ASC" },
      select: ["id", "image_url", "alt", "caption", "width", "height", "position", "col_span", "row_span"],
    }
  )
  res.json({ items })
}
```

### Validation

**`src/api/middlewares.ts`** (merge with existing routes if you already have this file)

```ts
import { defineMiddlewares, validateAndTransformBody } from "@medusajs/framework/http"
import { z } from "zod"

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
    { matcher: "/admin/gallery", method: "POST", middlewares: [validateAndTransformBody(CreateItems)] },
    { matcher: "/admin/gallery/layout", method: "POST", middlewares: [validateAndTransformBody(UpdateLayout)] },
    { matcher: "/admin/gallery/:id", method: "POST", middlewares: [validateAndTransformBody(UpdateItem)] },
  ],
})
```

Note: `/admin/gallery/layout` is a static path, so it takes priority over `/admin/gallery/[id]`. If you ever see it being handled as an id, rename it to `/admin/gallery-layout`.

## 5. Admin page (upload, preview, drag and drop, resize)

**`src/admin/lib/sdk.ts`**

```ts
import Medusa from "@medusajs/js-sdk"

export const sdk = new Medusa({
  baseUrl: import.meta.env.VITE_BACKEND_URL || "/",
  debug: import.meta.env.DEV,
  auth: { type: "session" },
})
```

**`src/admin/routes/gallery/page.tsx`**

```tsx
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { PhotoSolid, Trash, EyeSlash, Eye, ArrowsPointingOut } from "@medusajs/icons"
import { Button, Container, Heading, IconButton, Input, Text, toast, Toaster } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext, rectSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { sdk } from "../../lib/sdk"

type Item = {
  id: string
  image_url: string
  alt: string | null
  width: number | null
  height: number | null
  position: number
  col_span: number
  row_span: number
  is_published: boolean
}

const SIZES: { label: string; c: number; r: number }[] = [
  { label: "1x1", c: 1, r: 1 },
  { label: "2x1", c: 2, r: 1 },
  { label: "1x2", c: 1, r: 2 },
  { label: "2x2", c: 2, r: 2 },
]

// IMPORTANT: keep these grid styles identical to the storefront
const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gridAutoRows: "220px",
  gridAutoFlow: "dense",
  gap: 12,
}

const readSize = (file: File) =>
  new Promise<{ width: number; height: number }>((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => resolve({ width: 0, height: 0 })
    img.src = URL.createObjectURL(file)
  })

function Tile({
  item, onSize, onToggle, onDelete, onAlt,
}: {
  item: Item
  onSize: (c: number, r: number) => void
  onToggle: () => void
  onDelete: () => void
  onAlt: (alt: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        gridColumn: `span ${item.col_span}`,
        gridRow: `span ${item.row_span}`,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : item.is_published ? 1 : 0.4,
        borderRadius: 16,
        overflow: "hidden",
        position: "relative",
        background: "#eee",
        zIndex: isDragging ? 10 : 0,
      }}
      className="group"
    >
      <img
        src={item.image_url}
        alt={item.alt ?? ""}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        {...attributes}
        {...listeners}
      />
      {/* hover toolbar */}
      <div
        style={{
          position: "absolute", inset: "auto 8px 8px 8px", display: "flex",
          gap: 6, flexWrap: "wrap", alignItems: "center",
          background: "rgba(255,255,255,0.92)", borderRadius: 12, padding: 6,
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {SIZES.map((s) => (
          <Button
            key={s.label}
            size="small"
            variant={item.col_span === s.c && item.row_span === s.r ? "primary" : "secondary"}
            onClick={() => onSize(s.c, s.r)}
          >
            {s.label}
          </Button>
        ))}
        <IconButton size="small" variant="transparent" onClick={onToggle}>
          {item.is_published ? <Eye /> : <EyeSlash />}
        </IconButton>
        <IconButton size="small" variant="transparent" onClick={onDelete}>
          <Trash />
        </IconButton>
        <Input
          size="small"
          placeholder="Alt text"
          defaultValue={item.alt ?? ""}
          onBlur={(e) => onAlt(e.target.value)}
          style={{ flex: 1, minWidth: 100 }}
        />
      </div>
    </div>
  )
}

const GalleryPage = () => {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<Item[]>([])
  const [dirty, setDirty] = useState(false)
  const [uploading, setUploading] = useState(false)

  const { data } = useQuery({
    queryKey: ["gallery"],
    queryFn: () => sdk.client.fetch<{ items: Item[] }>("/admin/gallery"),
  })

  useEffect(() => {
    if (data) { setItems(data.items); setDirty(false) }
  }, [data])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    setItems((prev) => {
      const from = prev.findIndex((i) => i.id === active.id)
      const to = prev.findIndex((i) => i.id === over.id)
      return arrayMove(prev, from, to)
    })
    setDirty(true)
  }

  const patch = (id: string, p: Partial<Item>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...p } : i)))
    setDirty(true)
  }

  const saveLayout = useMutation({
    mutationFn: () =>
      sdk.client.fetch("/admin/gallery/layout", {
        method: "POST",
        body: {
          items: items.map((i, idx) => ({
            id: i.id, position: idx, col_span: i.col_span, row_span: i.row_span,
          })),
        },
      }),
    onSuccess: async () => {
      // publish/unpublish and alt changes are saved per item below
      await Promise.all(
        items.map((i) =>
          sdk.client.fetch(`/admin/gallery/${i.id}`, {
            method: "POST",
            body: { is_published: i.is_published, alt: i.alt },
          })
        )
      )
      toast.success("Gallery saved")
      setDirty(false)
      qc.invalidateQueries({ queryKey: ["gallery"] })
    },
    onError: () => toast.error("Could not save gallery"),
  })

  const remove = useMutation({
    mutationFn: (id: string) => sdk.client.fetch(`/admin/gallery/${id}`, { method: "DELETE" }),
    onSuccess: (_, id) => {
      setItems((prev) => prev.filter((i) => i.id !== id))
      toast.success("Photo deleted")
    },
  })

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    try {
      const list = Array.from(files)
      const sizes = await Promise.all(list.map(readSize))
      const { files: uploaded } = await sdk.admin.upload.create({ files: list })
      await sdk.client.fetch("/admin/gallery", {
        method: "POST",
        body: {
          items: uploaded.map((f: any, idx: number) => ({
            image_url: f.url,
            file_id: f.id,
            width: sizes[idx].width || undefined,
            height: sizes[idx].height || undefined,
          })),
        },
      })
      toast.success(`${uploaded.length} photo(s) uploaded`)
      qc.invalidateQueries({ queryKey: ["gallery"] })
    } catch {
      toast.error("Upload failed")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  return (
    <Container>
      <Toaster />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <Heading level="h1">Gallery</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Drag to reorder, pick a size on each tile, then save. This preview matches the storefront.
          </Text>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            ref={fileRef} type="file" accept="image/*" multiple hidden
            onChange={(e) => onFiles(e.target.files)}
          />
          <Button variant="secondary" isLoading={uploading} onClick={() => fileRef.current?.click()}>
            Upload photos
          </Button>
          <Button disabled={!dirty} isLoading={saveLayout.isPending} onClick={() => saveLayout.mutate()}>
            Save layout
          </Button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
          <div style={gridStyle}>
            {items.map((item) => (
              <Tile
                key={item.id}
                item={item}
                onSize={(c, r) => patch(item.id, { col_span: c, row_span: r })}
                onToggle={() => patch(item.id, { is_published: !item.is_published })}
                onDelete={() => remove.mutate(item.id)}
                onAlt={(alt) => patch(item.id, { alt })}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </Container>
  )
}

export const config = defineRouteConfig({ label: "Gallery", icon: PhotoSolid })
export default GalleryPage
```

Notes:
- If an icon name above does not exist in your `@medusajs/icons` version, swap it for any available one (the unused `ArrowsPointingOut` import can be removed).
- Items hidden with the eye toggle are shown faded in the admin preview and excluded from the storefront.
- The drag handle is the image itself; the toolbar stops pointer events so buttons and the alt input still work.

## 6. Storefront (Next.js)

**`next.config.js`**: allow the R2 domain

```js
module.exports = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "media.yourdomain.com" }],
  },
}
```

**`app/gallery/gallery.css`** (same grid as the admin, responsive)

```css
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: 260px;
  grid-auto-flow: dense;
  gap: 12px;
}
.gallery-tile {
  grid-column: span var(--cs, 1);
  grid-row: span var(--rs, 1);
  border-radius: 16px;
  overflow: hidden;
  position: relative;
}
.gallery-tile img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@media (max-width: 900px) {
  .gallery-grid { grid-template-columns: repeat(2, 1fr); grid-auto-rows: 200px; }
  .gallery-tile { grid-column: span min(var(--cs, 1), 2); }
}
@media (max-width: 560px) {
  .gallery-grid { grid-template-columns: 1fr; grid-auto-rows: 260px; }
  .gallery-tile { grid-column: span 1; grid-row: span 1; }
}
```

**`app/gallery/page.tsx`**

```tsx
import Image from "next/image"
import "./gallery.css"

type Item = {
  id: string; image_url: string; alt: string | null
  col_span: number; row_span: number
}

async function getGallery(): Promise<Item[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/gallery`, {
    headers: { "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY! },
    next: { tags: ["gallery"], revalidate: 300 },
  })
  if (!res.ok) return []
  return (await res.json()).items
}

export default async function GalleryPage() {
  const items = await getGallery()

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px" }}>
      <span style={{ background: "#f1f1f1", borderRadius: 999, padding: "6px 14px", fontSize: 13 }}>
        Our Stories
      </span>
      <h1 style={{ fontSize: 64, margin: "24px 0 8px", letterSpacing: -2 }}>Photo Gallery</h1>
      <p style={{ opacity: 0.7, marginBottom: 32 }}>Captured moments from our trips and scenic routes.</p>

      <div className="gallery-grid">
        {items.map((item) => (
          <div
            key={item.id}
            className="gallery-tile"
            style={{ ["--cs" as any]: item.col_span, ["--rs" as any]: item.row_span }}
          >
            <Image
              src={item.image_url}
              alt={item.alt ?? ""}
              fill
              sizes="(max-width: 560px) 100vw, (max-width: 900px) 50vw, 33vw"
              style={{ objectFit: "cover" }}
            />
          </div>
        ))}
      </div>
    </main>
  )
}
```

**`app/api/revalidate/route.ts`** (called by Medusa after a layout save)

```ts
import { revalidateTag } from "next/cache"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { secret, tag } = await req.json()
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  revalidateTag(tag || "gallery")
  return NextResponse.json({ ok: true })
}
```

Set `REVALIDATE_SECRET` to the same value in both the Medusa and Next.js environments. If you skip the webhook, the page still refreshes within the `revalidate` time (300 seconds above).

## 7. How to test

1. Run `npx medusa db:migrate`, start Medusa, open **Gallery** in the admin sidebar.
2. Upload a few photos, check they appear and the URLs point at your R2 domain.
3. Drag tiles, change sizes, click **Save layout**.
4. Open `/gallery` on the storefront and compare with the admin preview.

## Design notes

- The editor snaps tiles to the grid (1 or 2 columns and rows). That keeps the layout clean on every screen, while still giving a bento look.
- `grid-auto-flow: dense` fills gaps left by large tiles, so reordering never leaves holes.
- Storing `width` and `height` lets you add blur placeholders or aspect-aware features later.

## Optional extras

- Categories or albums with filter tabs on the storefront.
- A lightbox with next and previous navigation.
- Captions shown on hover.
- A mobile preview toggle in the admin (render the grid at 390px width with 1 column).

## References

- Medusa S3 File Module Provider (works with Cloudflare R2): https://docs.medusajs.com/resources/infrastructure-modules/file/s3
- Medusa docs, Modules: https://docs.medusajs.com/learn/fundamentals/modules

# Feedback & Bug Report Feature (Medusa v2 + Supabase + R2 + Next.js)

Footer button → modal form → Medusa store API → Supabase Postgres (+ screenshot in R2) → Medusa admin page where **feedback = green** and **bugs = red**.

---

## 1. Medusa: feedback module

**`src/modules/feedback/models/feedback.ts`**
```ts
import { model } from "@medusajs/framework/utils"

const Feedback = model.define("feedback", {
  id: model.id().primaryKey(),
  type: model.enum(["feedback", "bug"]),          // feedback = green, bug = red
  message: model.text(),
  email: model.text().nullable(),
  page_url: model.text().nullable(),
  image_url: model.text().nullable(),             // optional screenshot (R2)
  status: model.enum(["new", "reviewed", "resolved"]).default("new"),
})

export default Feedback
```

**`src/modules/feedback/service.ts`**
```ts
import { MedusaService } from "@medusajs/framework/utils"
import Feedback from "./models/feedback"

class FeedbackModuleService extends MedusaService({ Feedback }) {}
export default FeedbackModuleService
```

**`src/modules/feedback/index.ts`**
```ts
import { Module } from "@medusajs/framework/utils"
import FeedbackModuleService from "./service"

export const FEEDBACK_MODULE = "feedback"
export default Module(FEEDBACK_MODULE, { service: FeedbackModuleService })
```

**`medusa-config.ts`** – register the module:
```ts
modules: [
  { resolve: "./src/modules/feedback" },
  // ...your other modules
]
```

Create the table:
```bash
npx medusa db:generate feedback
npx medusa db:migrate
```

---

## 2. Medusa: R2 file provider (skip if already configured)

```ts
{
  resolve: "@medusajs/medusa/file",
  options: {
    providers: [{
      resolve: "@medusajs/medusa/file-s3",
      id: "r2",
      options: {
        file_url: process.env.R2_PUBLIC_URL,
        access_key_id: process.env.R2_ACCESS_KEY_ID,
        secret_access_key: process.env.R2_SECRET_ACCESS_KEY,
        region: "auto",
        bucket: process.env.R2_BUCKET,
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        additional_client_config: { forcePathStyle: true },
      },
    }],
  },
},
```

---

## 3. Medusa: API routes

Install multer: `npm i multer @types/multer`

**`src/api/middlewares.ts`**
```ts
import { defineMiddlewares } from "@medusajs/framework/http"
import multer from "multer"

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
})

export default defineMiddlewares({
  routes: [
    {
      method: ["POST"],
      matcher: "/store/feedback",
      middlewares: [upload.single("image")],
    },
  ],
})
```

**`src/api/store/feedback/route.ts`** (public submit)
```ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { FEEDBACK_MODULE } from "../../../modules/feedback"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = req.body as Record<string, string>
  const file = (req as any).file as Express.Multer.File | undefined

  if (!["feedback", "bug"].includes(body.type) || !body.message?.trim()) {
    return res.status(400).json({ message: "Invalid type or empty message" })
  }
  if (body.website) return res.status(200).json({ ok: true }) // honeypot for bots

  let image_url: string | undefined
  if (file) {
    if (!file.mimetype.startsWith("image/")) {
      return res.status(400).json({ message: "Only images allowed" })
    }
    const fileService = req.scope.resolve(Modules.FILE)
    const uploaded = await fileService.createFiles({
      filename: file.originalname,
      mimeType: file.mimetype,
      content: file.buffer.toString("binary"),
      access: "public",
    })
    image_url = uploaded.url
  }

  const service = req.scope.resolve(FEEDBACK_MODULE)
  const feedback = await service.createFeedbacks({
    type: body.type as "feedback" | "bug",
    message: body.message.trim().slice(0, 3000),
    email: body.email?.trim() || null,
    page_url: body.page_url || null,
    image_url: image_url ?? null,
  })

  res.status(201).json({ feedback })
}
```

**`src/api/admin/feedback/route.ts`** (admin list)
```ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { FEEDBACK_MODULE } from "../../../modules/feedback"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve(FEEDBACK_MODULE)
  const { type } = req.query as { type?: string }
  const feedbacks = await service.listFeedbacks(
    type ? { type } : {},
    { order: { created_at: "DESC" }, take: 200 }
  )
  res.json({ feedbacks })
}
```

**`src/api/admin/feedback/[id]/route.ts`** (change status)
```ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { FEEDBACK_MODULE } from "../../../../modules/feedback"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve(FEEDBACK_MODULE)
  const { status } = req.body as { status: "new" | "reviewed" | "resolved" }
  const feedback = await service.updateFeedbacks({ id: req.params.id, status })
  res.json({ feedback })
}
```

---

## 4. Medusa admin page (green / red)

**`src/admin/lib/sdk.ts`** (skip if you already have one)
```ts
import Medusa from "@medusajs/js-sdk"

export const sdk = new Medusa({
  baseUrl: import.meta.env.VITE_BACKEND_URL || "/",
  auth: { type: "session" },
})
```

**`src/admin/routes/feedback/page.tsx`**
```tsx
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ChatBubbleLeftRight } from "@medusajs/icons"
import { Badge, Container, Heading, Select, Table, Tabs } from "@medusajs/ui"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { sdk } from "../../lib/sdk"

type Item = {
  id: string
  type: "feedback" | "bug"
  message: string
  email: string | null
  page_url: string | null
  image_url: string | null
  status: "new" | "reviewed" | "resolved"
  created_at: string
}

const FeedbackPage = () => {
  const [filter, setFilter] = useState<"all" | "feedback" | "bug">("all")
  const qc = useQueryClient()

  const { data } = useQuery({
    queryKey: ["feedbacks", filter],
    queryFn: () =>
      sdk.client.fetch<{ feedbacks: Item[] }>("/admin/feedback", {
        query: filter === "all" ? {} : { type: filter },
      }),
  })

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      sdk.client.fetch(`/admin/feedback/${id}`, { method: "POST", body: { status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feedbacks"] }),
  })

  return (
    <Container className="p-0">
      <div className="px-6 py-4">
        <Heading>Feedback & Bug Reports</Heading>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <Tabs.List className="px-6">
          <Tabs.Trigger value="all">All</Tabs.Trigger>
          <Tabs.Trigger value="feedback">Feedback</Tabs.Trigger>
          <Tabs.Trigger value="bug">Bugs</Tabs.Trigger>
        </Tabs.List>
      </Tabs>

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Type</Table.HeaderCell>
            <Table.HeaderCell>Message</Table.HeaderCell>
            <Table.HeaderCell>From</Table.HeaderCell>
            <Table.HeaderCell>Page</Table.HeaderCell>
            <Table.HeaderCell>Screenshot</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {data?.feedbacks.map((f) => (
            <Table.Row
              key={f.id}
              style={{ borderLeft: `4px solid ${f.type === "bug" ? "#ef4444" : "#22c55e"}` }}
            >
              <Table.Cell>
                <Badge color={f.type === "bug" ? "red" : "green"}>
                  {f.type === "bug" ? "Bug" : "Feedback"}
                </Badge>
              </Table.Cell>
              <Table.Cell className="max-w-md whitespace-pre-wrap">{f.message}</Table.Cell>
              <Table.Cell>{f.email ?? "Anonymous"}</Table.Cell>
              <Table.Cell className="max-w-[160px] truncate">{f.page_url ?? "-"}</Table.Cell>
              <Table.Cell>
                {f.image_url ? (
                  <a href={f.image_url} target="_blank" rel="noreferrer">
                    <img src={f.image_url} className="h-10 w-10 rounded object-cover" />
                  </a>
                ) : (
                  "-"
                )}
              </Table.Cell>
              <Table.Cell>
                <Select
                  value={f.status}
                  onValueChange={(status) => setStatus.mutate({ id: f.id, status })}
                >
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="new">New</Select.Item>
                    <Select.Item value="reviewed">Reviewed</Select.Item>
                    <Select.Item value="resolved">Resolved</Select.Item>
                  </Select.Content>
                </Select>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Feedback",
  icon: ChatBubbleLeftRight,
})

export default FeedbackPage
```

---

## 5. Next.js storefront: footer button + modal

**`components/feedback-widget.tsx`**
```tsx
"use client"
import { useState } from "react"

const BACKEND = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL!
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY!

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<"feedback" | "bug">("feedback")
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle")

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setStatus("sending")
    const fd = new FormData(form)
    fd.set("type", type)
    fd.set("page_url", window.location.href)
    try {
      const res = await fetch(`${BACKEND}/store/feedback`, {
        method: "POST",
        headers: { "x-publishable-api-key": PK },
        body: fd,
      })
      if (!res.ok) throw new Error()
      setStatus("done")
      form.reset()
    } catch {
      setStatus("error")
    }
  }

  return (
    <>
      <button
        onClick={() => {
          setOpen(true)
          setStatus("idle")
        }}
        className="text-sm underline hover:opacity-70"
      >
        Feedback / Report a bug
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-6 text-black"
            onClick={(e) => e.stopPropagation()}
          >
            {status === "done" ? (
              <div className="text-center">
                <p className="mb-4">Thank you! Your message has been sent.</p>
                <button
                  className="rounded bg-black px-4 py-2 text-white"
                  onClick={() => setOpen(false)}
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setType("feedback")}
                    className={`flex-1 rounded border px-3 py-2 ${
                      type === "feedback" ? "border-green-500 bg-green-50 text-green-700" : ""
                    }`}
                  >
                    Feedback / Advice
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("bug")}
                    className={`flex-1 rounded border px-3 py-2 ${
                      type === "bug" ? "border-red-500 bg-red-50 text-red-700" : ""
                    }`}
                  >
                    Report a bug
                  </button>
                </div>

                <textarea
                  name="message"
                  required
                  rows={5}
                  maxLength={3000}
                  placeholder={
                    type === "bug"
                      ? "What went wrong? What did you click?"
                      : "Tell us what you think..."
                  }
                  className="w-full rounded border p-2"
                />
                <input
                  name="email"
                  type="email"
                  placeholder="Email (optional)"
                  className="w-full rounded border p-2"
                />
                <input name="image" type="file" accept="image/*" className="w-full text-sm" />

                {/* honeypot */}
                <input name="website" tabIndex={-1} autoComplete="off" className="hidden" />

                {status === "error" && (
                  <p className="text-sm text-red-600">Something went wrong. Please try again.</p>
                )}

                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setOpen(false)} className="px-4 py-2">
                    Cancel
                  </button>
                  <button
                    disabled={status === "sending"}
                    className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
                  >
                    {status === "sending" ? "Sending..." : "Submit"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
```

Add `<FeedbackWidget />` inside your footer component.

---

## 6. Checklist

- [x] Storefront URL is in `STORE_CORS` in the Medusa `.env`
- [x] `NEXT_PUBLIC_MEDUSA_BACKEND_URL` and `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` set in the storefront
- [x] R2 bucket has a public domain (`R2_PUBLIC_URL` / `R2_FILE_URL`) so screenshots show in admin
- [x] Ran `npx medusa db:generate feedback` and `npx medusa db:migrate` (table created in Supabase)
- [x] Honeypot spam bot protection implemented on `/store/feedback`
- [x] Verified end-to-end feedback submission, bug submission, and admin status updates

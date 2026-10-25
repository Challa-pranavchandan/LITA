# Trade Program: Form Submissions in the Medusa Admin Panel

**Goal:** When someone submits the "Join Trade Program" form on the storefront, the submission is saved in the database and shown in a **Trade Applications** page in the Medusa admin, where it can be approved or rejected.

**Stack assumed:** Next.js storefront + Medusa v2 backend (admin built in).

**Flow:**

```
Storefront form  ->  POST /store/trade-applications  ->  Trade module (DB)
                                                              |
Admin sidebar "Trade Applications"  <-  GET /admin/trade-applications
```

The storefront form already exists, so you do not rebuild the UI. You only change its submit handler (Part C).

---

## Part A: Prompts (paste into Claude Code / Cursor in your repo)

### Prompt 1: Inspect the existing form (run first)

```
Search this repo for the "Join Trade Program" button and the form/modal that opens
when it is clicked (search strings: "Join Trade Program", "trade", "Trade Program").
Do NOT change anything yet. Report:
1. The file path of the page and the form component.
2. Every form field (name, type, required or not).
3. What currently happens on submit (API call, server action, console.log, nothing?).
4. How the storefront talks to Medusa (sdk file, fetch helper, env var names).
```

### Prompt 2: Backend module (in the Medusa backend folder)

```
In this Medusa v2 backend, create a custom module "trade" that stores Trade Program
applications.

Fields (match the fields found in the storefront form, these are my defaults):
name (required), email (required), company, phone, website, message,
status enum: pending | approved | rejected (default pending).

Create:
- src/modules/trade/models/trade-application.ts
- src/modules/trade/service.ts (MedusaService)
- src/modules/trade/index.ts (export TRADE_MODULE = "trade")
- register it in medusa-config.ts
- generate and run the migration: npx medusa db:generate trade && npx medusa db:migrate

Follow Medusa v2 conventions (model.define from @medusajs/framework/utils).
```

### Prompt 3: API routes + validation

```
Add these Medusa v2 API routes:
- POST /store/trade-applications  (public, validates body with zod, creates a record)
- GET  /admin/trade-applications  (list, newest first, supports ?status= filter)
- POST /admin/trade-applications/:id  (update status to approved or rejected)

Add src/api/middlewares.ts with defineMiddlewares and validateAndTransformBody
for the store POST route. Required: name, email (valid email). Others optional strings.
Return 400 with a clear message on invalid input.
```

### Prompt 4: Admin page

```
Create a Medusa admin route at src/admin/routes/trade-applications/page.tsx
that lists trade applications in a table (name, email, company, phone, website,
message, status badge, created date) with Approve and Reject buttons.
Use @medusajs/ui components, @tanstack/react-query, and the admin JS SDK
(src/admin/lib/sdk.ts). Add defineRouteConfig with label "Trade Applications".
Refetch the list after each status change.
```

### Prompt 5: Connect the existing storefront form

```
In the storefront, keep the existing form UI and styling exactly as is.
Only change the submit handler of the Join Trade Program form so that it:
1. Sends the field values to POST {MEDUSA_BACKEND_URL}/store/trade-applications
   with headers Content-Type: application/json and x-publishable-api-key.
2. Shows a loading state on the submit button.
3. On success: shows a thank-you message and closes/clears the form.
4. On failure: shows an error message and keeps the entered values.
Use the same SDK/fetch helper the rest of the storefront uses to call Medusa.
Make sure field names match the backend: name, email, company, phone, website, message.
```

### Prompt 6: Test

```
Start backend and storefront. Submit the Trade Program form with test data, then
confirm the record appears in the admin under "Trade Applications".
Test: missing email (should error), approve, reject. Fix anything that fails.
```

---

## Part B: Backend code (Medusa)

### 1. Model: `src/modules/trade/models/trade-application.ts`

```ts
import { model } from "@medusajs/framework/utils"

export const TradeApplication = model.define("trade_application", {
  id: model.id().primaryKey(),
  name: model.text(),
  email: model.text(),
  company: model.text().nullable(),
  phone: model.text().nullable(),
  website: model.text().nullable(),
  message: model.text().nullable(),
  status: model.enum(["pending", "approved", "rejected"]).default("pending"),
})
```

### 2. Service: `src/modules/trade/service.ts`

```ts
import { MedusaService } from "@medusajs/framework/utils"
import { TradeApplication } from "./models/trade-application"

class TradeModuleService extends MedusaService({ TradeApplication }) {}

export default TradeModuleService
```

### 3. Module definition: `src/modules/trade/index.ts`

```ts
import { Module } from "@medusajs/framework/utils"
import TradeModuleService from "./service"

export const TRADE_MODULE = "trade"

export default Module(TRADE_MODULE, { service: TradeModuleService })
```

### 4. Register in `medusa-config.ts`

```ts
module.exports = defineConfig({
  // ...existing config
  modules: [
    // ...existing modules
    { resolve: "./src/modules/trade" },
  ],
})
```

### 5. Migration

```bash
npx medusa db:generate trade
npx medusa db:migrate
```

### 6. Middleware + validation: `src/api/middlewares.ts`

```ts
import { defineMiddlewares, validateAndTransformBody } from "@medusajs/framework/http"
import { z } from "zod"

export const PostTradeApplicationSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  company: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  message: z.string().optional(),
})

export const UpdateTradeApplicationSchema = z.object({
  status: z.enum(["approved", "rejected", "pending"]),
})

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/trade-applications",
      method: "POST",
      middlewares: [validateAndTransformBody(PostTradeApplicationSchema)],
    },
    {
      matcher: "/admin/trade-applications/:id",
      method: "POST",
      middlewares: [validateAndTransformBody(UpdateTradeApplicationSchema)],
    },
  ],
})
```

If you already have a `middlewares.ts`, merge these two route entries into your existing `routes` array instead of replacing the file.

### 7. Store route (form submits here): `src/api/store/trade-applications/route.ts`

```ts
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TRADE_MODULE } from "../../../modules/trade"
import TradeModuleService from "../../../modules/trade/service"
import { z } from "zod"
import { PostTradeApplicationSchema } from "../../middlewares"

type Body = z.infer<typeof PostTradeApplicationSchema>

export async function POST(req: MedusaRequest<Body>, res: MedusaResponse) {
  const svc: TradeModuleService = req.scope.resolve(TRADE_MODULE)
  const { name, email, company, phone, website, message } = req.validatedBody

  const application = await svc.createTradeApplications({
    name,
    email,
    company: company ?? null,
    phone: phone ?? null,
    website: website ?? null,
    message: message ?? null,
  })

  res.status(201).json({ application })
}
```

### 8. Admin list route: `src/api/admin/trade-applications/route.ts`

```ts
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TRADE_MODULE } from "../../../modules/trade"
import TradeModuleService from "../../../modules/trade/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: TradeModuleService = req.scope.resolve(TRADE_MODULE)
  const status = req.query.status as string | undefined

  const [applications, count] = await svc.listAndCountTradeApplications(
    status ? { status } : {},
    { order: { created_at: "DESC" }, take: 100 }
  )

  res.json({ applications, count })
}
```

### 9. Admin update route: `src/api/admin/trade-applications/[id]/route.ts`

```ts
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TRADE_MODULE } from "../../../../modules/trade"
import TradeModuleService from "../../../../modules/trade/service"
import { z } from "zod"
import { UpdateTradeApplicationSchema } from "../../../middlewares"

type Body = z.infer<typeof UpdateTradeApplicationSchema>

export async function POST(req: MedusaRequest<Body>, res: MedusaResponse) {
  const svc: TradeModuleService = req.scope.resolve(TRADE_MODULE)

  const application = await svc.updateTradeApplications({
    id: req.params.id,
    status: req.validatedBody.status,
  })

  res.json({ application })
}
```

---

## Part C: Admin page

### 1. SDK helper: `src/admin/lib/sdk.ts` (skip if it already exists)

```ts
import Medusa from "@medusajs/js-sdk"

export const sdk = new Medusa({
  baseUrl: import.meta.env.VITE_BACKEND_URL || "/",
  debug: import.meta.env.DEV,
  auth: { type: "session" },
})
```

### 2. Page: `src/admin/routes/trade-applications/page.tsx`

```tsx
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Table, Badge, Button, Text } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { sdk } from "../../lib/sdk"

type Application = {
  id: string
  name: string
  email: string
  company: string | null
  phone: string | null
  website: string | null
  message: string | null
  status: "pending" | "approved" | "rejected"
  created_at: string
}

const statusColor = {
  pending: "orange",
  approved: "green",
  rejected: "red",
} as const

const TradeApplicationsPage = () => {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["trade-applications"],
    queryFn: () =>
      sdk.client.fetch<{ applications: Application[]; count: number }>(
        "/admin/trade-applications"
      ),
  })

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      sdk.client.fetch(`/admin/trade-applications/${id}`, {
        method: "POST",
        body: { status },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trade-applications"] }),
  })

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h1">Trade Applications</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {data?.count ?? 0} total
        </Text>
      </div>

      {isLoading ? (
        <Text className="px-6 py-4">Loading…</Text>
      ) : !data?.applications.length ? (
        <Text className="px-6 py-4 text-ui-fg-subtle">No applications yet.</Text>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Date</Table.HeaderCell>
              <Table.HeaderCell>Name</Table.HeaderCell>
              <Table.HeaderCell>Email</Table.HeaderCell>
              <Table.HeaderCell>Company</Table.HeaderCell>
              <Table.HeaderCell>Phone</Table.HeaderCell>
              <Table.HeaderCell>Message</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Actions</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {data.applications.map((a) => (
              <Table.Row key={a.id}>
                <Table.Cell>{new Date(a.created_at).toLocaleDateString()}</Table.Cell>
                <Table.Cell>{a.name}</Table.Cell>
                <Table.Cell>{a.email}</Table.Cell>
                <Table.Cell>{a.company ?? "-"}</Table.Cell>
                <Table.Cell>{a.phone ?? "-"}</Table.Cell>
                <Table.Cell className="max-w-[240px] truncate">{a.message ?? "-"}</Table.Cell>
                <Table.Cell>
                  <Badge color={statusColor[a.status]}>{a.status}</Badge>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex gap-2">
                    <Button
                      size="small"
                      disabled={a.status === "approved" || update.isPending}
                      onClick={() => update.mutate({ id: a.id, status: "approved" })}
                    >
                      Approve
                    </Button>
                    <Button
                      size="small"
                      variant="secondary"
                      disabled={a.status === "rejected" || update.isPending}
                      onClick={() => update.mutate({ id: a.id, status: "rejected" })}
                    >
                      Reject
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Trade Applications",
})

export default TradeApplicationsPage
```

After restarting the backend, **Trade Applications** appears in the admin sidebar.

---

## Part D: Storefront, connect your existing form

Keep your current form UI. Replace only the submit logic.

### Option 1: plain fetch

```tsx
async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault()
  setStatus("loading")

  const form = e.currentTarget
  const body = Object.fromEntries(new FormData(form))

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/trade-applications`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY!,
        },
        body: JSON.stringify(body),
      }
    )
    if (!res.ok) throw new Error("Request failed")
    setStatus("done")
    form.reset()
  } catch {
    setStatus("error")
  }
}
```

### Option 2: Medusa JS SDK (if your storefront already has `sdk`)

```ts
import { sdk } from "@/lib/config"

await sdk.client.fetch("/store/trade-applications", {
  method: "POST",
  body: { name, email, company, phone, website, message },
})
```

The SDK adds the publishable key automatically.

**Field names** in your form must match the backend: `name`, `email`, `company`, `phone`, `website`, `message`. If your form has different fields, add them to the model, the zod schema, and the admin table.

---

## Part E: Checklist

- [ ] Module registered, `db:migrate` ran without errors
- [ ] Backend restarted, so admin shows **Trade Applications** in the sidebar
- [ ] Storefront origin is in `STORE_CORS` in the backend `.env`
- [ ] `NEXT_PUBLIC_MEDUSA_BACKEND_URL` and `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` set in the storefront
- [ ] Test submission appears in admin
- [ ] Approve and Reject update the status badge

## Troubleshooting

| Problem | Fix |
|---|---|
| CORS error in browser | Add storefront URL to `STORE_CORS`, restart backend |
| 401 / "publishable key required" | Send `x-publishable-api-key` header on the store route |
| 400 on submit | Form field names or email format don't match the zod schema |
| Admin page not in sidebar | Restart backend, check file is at `src/admin/routes/trade-applications/page.tsx` |
| `createTradeApplications is not a function` | Model key must be `TradeApplication`, so the method names are generated from it |
| Table missing | Run `npx medusa db:generate trade` then `npx medusa db:migrate` |

## Optional next steps

- Email notification to you on each new application (Medusa subscriber or workflow)
- Email the applicant when approved or rejected
- Link approved applications to a customer group with trade pricing
- Spam protection (honeypot field or Cloudflare Turnstile) on the form

# Custom Commission Module (Next.js + Medusa v2 + Cloudflare R2)

Flow: Client submits request (images -> R2) -> Admin sees it in a "Commissions" section -> chat/negotiate, set quote -> client accepts -> admin clicks **Convert to Order** -> Medusa draft order is created and linked back to the commission.

> Code below is a starting skeleton, not tested against your repo. Check Medusa v2 docs for exact imports in your installed version.

---

## 1. Data model

Commission statuses: `new -> in_discussion -> quoted -> accepted -> converted` (plus `rejected`, `cancelled`).

`src/modules/commission/models/commission.ts`
```ts
import { model } from "@medusajs/framework/utils"

export const Commission = model.define("commission", {
  id: model.id({ prefix: "com" }).primaryKey(),
  customer_id: model.text().index(),          // client id (Medusa customer)
  title: model.text(),
  idea: model.text(),                          // idea / description
  requirements: model.text().nullable(),       // size, medium, deadline, style
  medium: model.text().nullable(),             // charcoal / acrylic / pen / mandala
  size: model.text().nullable(),
  budget: model.number().nullable(),
  deadline: model.dateTime().nullable(),
  status: model.enum([
    "new","in_discussion","quoted","accepted","converted","rejected","cancelled",
  ]).default("new"),
  quoted_price: model.number().nullable(),     // set by admin, in smallest currency unit
  currency_code: model.text().default("inr"),
  admin_notes: model.text().nullable(),
  order_id: model.text().nullable(),           // filled on conversion
  images: model.json(),                        // [{ key, filename, mime, size }] (R2 object keys)
})
```
Optional second model `commission_message` (commission_id, sender: "client"|"admin", body, created_at) if you want negotiation inside the dashboard instead of email/WhatsApp.

## 2. R2 uploads (presigned, browser -> R2 directly)

R2 is S3-compatible. Install `@aws-sdk/client-s3 @aws-sdk/s3-request-presigner`.

`src/lib/r2.ts`
```ts
import { S3Client } from "@aws-sdk/client-s3"
export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})
```

`src/api/store/commissions/upload-url/route.ts`
```ts
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { r2 } from "../../../../lib/r2"
import crypto from "crypto"

const ALLOWED = ["image/jpeg","image/png","image/webp"]
const MAX = 10 * 1024 * 1024

export async function POST(req, res) {
  const customerId = req.auth_context?.actor_id          // require logged-in customer
  if (!customerId) return res.status(401).json({ message: "Login required" })

  const { filename, contentType, size } = req.body
  if (!ALLOWED.includes(contentType) || size > MAX)
    return res.status(400).json({ message: "Invalid file" })

  const key = `commissions/${customerId}/${crypto.randomUUID()}-${filename.replace(/[^\w.-]/g,"_")}`
  const url = await getSignedUrl(
    r2,
    new PutObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key, ContentType: contentType }),
    { expiresIn: 300 }
  )
  res.json({ url, key })
}
```
Client: request URL -> `PUT` file to `url` -> keep `key` -> send keys in the commission form.

**Keep the bucket private.** Reference images are client-private. For the admin dashboard, generate short-lived presigned GET URLs (`GetObjectCommand`, 10-15 min) when loading a commission. R2 bucket CORS must allow `PUT` from your storefront origin.

Env: `R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET`.

## 3. Client submit endpoint

`POST /store/commissions` -> validate with zod (title, idea required; max ~5 images; every image key must start with `commissions/${customerId}/`) -> `commissionService.createCommissions(...)`, status `new`, customer_id from auth, never from the request body.

`GET /store/commissions` -> the client's own commissions + status (so they can see progress and an "Accept quote" button when status = `quoted`).
`POST /store/commissions/:id/accept` -> only if status is `quoted` and customer matches -> status `accepted`.

## 4. Admin API

- `GET /admin/commissions?status=&q=` -> list with customer id/name/email (resolve via customer module), image presigned URLs.
- `GET /admin/commissions/:id` -> full detail + messages.
- `POST /admin/commissions/:id` -> update `status`, `quoted_price`, `admin_notes`.
- `POST /admin/commissions/:id/convert` -> convert to order (below).

## 5. Convert to order (admin action)

Use a Medusa **workflow** so it's atomic and compensatable.

Setup (once): create a product "Custom Commission" with one variant (manage inventory off). The quote is applied as a unit price override on that variant.

`src/workflows/convert-commission-to-order.ts` (outline)
```ts
import { createWorkflow, WorkflowResponse, createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { createDraftOrderWorkflow } from "@medusajs/medusa/core-flows"

// step 1: load commission, assert status === "accepted" && quoted_price && !order_id
// step 2: createDraftOrderWorkflow.runAsStep({ input: {
//   email, customer_id, region_id, currency_code,
//   sales_channel_id,
//   items: [{ variant_id: COMMISSION_VARIANT_ID, quantity: 1,
//             unit_price: commission.quoted_price,
//             metadata: { commission_id, title } }],
//   shipping_address, metadata: { commission_id }
// }})
// step 3: update commission -> { status: "converted", order_id }
```
Then the admin confirms/pays the draft order using Medusa's draft-order flow (or sends the client a payment link). Guard against double conversion: reject if `order_id` is already set.

The existing "pay" question (full payment vs 50% advance) is a business choice - for commissions, many artists take an advance. You can model that as two payment collections later; start with full.

## 6. Admin dashboard UI

Medusa v2 admin extension: `src/admin/routes/commissions/page.tsx` (adds a **Commissions** sidebar item via `defineRouteConfig({ label: "Commissions" })`).

- **List page:** table - Commission ID, Client ID + name, title, status badge, quoted price, created date; filter by status; search.
- **Detail page:** client info (ID, email), idea/requirements, image gallery (presigned URLs), status dropdown, quote price input, notes, message thread.
- **Convert to Order** button: enabled only when `status === "accepted"`; confirm dialog -> calls `/admin/commissions/:id/convert` -> shows link to the created order. After conversion the button is replaced by "View order".

## 7. Client UI (Next.js)

- `/commission/new`: form (title, idea, requirements, medium, size, budget, deadline) + drag-and-drop image upload with preview and progress, uploading straight to R2.
- `/account/commissions`: list + detail, status timeline, "Accept quote" button.

## 8. Build order

1. R2 bucket + CORS + presigned upload route
2. Commission model + migration + store create/list
3. Client form and upload UI
4. Admin list/detail pages with status + quote
5. Accept flow
6. Convert workflow + draft order
7. Emails/notifications (new commission to you, quote to client)

## 9. Security checklist
- customer_id always from auth, never from the body
- validate image keys belong to that customer, check mime/size
- private bucket, short-lived signed URLs
- admin routes behind Medusa admin auth
- block double-conversion

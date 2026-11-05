# Custom Commission Module (Next.js + Medusa v2 + Cloudflare R2)

Flow: Client submits a request (images -> private R2) -> the studio discusses and quotes it -> the customer accepts -> the studio converts it to a draft order -> the customer pays through Razorpay. Acceptance does not create an order.

The commission is separate from ordinary artwork checkout. Its status path is `new -> in_discussion -> quoted -> accepted -> awaiting_payment -> paid`. Fixed-price charcoal portraits start as `quoted`; their price is calculated by the backend. `converted` is retained only for old records and is not accepted by current payment endpoints.

---

## 1. Data model

Commission statuses: `new -> in_discussion -> quoted -> accepted -> awaiting_payment -> paid` (plus `rejected` and `cancelled`).

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
  quoted_price: model.number().nullable(),     // INR major units
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

**Keep the bucket private.** Commission upload and download helpers require R2 credentials and return only short-lived presigned URLs. The upload signature binds the content type and size; commission submission verifies the stored object's size, content type, and image signature. The API also enforces a 10 MB per-image limit and a maximum of five images. R2 bucket CORS must allow `PUT` from your storefront origin.

Env: `R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET`.

## 3. Client submit endpoint

`POST /store/commissions` -> validate with Zod (title and idea required; max five images; each image key must start with `commissions/${customerId}/` and refer to a verified R2 image) -> `commissionService.createCommissions(...)`, status `new`, customer_id from auth, never from the request body. Charcoal portrait prices are calculated on the server from size and number of people and start at `quoted`.
`GET /store/commissions` -> the client's own commissions + status (so they can see progress and an "Accept quote" button when status = `quoted`).
`GET /store/commissions/:id` and `POST /store/commissions/:id/messages` -> verify ownership before returning commission data, messages, or signed image URLs.
`POST /store/commissions/:id/accept` -> only if status is `quoted`, the quote is a positive integer, and the customer matches -> status `accepted`. No order is created by acceptance.
`POST /store/commissions/:id/payment-session` and `/pay` -> verify ownership, commission/order/session linkage, payment status, and Razorpay verification before capture and order conversion. A verified Razorpay webhook can retry completion idempotently.

## 4. Admin API

- `GET /admin/commissions?status=&q=` -> list with customer id/name/email (resolve via customer module), image presigned URLs.
- `GET /admin/commissions/:id` -> full detail + messages.
- `POST /admin/commissions/:id` -> validate quote and notes; only allow legal studio transitions (including setting `in_discussion` and `quoted`). The server prevents changing a quote after acceptance.
- `POST /admin/commissions/:id/convert` -> convert to order (below).

## 5. Convert to order (admin action)

Use a Medusa **workflow** with a per-commission lock so concurrent clicks/retries cannot create duplicate orders.

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
// step 3: create payment collection and update commission -> { status: "awaiting_payment", order_id }
```
The workflow rejects unaccepted/previously converted commissions, validates the quote, links the draft order, and creates its payment collection. A retry is rejected before creating another draft order.

Payment completion is a separate workflow. It verifies the client callback through the Razorpay provider or accepts a provider-authenticated webhook, captures payment, converts the draft order to a regular order, and only then marks the commission `paid`. Failed/cancelled attempts do not change the commission status, so the customer can retry.

The existing "pay" question (full payment vs 50% advance) is a business choice - for commissions, many artists take an advance. You can model that as two payment collections later; start with full.

## 6. Admin dashboard UI

Medusa v2 admin extension: `src/admin/routes/commissions/page.tsx` (adds a **Commissions** sidebar item via `defineRouteConfig({ label: "Commissions" })`).

- **List page:** table - Commission ID, Client ID + name, title, status badge, quoted price, created date; filter by status; search.
- **Detail page:** client info (ID, email), idea/requirements, image gallery (presigned URLs), status dropdown, quote price input, notes, message thread.
- **Convert to Order** button: enabled only when `status === "accepted"`; confirm dialog -> calls `/admin/commissions/:id/convert` -> shows link to the created order. After conversion the button is replaced by "View order".

## 7. Client UI (Next.js)

- `/commission/new`: form (title, idea, requirements, medium, size, budget, deadline) + drag-and-drop image upload with preview and progress, uploading straight to R2.
- `/account`: commissions list.
- `/account/commissions/:id/pay`: commission details, signed reference images, refreshed discussion, accept-quote or payment action.

Commission emails are triggered for the initial request and each status transition. Subscriber failures are logged and do not roll back a status change.

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

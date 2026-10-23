# Art and gifts storefront

A Next.js 15 (App Router) storefront for a Medusa v2 backend. Browse, artwork pages, saved works, bag, checkout, accounts, commission and contact forms.

## Run it

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev                  # http://localhost:3000
```

You need a running Medusa v2 backend (default `http://localhost:9000`) and a publishable API key (Medusa admin, Settings, Publishable API Keys). Link a sales channel that has your products to that key.

## What is in the store

| Route | What it does |
| --- | --- |
| `/` | Newest artwork as a wall label, recent works, collections |
| `/artworks` | Grid at true proportions, filter by medium, collection and price, sort, search (`?q=`), pagination |
| `/artworks/[handle]` | Image gallery with zoom, wall-label details, variant picker, add to bag, save, inquiry form, related works |
| `/collections`, `/collections/[handle]` | Medusa collections |
| `/saved` | Works saved with the heart (stored in the browser) |
| `/cart`, bag drawer | Quantities, remove, discount codes, totals |
| `/checkout` | Address, delivery, payment, place order |
| `/order/[id]` | Confirmation |
| `/account` | Sign in, register, order history |
| `/commissions`, `/contact` | Forms posting to `/api/inquiry` |
| `/about`, `/shipping` | Placeholder copy to replace |

## Setting up Medusa for this storefront

1. **Region.** Create a region for your country with its currency. The storefront picks the region containing `NEXT_PUBLIC_DEFAULT_COUNTRY`, else the first region.
2. **Shipping.** Add a shipping option to the region's stock location, or checkout shows "No delivery options are available".
3. **Payment.** Enable `pp_system_default` (manual payment) on the region to place orders without a gateway. See "Online payments" below for Stripe or Razorpay.
4. **Categories** are the mediums (Drawings, Paintings, Gifts). **Collections** are curated groups. Both appear in the header menus and filters automatically.

### How artwork data maps to Medusa fields

| Shown on the page | Medusa field |
| --- | --- |
| Medium | `material` (falls back to `metadata.medium`) |
| Size and grid proportions | `width` and `height` in cm (or `metadata.dimensions`, `metadata.aspect`) |
| Year, edition, framing | `metadata.year`, `metadata.edition`, `metadata.framing` |
| Sold state | Variant inventory is managed and at 0 |
| One-of-a-kind work | One variant with inventory 1 |
| Prints in several sizes | One variant per size |

Upload images to Cloudinary and paste the URLs into the product images, or use the Medusa file module with the Cloudinary provider. `res.cloudinary.com` is already allowed in `next.config.mjs`.

## Online payments

Checkout currently completes orders with Medusa's manual provider. For card or UPI payments, add the provider to your Medusa region, then in `src/components/CheckoutFlow.tsx`:

1. Allow that provider id instead of only `pp_system_default`.
2. After `startPayment(providerId)`, read the session data from the cart (`cart.payment_collection.payment_sessions`) and confirm the payment with the provider's client library.
3. Call `placeOrder()` once the provider confirms.

Stripe uses `@stripe/react-stripe-js` with the session's `client_secret`. Razorpay uses its Checkout script with the session's order id. This part is not wired up yet.

## Forms

`/api/inquiry` accepts newsletter sign-ups, commission requests, artwork inquiries and contact messages. Set `INQUIRY_WEBHOOK_URL` to forward each one to Slack, Discord, Zapier or Make. Without it, submissions are only logged on the server.

## Things to replace before launch

- `NEXT_PUBLIC_SITE_NAME` and `NEXT_PUBLIC_CONTACT_EMAIL` in `.env.local`
- The copy in `src/app/about/page.tsx` and `src/app/shipping/page.tsx`, and the homepage paragraph in `src/app/page.tsx`
- Price bands in `src/components/BrowseFilters.tsx` and the "Under ₹5,000" link in `src/lib/config.ts` if your currency is not INR

## Notes

- Pages render on request, so the build does not need the backend running.
- Price filtering, sorting and paging happen in memory over up to 200 products, because Medusa's Store API has no price filter. Move to Meilisearch or Algolia if the catalogue grows past a few hundred works.
- Saved works live in `localStorage`, so they are per browser.
- The bag is a Medusa cart tracked by an `httpOnly` cookie for 14 days. Signed-in customers are attached to the cart at checkout.

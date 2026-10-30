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

## Authentication System & Supabase Integration

The storefront features an editorial gallery-styled authentication pipeline with Medusa v2 customer accounts, cart synchronization, and optional Supabase identity provider integration.

### Routes
- `/register` — Create account with first/last name, email, password, and marketing opt-in flag.
- `/login` — Sign in with email and password, secure `httpOnly` cookie session (`_medusa_jwt`), and `?next=` redirection.
- `/forgot-password` — Password reset request form (generic responses to prevent account enumeration).
- `/reset-password` — Password reset completion with token verification.
- `/verify-email` — Handles email verification notice, success, and expired states.
- `/auth/callback` — Route handler exchanging authentication/verification codes.
- `/account` — Protected customer dashboard featuring profile management, password updates, and Medusa order history.

### Supabase Dashboard Configuration (Optional)
If utilizing Supabase as the identity provider alongside Medusa:
1. **Site URL:**
   - Go to **Authentication > URL Configuration > Site URL** and set to `http://localhost:8000` (production: `https://yourdomain.com`).
2. **Redirect URLs:**
   - Under **Redirect URLs**, add:
     - `http://localhost:8000/auth/callback`
     - `http://localhost:8000/verify-email`
     - `https://yourdomain.com/auth/callback` (production)
3. **Email Templates:**
   - Go to **Authentication > Email Templates** to customize the confirmation and password recovery templates.
4. **Database Schema:**
   - Run the SQL migration in `supabase/migrations/01_profiles_and_rls.sql` in the Supabase SQL Editor to establish the `public.profiles` table, RLS policies, and new-user trigger.

### Medusa Backend CORS Configuration
In `apps/backend/.env`, ensure allowed origins include the storefront port:
```env
STORE_CORS=http://localhost:8000,http://127.0.0.1:8000
AUTH_CORS=http://localhost:8000,http://127.0.0.1:8000,http://localhost:5173,http://localhost:9000
STOREFRONT_URL=http://localhost:8000
```

### Manual Testing Checklist
- [ ] **Register (`/register`):** Enter first name, last name, valid email, password (min 8 chars), and check marketing opt-in. Verify successful registration, auto-login, and redirection to `/account`.
- [ ] **Register Validation:** Attempt submitting with empty fields or <8 char password; verify inline red error text.
- [ ] **Login (`/login`):** Sign in with existing credentials. Verify redirection to `/account` (or `?next=` URL).
- [ ] **Wrong Password:** Attempt logging in with incorrect credentials. Verify generic "Email or password is incorrect" message.
- [ ] **Protected Route Redirect:** Visit `/account` in an incognito window. Verify redirect to `/login?next=%2Faccount`.
- [ ] **Guest-Only Redirect:** Visit `/login` while logged in. Verify automatic redirect to `/account`.
- [ ] **Guest Cart Merge:** Add an artwork to bag as a guest. Navigate to `/login` and sign in. Verify items in the cart drawer remain intact and linked to the customer account.
- [ ] **Checkout Prefill:** Navigate to `/checkout` as a logged-in customer. Verify first name, last name, and email are automatically prefilled in the shipping address step.
- [ ] **Forgot & Reset Password:** Request password reset on `/forgot-password`. Verify email dispatched (or console token logged). Click reset link on `/reset-password?token=...` and set new password.
- [ ] **Logout:** Click "Sign Out" on `/account`. Verify session cleared and redirected to `/login`.

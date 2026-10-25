# LITA — Project Status & Context Guide for Claude

> **Instructions for Claude / AI Assistant:**
> This document describes the exact architecture, current status, recent fixes, and open roadmap for the **LITA** (Livin In The Art) ecommerce platform. Use this file as context to understand the repository structure, conventions, and to generate ready-to-implement code and prompts without repeating previously resolved issues.

---

## 1. Executive Summary

- **Project Name:** LITA (*Livin In The Art*)
- **Repository Architecture:** Turborepo monorepo (`npm` workspaces)
- **Primary Stack:**
  - **Backend:** Medusa v2 (`@medusajs/medusa` `2.21.2`, Node.js 22+, Express, MikroORM, Knex)
  - **Storefront:** Next.js 15 (`15.5.28` with App Router, Turbopack, React 19, Tailwind CSS v3, `@medusajs/js-sdk`)
  - **Database:** PostgreSQL on Supabase (`aws-0-ap-southeast-2.pooler.supabase.com:6543`) with SSL pooler connection
  - **Admin Dashboard:** Medusa Admin Dashboard (React 18 SPA served by Medusa at `/app`)

---

## 2. Directory Structure

```text
c:\Users\chall\OneDrive\Desktop\LITA\LITA\
├── apps/
│   ├── backend/                           # Medusa v2 Commerce Engine (@dtc/backend)
│   │   ├── medusa-config.ts               # Core Medusa config: DB URL, CORS, secrets, SSL, R2 S3 provider
│   │   ├── .env                           # Backend environment variables
│   │   ├── static/                        # Media assets & local upload storage
│   │   └── src/
│   │       ├── admin/                     # Custom admin dashboard widgets & extensions
│   │       ├── api/                       # File-based API endpoints (store/* and admin/*)
│   │       ├── jobs/                      # Scheduled background jobs
│   │       ├── scripts/                   # Diagnostic scripts (test-resend.ts, test-r2-upload.ts)
│   │       ├── subscribers/               # Event subscribers (password-reset.ts via Resend)
│   │       ├── workflows/                 # Business logic workflows and steps
│   │       └── ...
│   │
│   └── storefront/                        # Customer-Facing Next.js Storefront (@dtc/storefront)
│       ├── next.config.js                 # Next.js config (Turbopack root, aliases, CSP, R2 remote patterns)
│       ├── .env.local                     # Storefront environment variables
│       ├── public/                        # Static imagery (hero-bg, collection thumbnails)
│       ├── src/
│       │   ├── app/                       # App Router routes:
│       │   │   ├── page.tsx               # Curated editorial gallery homepage (ISR revalidate = 60)
│       │   │   ├── artworks/              # Artwork catalog & [handle] detail pages (ISR revalidate = 60)
│       │   │   ├── collections/           # Curated collection overviews & single collection pages
│       │   │   ├── about/                 # Artist statement & studio background
│       │   │   ├── commissions/           # Bespoke commission inquiry request workflow
│       │   │   ├── contact/               # Studio contact form
│       │   │   ├── shipping/              # Shipping, handling, care & return policies
│       │   │   ├── saved/                 # Saved / Wishlist gallery
│       │   │   ├── cart/                  # Dedicated cart page (dynamic)
│       │   │   ├── checkout/              # Seamless guest / customer checkout flow (dynamic)
│       │   │   ├── account/               # Customer account portal, forgot-password & reset-password
│       │   │   ├── order/                 # Order confirmation & status (dynamic)
│       │   │   ├── api/inquiry/           # Commission & artwork inquiry handler
│       │   │   ├── globals.css            # Custom gallery design tokens & typography
│       │   │   └── layout.tsx             # Root layout with Header & Footer
│       │   ├── components/                # Modular gallery components (Header, HeaderNav, HeaderActions,
│       │   │                              # CartDrawer, MobileMenu, PromoBanner, ArtworkGrid, BrowseFilters,
│       │   │                              # livinIcons, SaveButton, SavedWorks, InquiryForm, Footer, RecentlyAddedSection)
│       │   └── lib/                       # Medusa client & data services
│       │       ├── medusa.ts              # Medusa JS SDK client instance
│       │       ├── config.ts              # Site metadata & navigation configuration
│       │       ├── format.ts              # Currency & dimension formatting helpers
│       │       ├── saved.ts               # LocalStorage wishlist state helper
│       │       └── data/                  # In-memory TTL cached fetchers (catalog, cart, customer, password-reset)
│       └── package.json
│
├── docs/                                  # Deep-dive architecture and performance specifications
│   ├── AUTHENTICATION_AND_AUTHORIZATION.md# Complete auth lifecycle, Option C magic link spec & security guarantees
│   └── PERFORMANCE_AND_CACHING.md         # Storefront latency analysis, root cause, in-memory cache & ISR benchmarks
├── package.json                           # Turborepo root package.json
├── package-lock.json                      # Authoritative lockfile (npm@11.1.0)
└── turbo.json                             # Turborepo pipeline tasks
```

---

## 3. Current Live Status

| Component | Port / Endpoint | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Backend API** | `http://localhost:9000` | **HEALTHY (200 OK)** | `GET /health` returns `OK` |
| **Admin Dashboard** | `http://localhost:9000/app` | **READY** | Accessible via browser; admin credentials configured |
| **Storefront** | `http://localhost:8000` | **HEALTHY (200 OK)** | Clean App Router routes (`/`, `/artworks`, `/collections`, etc.) |
| **Database** | Supabase PostgreSQL | **CONNECTED** | Remote pooled connection via SSL (`port 6543`) |
| **Store Regions** | `GET /store/regions` | **OPERATIONAL** | Returns configured regions |
| **Cloudflare R2 Storage** | S3 API Endpoint | **OPERATIONAL** | Verified via `npm run test:r2` diagnostic upload script |

---

## 4. Key Configuration & Architecture Rules

1. **Package Manager:**
   - **`npm`** is the project package manager (`package-lock.json` present). Do not introduce `pnpm-lock.yaml` or `yarn.lock`.
   - Run commands from the monorepo root:
     - Full stack: `npm run dev`
     - Backend only: `npm run backend:dev`
     - Storefront only: `npm run storefront:dev`

2. **Medusa v2 Architecture Conventions:**
   - **File-based routing:** Store routes reside in `apps/backend/src/api/store/<path>/route.ts`. Admin routes reside in `apps/backend/src/api/admin/<path>/route.ts`.
   - **Workflows:** All business logic must be placed inside **Medusa Workflows** (`apps/backend/src/workflows`), not directly inside route handlers. Route handlers should merely resolve inputs and invoke workflows.
   - **Database Changes:** Models reside in `apps/backend/src/modules/<module-name>/models/`. Generating migrations requires:
     ```bash
     cd apps/backend && npx medusa db:generate <module-name>
     npx medusa db:migrate
     ```

3. **Storefront Conventions (Next.js 15):**
   - Dynamic route parameters: In Next.js 15, route `params` and `searchParams` are Promises and must be awaited:
     ```tsx
     export default async function Page(props: { params: Promise<{ handle: string }> }) {
       const { handle } = await props.params
     }
     ```
   - All server data calls use `@/lib/data/*` which wraps the Medusa JS Client (`@medusajs/js-sdk`).

---

## 5. Recently Resolved Bugs & Fixes (Do Not Re-Introduce)

1. **Supabase SSL Pooler Connection in Medusa v2:**
   - *Problem:* Supabase pooler connections require SSL (`rejectUnauthorized: false`), but `medusa-config.ts` was not passing `databaseDriverOptions`.
   - *Fix:* Added `databaseDriverOptions` extraction from `DATABASE_EXTRA` into `apps/backend/medusa-config.ts`:
     ```typescript
     databaseDriverOptions: process.env.DATABASE_EXTRA
       ? JSON.parse(process.env.DATABASE_EXTRA)
       : undefined,
     ```

2. **CORS Origins:**
   - *Problem:* Browser client fetch failed with CORS errors when accessing via `127.0.0.1` instead of `localhost`.
   - *Fix:* Added `http://127.0.0.1:8000` and `http://127.0.0.1:9000` to `STORE_CORS`, `ADMIN_CORS`, and `AUTH_CORS` in `apps/backend/.env`.

3. **Storefront Middleware Unhandled Fetch:**
   - *Problem:* When backend restarted, `middleware.ts` threw `TypeError: fetch failed` at `/store/regions`, crashing Next.js into the internal `/_error` route.
   - *Fix:* Streamlined middleware to clean pass-through with matcher exclusion for static assets.

4. **React 18 vs React 19 Workspace Isolation:**
   - *Problem:* Next.js 15 Turbopack selected `C:\Users\chall\` as the workspace root due to a stray `package-lock.json` in user home, resolving root React 18 packages alongside Next.js 15's React 19.
   - *Fix:* Configured `turbopack.root: path.resolve(__dirname, "../../")` and webpack aliases for `react` and `react-dom` in `apps/storefront/next.config.js`.

5. **LITA Gallery Header & Navigation System:**
   - *Implementation:* Built a pixel-perfect, editorial-grade gallery header for Livin In The Art (`LIVININ THE ART`).
   - *Components:*
     - `PromoBanner.tsx`: Top burgundy (`#5f2f3c`) announcement strip with seasonal / collection highlight.
     - `livinIcons.tsx`: Custom vector icon suite (Cormorant Garamond wordmark, Search, Heart, Cart, User, Menu, Close).
     - `HeaderNav.tsx`: Desktop main navigation with mega-dropdowns for Artworks, Collections, Advisory, and About.
     - `HeaderActions.tsx`: Action suite featuring expandable search with auto-focus, saved works counter badge, slide-over cart drawer launcher, and customer profile link.
     - `MobileMenu.tsx`: Responsive mobile drawer with accordion-based category navigation and account actions.
     - `Header.tsx`: Unified SSR component orchestrating catalog categories, cart state, and customer session.

6. **Full Editorial Storefront Homepage:**
   - Implemented an immersive editorial homepage (`src/app/page.tsx`):
     - Hero section with high-res background (`hero-bg.jpg`), Cormorant Garamond title, and dual CTAs ("View Collection", "Featured Artworks").
     - Recently Added artwork grid with real-time Medusa catalog data.
     - Curated Collections split section (`CURATED_COLLECTIONS` with `collection-focus.jpg` & `collection-landscapes.jpg`) with hover depth animations and count indicators.
     - Artist studio statement & handcrafted artwork narrative with direct commission CTA.

7. **Catalog Browsing, Filtering & Product Detail Pages:**
   - Full browsing suite at `/artworks` featuring `BrowseFilters.tsx` (sorting, price tier filtering, dimensions, medium) and `ArtworkGrid.tsx`.
   - Artwork detail view at `/artworks/[handle]` with responsive gallery, medium and dimensions metadata, framing options, add-to-bag with instant feedback, and bespoke artwork inquiry modal (`InquiryForm.tsx` & `/api/inquiry`).

8. **Wishlist / Saved Works Persistence:**
   - Client-side saved works stored in browser `localStorage` (`src/lib/saved.ts`).
   - Interactive heart toggle button (`SaveButton.tsx`) with optimistic visual state on artwork cards and details.
   - Dedicated saved works management page (`/saved` & `SavedWorks.tsx`).

9. **Cart Drawer & Checkout Flow:**
   - Dynamic slide-out `CartDrawer.tsx` with instant quantity controls, item removal, and subtotal calculation.
   - Comprehensive `/checkout` flow supporting guest checkout, address collection, shipping method selection, and order placement.
   - Customer authentication and profile portal (`/account`).

10. **Gallery Footer & Supporting Information Pages:**
    - Unified gallery footer (`Footer.tsx`) with monthly release newsletter subscription form (`NewsletterForm.tsx`).
    - Informational pages: `/about` (artist bio and studio vision), `/commissions` (custom artwork commission requests), `/contact`, `/shipping` (shipping, packaging, care, and returns policy).

11. **Authentication & Authorization Hardening (Branch `auth-hardening`):**
    - **Task 1 — JWT / Cookie Lifetime Alignment (COMPLETED):**
      Aligned Medusa backend JWT token expiration to 7 days (`jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d"`) matching the storefront `_medusa_jwt` HttpOnly cookie `maxAge`. Prevents silent session invalidation while cookie is still present.
    - **Tasks 2 & 3 — Production Secrets & CORS Fail-Fast Guard (COMPLETED):**
      Added production startup guard in `apps/backend/medusa-config.ts` enforcing that `JWT_SECRET` and `COOKIE_SECRET` are ≥ 32 characters, and `STORE_CORS`, `ADMIN_CORS`, and `AUTH_CORS` are explicitly defined. Fully backward-compatible in development.
    - **Task 4 — Complete Password Reset Flow with Resend (COMPLETED):**
      - Backend: Created subscriber `apps/backend/src/subscribers/password-reset.ts` listening to `auth.password_reset`, generating branded editorial HTML emails, and dispatching via Resend REST API (with automatic fallback to console link logging in local dev).
      - Storefront: Created Server Actions `requestPasswordReset(email)` and `resetPassword(token, newPassword)` in `apps/storefront/src/lib/data/password-reset.ts`. Implemented `/account/forgot-password` and `/account/reset-password` pages and added "Forgot password?" link to `AuthForms.tsx`.
    - **Task 5 — Rate Limiting (POSTPONED):**
      Evaluated application-level vs infrastructure-level rate limiting. In-process memory limiters are fragile across server restarts and container scaling. Postponed to the infrastructure / edge deployment phase (e.g. Cloudflare WAF rate limiting rules or Upstash Redis distributed sliding window in Next.js middleware).
    - **Task 6 — Server-Side Password Policy (COMPLETED):**
      Enforced server-side 8-character minimum validation directly in `apps/storefront/src/lib/data/customer.ts` (`register()` action) and `apps/storefront/src/lib/data/password-reset.ts` (`resetPassword()` action), preventing client-side bypass.
    - **Task 7 — Robust Duplicate Registration Error Handling (COMPLETED):**
      Replaced simple string regex matching in `register()` with `FetchError` status validation (`e.status === 401 || e.status === 409`) alongside pattern checks, handling both Medusa auth identity collisions (401) and customer profile collisions (409) reliably.
    - **Task 8 — Security Headers & Report-Only CSP (COMPLETED):**
      Added `HSTS`, `X-Frame-Options` (`SAMEORIGIN`), `X-Content-Type-Options` (`nosniff`), `Referrer-Policy` (`strict-origin-when-cross-origin`), and non-blocking `Content-Security-Policy-Report-Only` (covering Google Fonts, AWS S3/Cloudinary/Medusa images, and backend API connections) in `apps/storefront/next.config.js`. Verified via HTTP response headers.
    - **Task 9 — Email Verification Architecture: Option C Selected (DOCUMENTED):**
      Evaluated 3 architectural patterns. Selected **Option C (Passwordless / Magic Link at Checkout)** to eliminate registration friction during fine art purchasing while retaining dual compatibility with traditional `emailpass` logins. Documented in `docs/AUTHENTICATION_AND_AUTHORIZATION.md`.

12. **Cloudflare R2 Media Storage Provider Integration (Branch `feature/r2-file-storage`):**
    - **Medusa v2 S3 File Provider:** Configured `@medusajs/medusa/file-s3` provider in `apps/backend/medusa-config.ts` targeting Cloudflare R2 (`R2_FILE_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT`, `R2_REGION`). Added `requestChecksumCalculation: "WHEN_REQUIRED"` and `responseChecksumValidation: "WHEN_REQUIRED"` in `additional_client_config` for complete AWS S3 SDK compatibility with Cloudflare R2's S3 API.
    - **Production Startup Fail-Fast Guard:** Added startup validation check in `medusa-config.ts` requiring all 5 R2 environment variables in production while gracefully preserving local disk storage fallback in local development when variables are unset.
    - **Diagnostic Verification Script (`test:r2`):** Created `apps/backend/src/scripts/test-r2-upload.ts` (runnable via `npm run test:r2`) to verify uploading high-resolution artwork binaries to R2 via the S3 provider and verifying public download accessibility, content-type headers, and byte length.
    - **Storefront Image Hostname Normalization:** Updated `apps/storefront/next.config.js` to dynamically parse and sanitize `NEXT_PUBLIC_R2_FILE_URL` / `R2_FILE_URL`, robustly stripping protocol schemes, subpaths, and trailing slashes for `images.remotePatterns`. Added comprehensive unit test suite in `apps/storefront/src/__tests__/next-config.test.js`.
    - **Environment Documentation:** Added complete R2 variable specifications to `.env.example` and `.env.template` across both backend and storefront.

13. **Storefront Performance Optimization & Latency Caching (Branch `feature/r2-file-storage`):**
    - **Root Cause Investigation:** Discovered navigation clicks took 5–12+ seconds (and up to 25s on initial JIT compile). Pinpointed dual root causes:
      1. Next.js `force-dynamic` cache skipping was disabling the Data Cache, ISR, and client router cache on catalog routes.
      2. Physical cross-continental latency between local dev machine (India) and remote Supabase PostgreSQL in Sydney, Australia (`aws-0-ap-southeast-2`), incurring ~200–250ms per roundtrip across 20–30 sequential Medusa SQL queries per request (~6.5–7.5s wire wait time).
    - **In-Memory Process TTL Cache:** Implemented in `apps/storefront/src/lib/data/catalog.ts` caching regions (300s), artworks and single products (60s), and collections/categories (120s). Eliminates repeated sequential SQL calls for browsing sessions.
    - **Incremental Static Regeneration (ISR):** Replaced `force-dynamic` with `export const revalidate = 60` across all public catalog routes (`/`, `/artworks`, `/artworks/[handle]`, `/collections`, `/collections/[handle]`), restoring Next.js `<Link>` client prefetching and instant client-side route transitions (< 50ms – 1s).
    - **Dynamic Route Isolation:** Sensitive and mutation-heavy routes (`/cart`, `/checkout`, `/account`, `/order/[id]`) intentionally remain dynamic for security and real-time state correctness.
    - **UI Enhancements:** Redesigned `Footer.tsx` and built dedicated `RecentlyAddedSection.tsx`.
    - **Comprehensive Documentation:** Created `docs/PERFORMANCE_AND_CACHING.md` documenting architecture diagrams, query waterfall analysis, before/after PowerShell benchmark measurements, and regional database migration recommendations.

14. **Editorial About Page Redesign (Branch `feature/r2-file-storage`):**
    - **Visual Alignment with Uprise Art Gallery Aesthetic:** Redesigned the storefront `/about` page (`apps/storefront/src/app/about/page.tsx`) to match high-end editorial contemporary art gallery aesthetics.
    - **Hero Section:** Centered header with spaced tracking eyebrow (`ABOUT US`), responsive Cormorant Garamond headline (*"Expertly curated, entirely unique"*), and a high-resolution wide gallery banner.
    - **Two-Column Hairline Grid Callouts:** Four modular 50/50 split sections bounded by subtle 1px border dividers (`border-[#E5E7EB]`):
      1. *Artist Storytelling:* Narrative statement (*"Every artist has a story to tell..."*) with underlined CTA to browse artworks catalog (`/artworks`), paired with artist studio portrait.
      2. *Art Advisory:* Advisory narrative (*"Our expert art advisors thoughtfully select..."*) with direct inquiry link (`/commissions`), paired with white-glove artwork handling photography.
      3. *Curated Catalog & Limited Editions:* Original art narrative (*"We feature original artwork and limited edition prints..."*) linking to catalog, paired with detail photography of artist painting on canvas.
      4. *Gallery Showroom & In-Person Viewings:* Gallery visit invitation (*"Visit our gallery to experience our collections in person..."*) linking to studio contact (`/contact`), paired with modern gallery exhibition photography.
    - **Design System & Typography:** Configured `cormorant` font family in both `tailwind.config.js` and `tailwind.config.ts`.
    - **Local Asset Hosting:** Placed all high-resolution photography locally under `apps/storefront/public/about/` (`hero-curated.jpg`, `artist-dan-covert.jpg`, `advisor-white-gloves.jpg`, `original-artwork-perrote.jpg`, `gallery-space.jpg`), preventing external CDN reliance and Next.js unconfigured host errors.
    - **Studio Philosophy Callout:** Added closing quotation banner (*"The only thing that matters is that your artwork brings warmth, joy, and inspiration into your everyday space."*) with dual CTAs to explore artworks or request bespoke commissions.

15. **Blog-Style Admin & Storefront Journal Feature (Branch `feature/r2-file-storage`):**
    - **Custom Medusa v2 Journal Module:** Created custom module at `apps/backend/src/modules/journal` with `JournalPost` model (title, slug, excerpt, markdown content, cover_image_url, status ["draft", "published"], published_at, tags) using Medusa's DML and `MedusaService`. Registered module in `medusa-config.ts`.
    - **Database Migration:** Generated and ran migration `Migration20261025042417` creating PostgreSQL table `journal_post` with unique slug index and soft delete support.
    - **Transactional Workflows:** Implemented `createJournalPostWorkflow`, `updateJournalPostWorkflow`, and `deleteJournalPostWorkflow` with automatic rollback compensation and automatic `published_at` timestamp setting upon first publication.
    - **Admin & Store API Endpoints:** Built authenticated admin endpoints (`GET /admin/journal`, `POST /admin/journal`, `GET /admin/journal/:id`, `POST /admin/journal/:id`, `DELETE /admin/journal/:id`) and public store endpoints (`GET /store/journal`, `GET /store/journal/:slug`).
    - **Input Validation Middleware:** Added strict Zod request schema validation in `apps/backend/src/api/middlewares.ts` for admin creation and partial update mutations.
    - **Medusa Admin Dashboard UI:** Built full CRUD interface under `apps/backend/src/admin/routes/journal/page.tsx` featuring a posts table with status badges and an editorial `FocusModal` for authoring markdown articles, previewing metadata, and managing publication state.
    - **Editorial Storefront Experience:** Built `/journal` index page (`apps/storefront/src/app/journal/page.tsx`) with featured story banner and responsive 3-column article cards, plus dedicated `/journal/[slug]` detail page with `react-markdown` styling, SEO metadata generation, and studio attribution. Integrated Journal navigation across `HeaderNav`, `MobileMenu`, and `Footer`.

---

## 6. Current Roadmap & Next Steps

1. **Payment Gateway Integration (Stripe):**
   - [ ] Install and configure `@medusajs/payment-stripe` payment module in `apps/backend/medusa-config.ts`.
   - [ ] Connect Stripe Elements into `apps/storefront/src/components/CheckoutFlow.tsx` with `NEXT_PUBLIC_STRIPE_KEY`.
   - [ ] Configure Medusa Stripe webhook handler for asynchronous payment events (`payment_intent.succeeded`, `payment_intent.payment_failed`).
   - [ ] Set `STRIPE_API_KEY` and `STRIPE_WEBHOOK_SECRET` in backend `.env`.

2. **Custom Backend Artwork Attributes & Admin Extensions:**
   - [ ] Extend Medusa product entity / create custom module for art attributes: `artist_name`, `medium`, `dimensions`, `certificate_of_authenticity`, `edition`, `year_created`.
   - [ ] Generate and apply database migrations (`npx medusa db:generate`, `npx medusa db:migrate`).
   - [ ] Build custom admin widgets under `apps/backend/src/admin/widgets/` for easy metadata editing in the Medusa Admin Dashboard.
   - [ ] Expose metadata in `/store/products` and wire dynamically to artwork detail pages (`artworks/[handle]/page.tsx`) and filter bar (`BrowseFilters.tsx`).

3. **Low-Friction Authentication & Email Verification (Option C Magic Link):**
   - [ ] Implement short-lived signed magic link request and verification actions (`requestPasswordlessLink`, `verifyPasswordlessToken`) with Resend dispatch.
   - [ ] Wire seamless magic link verification directly into `/checkout` contact step with atomic cart transfer (`transferCart`), eliminating registration friction while preserving guest carts.

4. **Automated Notification & Email Workflows:**
   - [x] Password reset emails via Resend (`apps/backend/src/subscribers/password-reset.ts`).
   - [ ] Connect artwork inquiries, commission requests, and contact submissions in `/api/inquiry` to Resend studio notifications.
   - [ ] Connect newsletter subscription (`NewsletterForm.tsx`) to an email marketing audience / provider.
   - [ ] Implement transactional order confirmation (`order.placed`) and shipping notification (`order.fulfillment_created`) event subscribers.

5. **Pre-Launch Infrastructure & Edge Security:**
   - [ ] Database regional migration: Move Supabase PostgreSQL from Sydney (`aws-0-ap-southeast-2`) to Mumbai (`ap-south-1`) or Singapore (`ap-southeast-1`) to eliminate physical database network latency.
   - [ ] Configure Cloudflare WAF rate limiting on `/auth/*`, `/account`, and `/api/inquiry` (or `@upstash/ratelimit` distributed middleware).
   - [ ] Set up production CI/CD pipelines (Vercel for Storefront, Railway / Fly.io for Backend).

---

## 7. Ready-to-Use Prompts for Claude / Assistant

Copy and paste any of the following prompts into your assistant along with this document:

### Prompt A: Adding Custom Artwork Attributes to Medusa v2 Products
```text
Refer to PROJECT_PROGRESS.md for my Medusa v2 monorepo setup.

I want to extend Medusa products to support art-specific fields:
- artist_name (string)
- medium (string, e.g., "Acrylic on Canvas", "Giclée Print")
- dimensions (string, e.g., "24x36 in")
- certificate_of_authenticity (boolean)
- edition (string, e.g., "Original 1 of 1")
- year_created (integer)

Please show me how to:
1. Create a custom module or extend the product module in Medusa v2.
2. Define the schema and run migrations (using npx medusa db:generate).
3. Expose these fields in the Store API (/store/products).
4. Display them on the artwork detail page in apps/storefront/src/app/artworks/[handle]/page.tsx and in BrowseFilters.tsx.
```

### Prompt B: Setting Up Stripe Payments in Medusa v2 & Next.js Storefront
```text
Refer to PROJECT_PROGRESS.md for my Medusa v2 monorepo setup.

I need to configure Stripe payment processing for both backend and storefront:
1. What Medusa v2 payment module should I add in apps/backend/medusa-config.ts?
2. What environment variables are required in apps/backend/.env and apps/storefront/.env.local?
3. How do I ensure the checkout step in apps/storefront/src/components/CheckoutFlow.tsx loads the Stripe Elements form properly and handles payment confirmation?
```

### Prompt C: Implementing Option C Passwordless / Magic Link at Checkout
```text
Refer to PROJECT_PROGRESS.md and docs/AUTHENTICATION_AND_AUTHORIZATION.md for my Medusa v2 monorepo setup.

I want to implement Option C (Passwordless / Magic Link at Checkout):
1. Create Server Actions requestPasswordlessLink(email, cartId) and verifyPasswordlessToken(token) using signed 10-minute JWTs.
2. Build an editorial Resend email template dispatching the magic link.
3. Implement the /checkout/verify route to validate the token, issue the _medusa_jwt cookie, and atomically link the guest cart via transferCart.
```

### Prompt D: Connecting Studio Inquiries & Commission Forms to Resend
```text
Refer to PROJECT_PROGRESS.md for my Medusa v2 monorepo setup.

I want to connect apps/storefront/src/app/api/inquiry/route.ts to Resend so that whenever a buyer submits a custom commission request, contact message, or artwork consultation, a branded notification email is instantly delivered to the studio team.
```

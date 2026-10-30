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
 │   │       ├── admin/                     # Custom admin dashboard routes & widgets (gallery, journal)
 │   │       ├── api/                       # File-based API endpoints (store/* and admin/*)
 │   │       ├── jobs/                      # Scheduled background jobs
 │   │       ├── modules/                   # Custom Medusa modules (gallery, journal)
 │   │       ├── scripts/                   # Diagnostic scripts (test-resend.ts, test-r2-upload.ts)
 │   │       ├── subscribers/               # Event subscribers (password-reset.ts via Resend)
 │   │       ├── workflows/                 # Business logic workflows and steps
 │   │       └── ...
 │   │
 │   └── storefront/                        # Customer-Facing Next.js Storefront (@dtc/storefront)
 │       ├── next.config.js                 # Next.js config (Turbopack root, aliases, CSP, R2 remote patterns)
 │       ├── .env.local                     # Storefront environment variables
 │       ├── public/                        # Static imagery (hero-bg, collection thumbnails, about assets)
 │       ├── src/
 │       │   ├── app/                       # App Router routes:
 │       │   │   ├── page.tsx               # Curated editorial gallery homepage (ISR revalidate = 60)
 │       │   │   ├── artworks/              # Artwork catalog & [handle] detail pages (ISR revalidate = 60)
 │       │   │   ├── collections/           # Curated collection overviews & single collection pages
 │       │   │   ├── gallery/               # Editorial visual exhibition & artwork grid
 │       │   │   ├── journal/               # Editorial studio articles & [slug] pages
 │       │   │   ├── about/                 # Artist statement & studio background
 │       │   │   ├── commissions/           # Bespoke commission inquiry request workflow
 │       │   │   ├── contact/               # Studio contact form
 │       │   │   ├── shipping/              # Shipping, handling, care & return policies
 │       │   │   ├── saved/                 # Saved / Wishlist gallery
 │       │   │   ├── cart/                  # Dedicated cart page (dynamic)
 │       │   │   ├── checkout/              # Seamless guest / customer checkout flow (dynamic)
 │       │   │   ├── account/               # Customer account portal, profile & order history
 │       │   │   ├── login/                 # Dedicated customer sign-in route
 │       │   │   ├── register/              # Customer account creation route
 │       │   │   ├── forgot-password/       # Password reset request route
 │       │   │   ├── reset-password/        # Password reset confirmation route
 │       │   │   ├── verify-email/          # Email verification status notice
 │       │   │   ├── auth/callback/         # Auth verification code exchange route
 │       │   │   ├── order/                 # Order confirmation & status (dynamic)
 │       │   │   ├── api/inquiry/           # Commission & artwork inquiry handler
 │       │   │   ├── api/revalidate/        # On-demand ISR revalidation handler
 │       │   │   ├── globals.css            # Custom gallery design tokens & typography
 │       │   │   └── layout.tsx             # Root layout with Header & Footer
 │       │   ├── components/                # Modular gallery components (Header, HeaderNav, HeaderActions,
 │       │   │   │                          # CartDrawer, MobileMenu, PromoBanner, ArtworkGrid, BrowseFilters,
 │       │   │   │                          # livinIcons, SaveButton, SavedWorks, InquiryForm, Footer, RecentlyAddedSection)
 │       │   │   └── auth/                  # Authentication UI forms (LoginForm, RegisterForm, ForgotPasswordForm,
 │       │   │                              # ResetPasswordForm, VerifyEmailNotice, AccountDashboard)
 │       │   └── lib/                       # Medusa client, Supabase auth & security services
 │       │       ├── medusa.ts              # Medusa JS SDK client instance
 │       │       ├── config.ts              # Site metadata & navigation configuration
 │       │       ├── format.ts              # Currency & dimension formatting helpers
 │       │       ├── saved.ts               # LocalStorage wishlist state helper
 │       │       ├── security/              # Rate limiting & brute-force protection
 │       │       ├── supabase/              # Supabase SSR client, server & middleware helpers
 │       │       ├── validation/            # Zod validation schemas for auth & forms
 │       │       └── data/                  # In-memory TTL cached fetchers (catalog, cart, customer, password-reset)
 │       └── package.json
 │
 ├── docs/                                  # Deep-dive architecture and performance specifications
 │   ├── AUTHENTICATION_AND_AUTHORIZATION.md# Complete auth lifecycle, Option C magic link spec & security guarantees
 │   ├── PERFORMANCE_AND_CACHING.md         # Storefront latency analysis, root cause, in-memory cache & ISR benchmarks
 │   └── medusa-gallery-feature.md          # Medusa v2 gallery module & exhibition grid architecture
 ├── supabase/                              # Supabase configurations & database migrations
 │   └── migrations/                        # SQL migrations (01_profiles_and_rls.sql)
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
| **Trade Program Admin** | `http://localhost:9000/app/trade-applications` | **OPERATIONAL** | Review, filter, approve and reject trade applications |
| **Storefront Trade Page** | `http://localhost:8000/trade` | **HEALTHY (200 OK)** | Trade Program editorial showcase & modal application form |
| **Profile Trade Status** | `http://localhost:8000/account` | **HEALTHY (200 OK)** | Live Trade Program tab with status badges and privileges |

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

16. **Medusa v2 Gallery Feature Module & Editorial Exhibition Experience (Branch `feature/r2-file-storage`):**
    - **Custom Medusa v2 Gallery Module:** Created custom module at `apps/backend/src/modules/gallery` with `GalleryItem` data model (title, description, image_url, dimensions, medium, year, is_featured, display_order, metadata) using Medusa's DML and `MedusaService`. Registered module in `medusa-config.ts`.
    - **Database Migration:** Generated and executed migration `Migration20261025060751` creating PostgreSQL table `gallery_item` with indexes on `is_featured`, `display_order`, and soft delete support.
    - **Transactional Workflows:** Built `createGalleryItemWorkflow`, `updateGalleryItemWorkflow`, `deleteGalleryItemWorkflow`, and `updateGalleryLayoutWorkflow` ensuring transactional consistency and automatic rollback.
    - **Admin & Store API Endpoints:** Developed authenticated admin routes (`GET /admin/gallery`, `POST /admin/gallery`, `POST /admin/gallery/layout`, `GET /admin/gallery/:id`, `POST /admin/gallery/:id`, `DELETE /admin/gallery/:id`) and public store route (`GET /store/gallery`).
    - **Admin Dashboard UI:** Created interactive gallery management screen (`apps/backend/src/admin/routes/gallery/page.tsx`) with visual masonry preview, drag-and-drop order updates, and full CRUD modal.
    - **Storefront Editorial Exhibition Page:** Built `/gallery` (`apps/storefront/src/app/gallery/page.tsx` & `GalleryGrid.tsx`) with responsive CSS columns masonry grid, category and medium filter tabs, full-screen image lightbox modal, keyboard navigation (`Esc`, `ArrowLeft`, `ArrowRight`), and on-demand ISR revalidation handler (`/api/revalidate`). Integrated Gallery link across `HeaderNav`, `MobileMenu`, and `Footer`.
    - **Specification & Documentation:** Documented complete architectural blueprint in `docs/medusa-gallery-feature.md`.

17. **Storefront Authentication System & Dual Identity Integration (Medusa v2 + Supabase Auth):**
    - **Architecture & Dual Provider Strategy:** Engineered an editorial gallery authentication suite integrating Medusa v2 customer sessions alongside optional Supabase Auth SSR for OAuth and email verification (`@supabase/ssr`, `@supabase/supabase-js`, `zod`).
    - **Dedicated Authentication Routes:** Implemented clean App Router routes for customer identity management:
      - `/login`: Clean editorial sign-in form with `?next=` redirection and session cookie issuance (`_medusa_jwt`).
      - `/register`: Account registration with first name, last name, email, password, and marketing opt-in flag.
      - `/forgot-password`: Password reset request form with generic anti-enumeration success messaging.
      - `/reset-password`: Token-based password reset confirmation form with real-time complexity validation.
      - `/verify-email`: Branded notice screen handling pending verification, token success, and expired link recovery.
      - `/auth/callback`: Server-side code exchange route handler for email confirmation and magic links.
    - **Modular Form Components:** Built bespoke fine-art styled UI components under `apps/storefront/src/components/auth/`: `LoginForm`, `RegisterForm`, `ForgotPasswordForm`, `ResetPasswordForm`, `VerifyEmailNotice`, and `AccountDashboard`.
    - **Security & Rate Limiting:** Built in-memory sliding window rate limiter in `apps/storefront/src/lib/security/rate-limit.ts` guarding authentication endpoints against brute-force attacks and credential stuffing.
    - **Schema Validation & Password Rules:** Implemented strict Zod schemas in `apps/storefront/src/lib/validation/auth.ts` enforcing 8+ character passwords with uppercase, lowercase, and numeric requirements.
    - **Supabase Database Schema & RLS:** Authored `supabase/migrations/01_profiles_and_rls.sql` establishing `public.profiles` table with row-level security (RLS) policies and automatic trigger on `auth.users` insertion.
    - **Guest Cart Preservation & Checkout Sync:** Wired customer authentication directly into cart actions (`transferCart` in `customer.ts`), preserving guest cart items when customers sign in and auto-prefilling customer details in checkout.
    - **Navigation & Header State Sync:** Updated `Header.tsx`, `HeaderActions.tsx`, and `MobileMenu.tsx` to dynamically query customer sessions, displaying customer initials/name and providing one-click sign out.
    - **Testing & Documentation:** Created test suite `apps/storefront/src/__tests__/auth.test.js` validating authentication logic and input validation; updated `README.md` and `.env.example` with comprehensive setup checklists and manual test instructions.

18. **Medusa v2 Payment Session Initiation Compatibility Fix:**
    - **Root Cause:** Encountered TypeScript compiler error `TS2353: Object literal may only specify known properties, and 'context' does not exist in type 'StoreInitializePaymentSession'` in `apps/storefront/src/lib/data/cart.ts:L329`. In Medusa v2 SDK, the request payload interface expects `provider_id: string` and optional `data?: Record<string, unknown>`, whereas older callers and v1 patterns passed `context`.
    - **Resolution:** Updated `initiatePaymentSession()` in `apps/storefront/src/lib/data/cart.ts` to map `sessionData = data.data ?? data.context` and pass `{ provider_id: data.provider_id, ...(sessionData ? { data: sessionData } : {}) }`. This conforms strictly to the `StoreInitializePaymentSession` type while retaining seamless backward-compatibility for callers passing either key.

19. **Medusa v2 Trade Program Module & Admin Panel Integration:**
    - **Custom Medusa v2 Trade Module:** Created custom module at `apps/backend/src/modules/trade` with `TradeApplication` model (`name`, `email`, `company`, `role`, `phone`, `website`, `message`, `status: ["pending", "approved", "rejected"]`) using `@medusajs/framework/utils` DML and `MedusaService`. Registered module in `apps/backend/medusa-config.ts`.
    - **Database Migration:** Generated and applied migration `Migration20261025141927.ts` via `npx medusa db:generate trade` and `npx medusa db:migrate`, persisting trade applications to Supabase PostgreSQL.
    - **Storefront & Admin API Routes:**
      - `POST /store/trade-applications`: Public submission endpoint with publishable key authentication and Zod schema validation (`PostTradeApplicationSchema`) requiring valid email and name, with role, company, phone, website, and message.
      - `GET /admin/trade-applications`: Authenticated admin listing route returning applications ordered newest first with optional `?status=` filtering and total counts.
      - `POST /admin/trade-applications/:id`: Authenticated admin route for updating application status (`approved`, `rejected`, `pending`) with Zod validation.
    - **Medusa Admin Dashboard UI:** Built dedicated administrative screen at `apps/backend/src/admin/routes/trade-applications/page.tsx` with `defineRouteConfig({ label: "Trade Applications", icon: BuildingStorefront })`. Features real-time TanStack Query data fetching, status filtering dropdown, application count badge, responsive data table, expandable message drawer, and instant one-click **Approve** and **Reject** mutation buttons with toast alerts.
    - **Storefront Trade Program Landing Page:** Built `/trade` and `/trade-program` (`TradePageContent.tsx`) showcasing trade disciplines (Interior Designers, Real Estate Developers, Architects), advisory process steps (Meet, Artwork Selection, Details), and `TradeApplicationModal.tsx` submitting directly to `/store/trade-applications` via Medusa JS SDK client with loading states, error handling, and success confirmation.

20. **Customer Account & Profile Trade Application Status Integration:**
    - **Storefront API Endpoint (`GET /store/trade-applications`):** Implemented store route supporting customer authentication (`Bearer` token) and email lookups (`?email=...`) returning the applicant's latest application status, full submission metadata, and application history.
    - **Server Data Helper:** Created `apps/storefront/src/lib/data/trade.ts` with `getCustomerTradeApplication(email)` to securely query trade application records during server rendering.
    - **Dedicated Account Dashboard Tab:** Extended `AccountDashboard.tsx` (`/account`) with a prominent **Trade Program** navigation tab featuring real-time status pill badges:
      - 🟢 **Approved / Active Member:** Displays verified trade membership banner, member privileges (trade discount tier, dedicated advisor moodboards, custom sizing, white-glove delivery), application details summary, and direct link to explore catalog.
      - 🟡 **Pending Review:** Displays active review status, submission date, applicant and studio info, and advisory desk contact details for expedited project timelines.
      - 🔴 **Not Approved:** Informs applicant and provides an instant one-click **Re-apply** modal.
      - ⚪ **Not Enrolled:** Displays an invitation card highlighting trade advantages with an **Apply for Trade Program** action opening the modal with prefilled customer details.
    - **Profile Overview & Localized Profile Integration:** Added a Trade Program Membership summary card inside the *Profile & Preferences* tab in `AccountDashboard.tsx` and in `apps/storefront/src/app/[countryCode]/(main)/account/@dashboard/profile/page.tsx`.

21. **Custom Commission Module (Next.js + Medusa v2 + Cloudflare R2):**
    - **Custom Medusa v2 Commission Module:** Created `Commission` and `CommissionMessage` models in `apps/backend/src/modules/commission/` using `@medusajs/framework/utils` DML. Supports lifecycle statuses (`new` -> `in_discussion` -> `quoted` -> `accepted` -> `converted`, plus `rejected`, `cancelled`), customer ID indexing, quote pricing, currency code, and JSON reference image metadata. Registered module in `medusa-config.ts`.
    - **Database Migration:** Generated and applied migration `Migration20261025154731.ts` creating `commission` and `commission_message` tables with indexes on Supabase PostgreSQL.
    - **Direct Cloudflare R2 Integration:** Built `apps/backend/src/lib/r2.ts` with S3-compatible client generating short-lived presigned PUT URLs for browser direct uploads and short-lived presigned GET URLs for secure, private reference image viewing.
    - **Store & Admin API Routes:**
      - `POST /store/commissions/upload-url`: Protected upload link generator validating MIME types (`image/jpeg`, `image/png`, `image/webp`), 10MB file limit, and key path isolation (`commissions/${customerId}/...`).
      - `POST /store/commissions` & `GET /store/commissions`: Customer commission submission with image ownership validation and list fetching with presigned image URLs.
      - `GET /store/commissions/:id`, `POST /store/commissions/:id/accept`, `POST /store/commissions/:id/messages`: Single commission detail, one-click quote acceptance, and client negotiation messages.
      - `GET /admin/commissions` & `GET /admin/commissions/:id`: Admin listing with customer profile resolution, status and text search filtering, and image presigned previews.
      - `POST /admin/commissions/:id` & `POST /admin/commissions/:id/messages`: Admin status updates, quote pricing inputs, and negotiation message dispatch.
      - `POST /admin/commissions/:id/convert`: Converts accepted commissions into Medusa draft orders.
    - **Atomic Conversion Workflow:** Implemented `apps/backend/src/workflows/convert-commission-to-order.ts` using `@medusajs/framework/workflows-sdk` and `createOrderWorkflow` with `OrderStatus.DRAFT`, `is_draft_order: true`, unit price override, and double-conversion guards.
    - **Admin Dashboard UI:** Created administrative interface at `apps/backend/src/admin/routes/commissions/page.tsx` with sidebar navigation (`Sparkles` icon), real-time TanStack query fetching, search/filter table, reference image gallery preview, quote & status manager, discussion thread, and Convert to Order modal.
    - **Storefront Client UI & Account Tab:**
      - Upgraded `/commissions` with editorial 3-step process cards and `CommissionRequestForm.tsx` supporting drag-and-drop R2 uploads with live progress.
      - Extended `/account` (`AccountDashboard.tsx`) with a dedicated **Commissions** tab, status timeline tracker, quote acceptance card with INR formatting, and two-way studio chat.

22. **Medusa v2 Feedback & Bug Report System:**
    - **Custom Medusa v2 Feedback Module:** Created `apps/backend/src/modules/feedback/` with `Feedback` model (`title`, `description`, `type: ["bug", "feedback", "feature_request", "other"]`, `status: ["open", "in_progress", "resolved", "closed"]`, `priority: ["low", "medium", "high", "critical"]`, `email`, `page_url`, `user_agent`, `metadata`) using `@medusajs/framework/utils` DML. Registered module in `apps/backend/medusa-config.ts`.
    - **Database Migration:** Generated and applied migration `Migration20261026040855.ts` creating the `feedback` table on Supabase PostgreSQL.
    - **Store & Admin API Routes:**
      - `POST /store/feedback`: Public customer feedback submission endpoint with publishable key and Zod validation (`PostStoreFeedbackSchema`).
      - `GET /admin/feedback`: Admin feedback listing route supporting status/type filtering, search query, pagination, and sorting.
      - `GET /admin/feedback/:id`: Single feedback report lookup with complete metadata.
      - `POST /admin/feedback/:id`: Admin feedback status and priority updates with audit trail.
    - **Medusa Admin Dashboard UI:** Built dedicated administrative screen at `apps/backend/src/admin/routes/feedback/page.tsx` with sidebar navigation (`ChatBubbleLeftRight` icon), real-time status and priority badges, search filter, feedback detail drawer, and status mutation actions.
    - **Storefront Client Floating Widget:** Added floating feedback widget (`FeedbackWidget.tsx`) mounted in `Footer.tsx` with modal dialog, category selectors, automatic `page_url` and `user_agent` capture, validation, loading spinner, and success acknowledgment.

23. **LITA First-Load Intro Animation & Shared-Element Navbar Transition ("Livin In The Art"):**
    - **Shared-Element Motion Architecture:** Built creative first-load preloader and seamless landing animation into the navbar logo using GSAP Core + Flip plugin.
    - **Brand Identity & Acronym Staging:** Starts with full-screen gallery canvas (`#F7F3EC` warm cream, `#111111` deep ink, `100dvh`) centered on the brand acronym **"Lita"**. At 600ms, the full name **"Livin In The Art"** reveals with a masked, staggered slide-up animation (`power3.out`).
    - **True Shared-Element Landing:** The revealed full name **"Livin In The Art"** scales down and glides across the viewport to merge into the top-left navbar logo slot, calculated at runtime via `getBoundingClientRect()` with zero visual jump. Real navbar logo swaps visibility in the exact same frame.
    - **Instant Pre-Paint Anti-Flash Engine:** Added an inline synchronous `<script>` and `<style>` in `apps/storefront/src/app/layout.tsx` `<head>`:
      - First visit / `?intro=1`: Server-rendered overlay is immediately present in the initial HTML document; body scroll is locked (`overflow: hidden !important`) before first paint so the page never flashes.
      - Repeat visits in same session: Detects `sessionStorage.getItem("lita-intro-seen") === "1"` and immediately applies `.intro-done` to hide the overlay (`display: none !important`) before paint.
    - **Display Typography:** Integrated `Cormorant_Garamond` via `next/font/google` with variable `--font-display` and mapped `fontFamily.display` in `tailwind.config.ts` and `tailwind.config.js`.
    - **Files Created:** `components/intro/IntroProvider.tsx`, `components/intro/IntroLoader.tsx`, `components/layout/Navbar.tsx`, `hooks/useIntroReady.ts`.
    - **Failsafe & Edge Cases:** 2.5s failsafe timer, fallback DOM query (`document.getElementById("nav-logo")`), reduced motion respect (`prefers-reduced-motion: reduce`), and `?intro=1` / `?replay=1` URL query parameter for manual replaying.

---

## 6. Current Roadmap & Next Steps

1. **Payment Gateway Integration (Razorpay - India / INR Only):**
   - [x] Custom Razorpay payment provider module (`apps/backend/src/modules/razorpay/service.ts`, provider ID `pp_razorpay_razorpay`) with INR currency enforcement and paise math helpers (`toPaise`, `fromPaise`).
   - [x] Hardened `authorizePayment`: timing-safe HMAC signature verification (`razorpay_order_id|razorpay_payment_id`), server-authoritative Razorpay API verification (`client_.payments.fetch`) for amount, INR currency, order ID match, and authorized/captured status.
   - [x] Anti-replay attack prevention: queries Medusa payment module to reject reused `razorpay_payment_id` tokens across different sessions.
   - [x] Strict session data protection in `updatePayment`: strips client-supplied amounts/order IDs, preserving server-calculated paise and Razorpay order references.
   - [x] Error handling & observability: `capturePayment` throws `MedusaError(PAYMENT_AUTHORIZATION_ERROR)` on failure; `retrievePayment` and `getPaymentStatus` log errors with payment IDs (never secrets).
   - [x] Fail-closed secrets: `apps/backend/medusa-config.ts` requires real credentials, gating mock fallbacks behind explicit `ALLOW_DEV_PAYMENT_PLACEHOLDERS=true`.
   - [x] Authoritative webhook handler (`/hooks/payment/pp_razorpay_razorpay`): validates raw-body HMAC, logs structured reason for every `NOT_SUPPORTED` path without leaking secrets, maps `payment.captured` and `order.paid` to `PaymentActions.SUCCESSFUL`, and documents unhandled refund events.
   - [x] Pay-then-close-tab cart recovery: `apps/backend/src/subscribers/razorpay-payment-recovery.ts` and `apps/backend/src/workflows/reconcile-razorpay-order.ts` automatically reconcile and complete abandoned carts upon receiving webhook confirmations.
   - [x] Storefront payment UI & flow: Razorpay as exclusive payment provider for India region; shared `RAZORPAY_PROVIDER_ID` constant; failure recovery message with duplicate-order prevention.
   - [x] Unit test suite: 40 tests covering signature verification, replay protection, error handling, data protection, and webhook routing (`razorpay-provider.unit.spec.ts`).
   - [ ] **Remaining Go-Live Items:**
     - [ ] Complete Razorpay business KYC and activate Live mode in Razorpay Dashboard.
     - [ ] Enable **Auto-Capture** in Razorpay Dashboard (**Settings** -> **Payment Capture**).
     - [ ] Configure live mode API keys (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`).
     - [ ] Configure live webhook endpoint (`https://<domain>/hooks/payment/pp_razorpay_razorpay`) with `RAZORPAY_WEBHOOK_SECRET` for `payment.authorized`, `payment.captured`, `payment.failed`, `order.paid`.
     - [ ] Small live test transaction (₹1) and refund verification via Medusa Admin.

2. **Custom Backend Artwork Attributes & Admin Extensions:**
   - [ ] Extend Medusa product entity / create custom module for art attributes: `artist_name`, `medium`, `dimensions`, `certificate_of_authenticity`, `edition`, `year_created`.
   - [ ] Generate and apply database migrations (`npx medusa db:generate`, `npx medusa db:migrate`).
   - [ ] Build custom admin widgets under `apps/backend/src/admin/widgets/` for easy metadata editing in the Medusa Admin Dashboard.
   - [ ] Expose metadata in `/store/products` and wire dynamically to artwork detail pages (`artworks/[handle]/page.tsx`) and filter bar (`BrowseFilters.tsx`).

3. **Storefront Authentication System & Low-Friction Verification:**
   - [x] Dedicated Next.js Storefront authentication routes (`/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/auth/callback`).
   - [x] Dual identity provider integration: Medusa v2 customer accounts with session cookies (`_medusa_jwt`) + Supabase Auth SSR support (`@supabase/ssr`).
   - [x] In-memory sliding window rate limiting (`rate-limit.ts`) and Zod schema validation (`validation/auth.ts`).
   - [x] Atomic guest cart merge & customer transfer on login (`transferCart` in `customer.ts`).
   - [x] Database migration for Supabase user profiles table and RLS policies (`01_profiles_and_rls.sql`).
   - [ ] Implement short-lived signed magic link request and verification actions (`requestPasswordlessLink`, `verifyPasswordlessToken`) with Resend dispatch at `/checkout`.
   - [ ] Wire seamless magic link verification directly into `/checkout` contact step with atomic cart transfer (`transferCart`), eliminating registration friction while preserving guest carts.

4. **Trade Program & Design Advisory Workflow:**
   - [x] Custom Medusa v2 `trade` module with PostgreSQL persistence and DML migration.
   - [x] Storefront Trade Program landing page (`/trade`, `/trade-program`) with editorial role selector.
   - [x] Medusa Admin Panel route (`/app/trade-applications`) with filtering, message drawer, and instant Approve/Reject actions.
   - [x] Customer Profile Trade Program tab & real-time application status badges in `AccountDashboard.tsx` and localized profile route.
   - [ ] Automated email notification upon trade application submission and status updates (approval/rejection) via Resend.
   - [ ] Link approved trade accounts to dedicated Medusa Customer Groups with automatic trade tier discount pricing.

5. **Automated Notification & Email Workflows:**
   - [x] Password reset emails via Resend (`apps/backend/src/subscribers/password-reset.ts`).
   - [ ] Connect artwork inquiries, commission requests, and contact submissions in `/api/inquiry` to Resend studio notifications.
   - [ ] Connect newsletter subscription (`NewsletterForm.tsx`) to an email marketing audience / provider.
   - [ ] Implement transactional order confirmation (`order.placed`) and shipping notification (`order.fulfillment_created`) event subscribers.

6. **Pre-Launch Infrastructure & Edge Security:**
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

### Prompt B: Verifying Razorpay Live Mode & Webhook Reconciliation
```text
Refer to PROJECT_PROGRESS.md and docs/razorpay.md for my Medusa v2 monorepo setup.

I need to prepare Razorpay for production go-live:
1. Verify live mode credentials in apps/backend/.env and apps/storefront/.env.local.
2. Ensure auto-capture is enabled in the Razorpay Dashboard.
3. Configure the live webhook URL (https://<domain>/hooks/payment/pp_razorpay_razorpay) and test the pay-then-close-tab cart recovery workflow.
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

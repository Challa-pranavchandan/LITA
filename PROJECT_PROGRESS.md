# LITA — Project Status & Context Guide for Claude

> **Last audited:** 30 Oct 2026. Updated with CP0 (clean baseline) and CP3 (notification emails) completion.
> Sections 1-5 are the preserved history. **Section 6 onward is rewritten** with the production-readiness audit, checkpoints and the master TODO list.

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

## 3. Local Development Status (No Deployed Environment Yet)

> [!NOTE]
> The table below reflects status on a local development machine (`localhost:9000` / `localhost:8000`) connected to remote Supabase and Cloudflare R2 services. **There is no deployed staging or production environment yet.** Staging/production deployment pipelines, hosting infrastructure, and regional database migration are tracked as blockers in Section 6.

| Component | Local Port / Endpoint | Local Status | Notes |
| :--- | :--- | :--- | :--- |
| **Backend API** | `http://localhost:9000` | **HEALTHY (200 OK)** | Local server; `GET /health` returns `OK` |
| **Admin Dashboard** | `http://localhost:9000/app` | **READY** | Local browser SPA; local admin credentials configured |
| **Storefront** | `http://localhost:8000` | **HEALTHY (200 OK)** | Local Next.js dev server; App Router routes (`/`, `/artworks`, etc.) |
| **Database** | Supabase PostgreSQL | **CONNECTED** | Remote pooled connection via SSL (`aws-0-ap-southeast-2.pooler.supabase.com:6543`) |
| **Store Regions** | `GET /store/regions` | **OPERATIONAL** | Returns configured store regions (India / INR) |
| **Cloudflare R2 Storage** | S3 API Endpoint | **OPERATIONAL** | Verified via `npm run test:r2` diagnostic upload script |
| **Trade Program Admin** | `http://localhost:9000/app/trade-applications` | **OPERATIONAL** | Local admin review, filter, approve and reject actions |
| **Storefront Trade Page** | `http://localhost:8000/trade` | **HEALTHY (200 OK)** | Local storefront Trade Program showcase & modal form |
| **Profile Trade Status** | `http://localhost:8000/account` | **HEALTHY (200 OK)** | Local customer Trade Program tab with status badges |

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
    - **Task 5 — Rate Limiting (POSTPONED / PARTIALLY IMPLEMENTED):**
      Evaluated application-level vs infrastructure-level rate limiting. Distributed rate limiting across the storefront, inquiries, and backend APIs is postponed to the infrastructure / edge deployment phase (e.g. Cloudflare WAF rate limiting rules or Upstash Redis distributed sliding window in Next.js middleware). However, an in-process in-memory sliding window limiter was built in `apps/storefront/src/lib/security/rate-limit.ts` (see Item 17 below) which guards the `login` and `register` server actions only.
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
    - **Security & Rate Limiting:** Built in-memory sliding window rate limiter in `apps/storefront/src/lib/security/rate-limit.ts` (15-minute window, 5 attempts max) guarding the `login` and `register` server actions in `apps/storefront/src/lib/data/customer.ts`. Note: this in-memory limiter guards only `login` and `register`; it does not protect other endpoints (such as `/forgot-password`, `/reset-password`, contact forms, trade applications, inquiries, or backend APIs), and edge/distributed rate limiting remains postponed.
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
    - **Custom Medusa v2 Feedback Module:** Created `apps/backend/src/modules/feedback/` with `Feedback` model (`id`, `type: ["feedback", "bug"]`, `message`, `email` [nullable], `page_url` [nullable], `image_url` [nullable], `status: ["new", "reviewed", "resolved"]` defaulting to `"new"`) using `@medusajs/framework/utils` DML. Registered module in `apps/backend/medusa-config.ts`.
    - **Database Migration:** Generated and applied migration `Migration20261026102431.ts` creating the `feedback` table on Supabase PostgreSQL.
    - **Store API Routes & File Upload:**
      - `POST /store/feedback`: Public feedback submission endpoint accepting `type` (`feedback` | `bug`), `message`, optional `email`, `page_url`, honeypot `website`, and optional screenshot upload via Multer buffer saved to Medusa File Service (`image_url`).
    - **Storefront Client Floating Widget:** Added floating feedback widget (`FeedbackWidget.tsx`) mounted in `Footer.tsx` with modal dialog, category toggle (`feedback` / `bug`), message input, screenshot attachment, and submit action.

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

24. **Medusa v2 Notification Module and Transactional Emails — Resend Provider (CP3):**
    - **Notification Module Integration:** Registered `@medusajs/medusa/notification` in `apps/backend/medusa-config.ts` backed by a custom Resend notification provider module at `apps/backend/src/modules/resend/` (service + channel `email`). The provider calls the Resend REST API; falls back to console logging in local dev when `RESEND_API_KEY` is absent.
    - **Order Confirmation Email (`order.placed`):** Subscriber at `apps/backend/src/subscribers/order-placed.ts` sends an editorial Cormorant Garamond branded order summary (item list, INR totals, shipping address) to the customer email on every `order.placed` event.
    - **Shipment Dispatch Email (`order.fulfillment_created`):** Subscriber at `apps/backend/src/subscribers/order-fulfillment-created.ts` sends a branded dispatch notification with fulfillment tracking details.
    - **Trade Application Status Email (`trade_application.status_changed`):** Subscriber at `apps/backend/src/subscribers/trade-application-status-changed.ts` sends approval / rejection emails reflecting the reviewer's decision.
    - **Commission Status Email (`commission.status_changed`):** Subscriber at `apps/backend/src/subscribers/commission-status-changed.ts` notifies customers on each lifecycle transition (quoted, accepted, converted).
    - **Hardened Logging:** `password-reset.ts` and all new subscribers never log sensitive tokens or reset links when `NODE_ENV === "production"`.
    - **Automated Tests:** Unit test suites added under `apps/backend/src/modules/resend/__tests__` and `apps/backend/src/subscribers/__tests__`.

25. **CP0 — Clean Build Baseline (Fresh-Clone Verification):**
    - **Single Lockfile:** Deleted `apps/storefront/package-lock.json` (package name `art-store`); the root `package-lock.json` is now the sole authoritative lockfile for all npm workspaces.
    - **Build Safety Restored:** Removed `typescript.ignoreBuildErrors: true` and `eslint.ignoreDuringBuilds: true` from `apps/storefront/next.config.js`.
    - **Dead-Code Removal:** Deleted the entire `[countryCode]` App Router tree, `/api/payment-return`, Stripe/PayPal payment provider icons, Medusa onboarding widgets and `lib/data/onboarding.ts`, custom backend stubs, and the unreachable `react-instantsearch` / `instantsearch.js` / `@medusajs/instantsearch-adapter` search stack along with unused `src/modules/`, `src/types/`, and `src/styles/` starter directories.
    - **Dependency Hygiene:** Declared previously missing packages (`clsx`, `@medusajs/icons`, `styled-jsx`, `eslint`, `eslint-config-next`) directly in `apps/storefront/package.json`. Removed `ansi-colors` usage from `check-env-variables.js` (replaced with plain `console` output).
    - **Scripts Added:** Added `lint`, `typecheck`, and `test` scripts to `apps/storefront/package.json`; updated `turbo.json` pipeline with task definitions and `.medusa/**` build outputs.
    - **Global Error Boundary:** Added `apps/storefront/src/app/global-error.tsx` for the App Router, resolving the Next.js fallback-page `useContext` null prerender error caused by a `styled-jsx` / React 19 version conflict.
    - **Backend Workflow Typing:** Fixed `StepResponse` generic types in `apps/backend/src/workflows/reconcile-razorpay-order.ts` and corrected `createServiceZones` argument structure in `apps/backend/src/scripts/seed-india-shipping.ts`.
    - **Exit Test Passed:** `npm ci && npm run lint && npm run test && npm run build` all complete successfully with zero ignored errors from a clean clone.

26. **B1 — Removal of Manual Payment Path (Branch `b1-remove-manual-payment`):**
    - **Storefront Checkout Flow:** Updated `isSupportedProvider` and `providerLabel` in `apps/storefront/src/components/CheckoutFlow.tsx` to strictly restrict `pp_system_default` to non-production environments (`process.env.NODE_ENV !== "production"`). Hides the `"Manual Payment (Pay Offline / Test)"` label and generic `"Place order"` button in production, cleanly displaying the *"Payment isn't switched on..."* notice when no supported provider is enabled.
    - **Server-Side Action & Data Guards:** Created centralized `apps/storefront/src/lib/payment-guard.ts` module with `isRazorpayProvider`, `isSupportedProvider`, and `assertAllowedProvider`. Integrated server-side assertion into `startPayment`, `initiatePaymentSession`, and `placeOrder` in `apps/storefront/src/lib/data/cart.ts` so clients cannot bypass the UI guard. Gated `pp_system_default` in `paymentInfoMap` in `constants.tsx`.
    - **Backend Configuration Safety Script:** Created `apps/backend/src/scripts/check-production-config.ts` (runnable via `npm run check:prod-config`), inspecting all database regions via Medusa Query Graph API and enforcing strictly INR currency and `pp_razorpay_razorpay` provider only, exiting with code 1 if demo regions or unauthorized payment providers exist.
    - **Seed Script Guard:** Verified `apps/backend/src/migration-scripts/initial-data-seed.ts` is guarded with `SEED_DEMO_DATA=true` so EU/EUR demo data and `pp_system_default` never seed against a production database.
    - **Documentation:** Added Section 9 *"Production Checklist: Regions & Payment Providers"* to `docs/razorpay.md`.
    - **Automated Tests:** Created unit test suite in `apps/storefront/src/__tests__/payment-guard.test.js` validating all production and non-production provider acceptance/rejection scenarios (25 tests passing).

27. **B2 — Hardening of ISR Revalidate Endpoint (Revalidate Auth & Secret Guard):**
    - **Constant-Time Verification Utility:** Created `apps/storefront/src/lib/security/revalidate-auth.ts` exporting `verifyRevalidateSecret(provided)`. Enforces minimum 32-character length on `process.env.REVALIDATE_SECRET`, checks for non-empty provided secret string, and uses SHA-256 hashing with `crypto.timingSafeEqual` for constant-time comparison.
    - **Secure POST-Only Route Handler:** Completely removed the `GET` handler in `apps/storefront/src/app/api/revalidate/route.ts` to prevent query secrets from leaking into server access logs and browser histories. Prioritizes the `x-revalidate-secret` request header (falling back to `body.secret` for backwards compatibility), verifies via `verifyRevalidateSecret`, responds with generic 401 on failure, retains cache eviction (`clearCatalogCache`, tags, and paths), and returns a minimal response (`{ ok: true, revalidated: true }`).
    - **Backend Callers Updated:** Updated `apps/backend/src/subscribers/catalog-revalidate.ts` and `apps/backend/src/api/admin/gallery/layout/route.ts` to transmit the revalidation secret via the `x-revalidate-secret` header rather than the JSON body.
    - **Production Startup Guard:** Added `REVALIDATE_SECRET` (min 32 characters) to the production startup guard in `apps/backend/medusa-config.ts` (`NODE_ENV === 'production'`).
    - **Environment Documentation:** Replaced the real-looking secret in `apps/storefront/.env.example` and `.env.template` with `replace-with-32-plus-random-chars` and documented token generation command. Added `REVALIDATE_SECRET` with generator instructions to `apps/backend/.env.example` and `apps/backend/.env.template`.
    - **Automated Tests:** Created unit test suite `apps/storefront/src/__tests__/revalidate-auth.test.js` (9 passing tests) verifying unset env, empty env, short env, missing provided values, wrong values, valid secrets, route POST-only integrity, and regression testing ensuring the previous `undefined === undefined` authentication bypass cannot occur.

---

## 6. Production Readiness Audit (30 Oct 2026)

### 6.1 Verdict

Feature-wise LITA is close to a launchable v1 (catalog, checkout with Razorpay, accounts, commissions, trade, journal, gallery, admin tools). **It is not production-ready yet.** The gaps are mostly in four places: (1) a few security/money-safety holes, (2) missing customer emails, (3) infrastructure that only works on a single dev machine (in-memory events/locks, no CI/CD, no monitoring), (4) legal/tax content for an Indian store.

**Scope decision (confirmed by owner):** India only, INR only, one default region (`in`). Anything built for multiple countries, currencies or languages is dead weight and should be removed, not maintained (see S15).

Status legend: `BLOCKER` = must fix before taking real money. `SHOULD` = fix before public launch. `LATER` = after launch.

| Area | Status | Summary |
| :--- | :--- | :--- |
| Catalog, cart, browsing, ISR | DONE (needs hardening) | Works; dead starter code deleted (CP0) |
| Razorpay payments | BLOCKER | Strong core; manual-payment path, refund no-op, go-live steps and CSP still open |
| Auth & accounts | SHOULD | Works; rate limiting is in-memory only; magic link not built |
| Commissions / Trade / Feedback | BLOCKER | Trade lookup leaks PII by email; commission-to-payment path undefined |
| Email & notifications | DONE (CP3) | Notification module + Resend provider live; order, trade, commission emails sent; studio inbox, newsletter and domain SPF/DKIM pending |
| Security & edge | BLOCKER | Revalidate auth bypass, CSP report-only, no WAF/rate limits |
| Infrastructure & ops | BLOCKER | No Redis modules, no Docker/CI, no monitoring, no backup plan, wrong DB region |
| Build quality & tests | DONE (CP0) | Single lockfile, all imports declared, build/lint/test pass with zero ignored errors |
| Legal, tax, content | BLOCKER | Privacy page names another brand, no GST setup, thin policies |
| SEO & performance | SHOULD | No sitemap/robots wiring, 12 MB unoptimized public images, optimization disabled |

---

### 6.2 BLOCKERS - fix before any real customer pays

**B1. Manual payment can bypass Razorpay. (RESOLVED)**
Resolved across storefront UI, Server Actions, backend configuration scripts, and documentation:
- Storefront UI: `isSupportedProvider` and `providerLabel` in `CheckoutFlow.tsx` allow `pp_system_default` only when `process.env.NODE_ENV !== "production"`. Razorpay is always accepted. In production, manual payment labels and generic place order buttons are omitted.
- Server Actions & Cart: `apps/storefront/src/lib/payment-guard.ts` provides `assertAllowedProvider` and `isRazorpayProvider`. Server actions (`startPayment`, `initiatePaymentSession`, `placeOrder`) reject non-Razorpay providers in production before calling Medusa.
- Backend Safety Script: `apps/backend/src/scripts/check-production-config.ts` (runnable via `npm run check:prod-config`) inspects all regions via Medusa Query Graph API, asserting currency is `inr` and payment provider is `pp_razorpay_razorpay` only, exiting code 1 on violation.
- Seed Guard: `initial-data-seed.ts` is guarded behind `SEED_DEMO_DATA=true`.
- Documentation: Added Section 9 to `docs/razorpay.md`. Verified with 25 passing unit tests.

**B2. Revalidate endpoint can be called without a secret. (RESOLVED)**
Resolved across storefront route, backend subscribers, and configuration guards:
- Constant-time secret verification helper (`apps/storefront/src/lib/security/revalidate-auth.ts`) requiring minimum 32 chars on `REVALIDATE_SECRET` and comparing SHA-256 digests via `crypto.timingSafeEqual`.
- Removed `GET` handler from `apps/storefront/src/app/api/revalidate/route.ts`; requires `x-revalidate-secret` header (or `body.secret` fallback) and returns 401 with generic message on mismatch.
- Backend `catalog-revalidate.ts` subscriber and `gallery/layout/route.ts` send secret via `x-revalidate-secret` header.
- Production startup guard in `apps/backend/medusa-config.ts` enforces `REVALIDATE_SECRET` >= 32 chars.
- Environment files updated with safe placeholders and generator comments.
- 9 unit tests passing in `apps/storefront/src/__tests__/revalidate-auth.test.js`.

**B3. Trade application lookup leaks personal data.**
`GET /store/trade-applications?email=...` (`apps/backend/src/api/store/trade-applications/route.ts`) accepts an unauthenticated email and returns that person's name, phone, company and message. The publishable key is public, so anyone can enumerate. It also fetches only the newest 100 rows and filters in memory, so results go wrong once there are more than 100.
Fix: require customer auth (drop the `?email=` path), filter by email in the query, add rate limiting and validation on `POST`.

**B4. Medusa runs on in-memory infrastructure.**
`.env.example` lists `REDIS_URL`, but `medusa-config.ts` registers no Redis modules. In production that means the in-process event bus (events lost on restart, including the Razorpay webhook recovery subscriber), non-durable workflow runs, and no cross-instance locking (storefront cart completion and webhook recovery can race).
Fix: add Redis event bus, workflow engine, locking and cache modules, set `redisUrl` for sessions, and split server/worker (`workerMode`). Check exact module names against the Medusa 2.21 docs.

**B5. Customers get no emails after paying (RESOLVED — CP3).**
Resolved by integrating the Medusa Notification module (`@medusajs/medusa/notification`) with a custom Resend provider (`src/modules/resend`) in `medusa-config.ts`. Reused editorial branding from `password-reset.ts` (LITA Cormorant Garamond header, `#5f2f3c` brand palette, `#faf8f5` canvas, curated item summaries). Added Medusa subscribers for:
- `order.placed` (`src/subscribers/order-placed.ts`)
- `order.fulfillment_created` (`src/subscribers/order-fulfillment-created.ts`)
- `trade_application.status_changed` (`src/subscribers/trade-application-status-changed.ts`)
- `commission.status_changed` (`src/subscribers/commission-status-changed.ts`)
Hardened `password-reset.ts` and the Resend provider to never log reset links or sensitive tokens in production logs when `RESEND_API_KEY` is missing. Validated with automated unit test suites in `src/modules/resend/__tests__` and `src/subscribers/__tests__`.

**B6. Contact, inquiry and newsletter submissions can vanish.**
`apps/storefront/src/app/api/inquiry/route.ts` only logs to the server console when `INQUIRY_WEBHOOK_URL` is unset, and still returns success. The newsletter form posts to the same route, so signups go nowhere. No rate limit, honeypot or captcha.
Fix: send through Resend (studio inbox) and store in the backend, add Turnstile/hCaptcha plus distributed rate limiting, connect newsletter to a real provider.

**B7. Build safety is switched off and dependencies are undeclared. (RESOLVED — CP0)**
All items in the original blocker have been closed:
- Deleted `apps/storefront/package-lock.json` (the `art-store` lockfile); the single root `package-lock.json` is now authoritative.
- Removed `typescript.ignoreBuildErrors: true` and `eslint.ignoreDuringBuilds: true` from `apps/storefront/next.config.js`.
- Deleted all unreachable and starter code: `[countryCode]` App Router tree, `/api/payment-return`, custom backend stubs, payment provider icons (Stripe, PayPal), onboarding scripts and widgets, unused storefront modules and templates, and the `react-instantsearch` / `instantsearch.js` / `@medusajs/instantsearch-adapter` search stack.
- Declared previously missing packages (`clsx`, `@medusajs/icons`, `styled-jsx`, `eslint`, `eslint-config-next`) in `apps/storefront/package.json`.
- Replaced `ansi-colors` in `check-env-variables.js` with plain `console` output.
- Added `lint`, `typecheck`, and `test` scripts to `apps/storefront/package.json`; wired them into `turbo.json`.
- Fixed every remaining TypeScript and ESLint error; added `apps/storefront/src/app/global-error.tsx` to silence the App Router prerender `useContext` null error caused by a `styled-jsx`/React 19 version mismatch.
- Exit test confirmed: `npm ci && npm run lint && npm run test && npm run build` all pass with zero ignored errors from a fresh clone.

**B8. Razorpay go-live and hardening.**
Already built well (HMAC, API re-verification of amount/currency/order, replay check, webhook recovery). Still open:
- Complete KYC, enable auto-capture, live keys, live webhook with secret, 1 INR live test and refund test (from section 6 of the old roadmap).
- `refundPayment` returns success silently when `razorpay_payment_id` is missing. It should throw, otherwise Medusa can record a refund that never happened.
- `webhook_verified` (which skips the HMAC check) can be supplied by the browser through `initiatePaymentSession` data, because `updatePayment` spreads client data. Razorpay's API check still applies, so exploitation is hard, but only the reconcile workflow should be able to set it. Strip it, and strip client-supplied `razorpay_order_id` in the update path.
- Replay protection uses `listPayments({ data: { razorpay_payment_id } })`. Verify that JSON filter really works against PostgreSQL with an integration test.
- `initiatePayment` does not reject non-INR currencies (only `authorizePayment` does).
- `refund.processed` / `refund.failed` webhooks are ignored, so refunds made in the Razorpay dashboard will not show in Medusa. Document the rule "refund only from Medusa Admin" or add a logging subscriber.
- CSP (see S1) must allow Razorpay before enforcement.

**B9. Legal, tax and policy content.**
- `privacy/page.tsx` says "Uprise Art", uses `hello@example.com`, and claims analytics you do not run.
- Terms (about 2 KB) and shipping (about 1 KB) are too thin: no returns/refund/cancellation timelines, damage-in-transit process, commission terms (deposit, revisions, IP/copyright), or authenticity/COA terms.
- The India region lives in your database (created in Admin), so I could not see its tax setup. The repo only seeds a Europe/EUR region with the generic `tp_system` tax provider. Check in Admin that the India region has the right tax region and rates, and decide with your CA: tax-inclusive pricing, HSN/GST rates, whether you need state-wise CGST/SGST vs IGST, and the invoice format.
- India-specific items usually expected for an online store: seller and grievance officer details, consent wording for personal data, GST invoice on every order. Confirm the exact list with a lawyer.

**B10. Unclear payment path for commissions.**
Accepted commissions become draft orders (`convert-commission-to-order.ts`), but nothing lets the customer pay for a draft order. The guide only says "confirm the draft order or send a payment link". Decide: Razorpay Payment Link, or convert to a normal cart/payment collection, and whether you take an advance.

---

### 6.3 SHOULD - before public launch

**S1. Enforce CSP.** Currently `Content-Security-Policy-Report-Only` with `localhost` entries and `unsafe-eval`/`unsafe-inline`. Add Razorpay hosts (`checkout.razorpay.com` script, `api.razorpay.com` frame/connect, their analytics host), Supabase if used, remove localhost in production, collect reports for a week, then enforce.

**S2. Edge security and rate limiting.** `rate-limit.ts` is in-memory and only guards login and register. On serverless it does almost nothing. Move to Upstash Redis or Cloudflare rules and cover: login, register, password reset, inquiry, contact, feedback, trade, commission upload-url.

**S3. Public upload endpoint.** `POST /store/feedback` accepts an image through multer, trusts the client MIME type only, stores it as public, and has no rate limit. Add magic-byte checks, size limit, rate limit and captcha, or drop image upload. The backend model (`type: feedback|bug`, `message`, `status: new|reviewed|resolved`) also differs from the fields described in section 5 item 22.

**S4. Remove dead starter code.** `/[countryCode]/(main)` and `/[countryCode]/(checkout)` routes, `api/payment-return` (Stripe only), `stripe-wrapper`, PayPal/iDEAL icons, `medusa-cta`, `product-onboarding-cta` and `lib/data/onboarding.ts` (redirects to `localhost:7001`), `store/custom` and `admin/custom` stub routes. The middleware is a no-op, so these duplicate pages are reachable and indexable.

**S5. Search decision.** The repo has `/store/search` middleware, `src/search/*`, and a storefront Instantsearch client (price fields hardcoded to `eur`/`usd`, so INR prices would not be found) but no Meilisearch module in `medusa-config.ts`. Either wire it fully with `inr` only, or delete it.

**S6. Database.** Supabase pooler on port 6543 is transaction mode. Run migrations over the direct/session connection. `DATABASE_EXTRA` uses `rejectUnauthorized: false`; use the provider CA certificate. Move region from Sydney to Mumbai or Singapore (already on the old list). Turn on backups/PITR and test a restore.

**S7. Observability.** Enable `instrumentation.ts` (currently commented out), add Sentry (storefront and backend), uptime check on `/health`, log shipping, and alerts for webhook failures and failed cart completions.

**S8. Deploy pipeline.** No Dockerfile, no CI, no deploy config in the repo. Add GitHub Actions (install, lint, typecheck, unit tests, build), staging environment, preview deploys, migration step in release, and a rollback note.

**S9. Image and page performance.** `images.unoptimized: true`, `public/` is 12 MB including three copies of the hero (`hero-bg.png` 3 MB, `hero-bg.jpg` and `hero-bg-2k.jpg` 1.4 MB each). Use AVIF/WebP, enable optimization (or Cloudflare Images), delete unused copies, set a Lighthouse budget.

**S10. SEO.** `next-sitemap.js` uses `NEXT_PUBLIC_VERCEL_URL` (should be the site URL) and builds its exclude list with `array + array` (string concatenation). Add Product JSON-LD, Open Graph images, canonical URLs, `robots` rules, 404/500 pages (`error.tsx`, `global-error.tsx` do not exist).

**S11. Guest order page.** `getOrder` retrieves `/store/orders/:id` without auth headers. Test as a guest and as a logged-in user to make sure the confirmation page works and cannot be used to read other people's orders.

**S12. Admin access.** Create real admin users, remove any seed/test accounts, restrict `/app` by IP or SSO if possible, and use separate `ADMIN_CORS` / `AUTH_CORS` for production domains only.

**S13. Cookie and session details.** `removeAuthToken` clears the cookie without matching attributes (path, secure); `setPendingCustomer` stores signup fields in a cookie. Review both.

**S15. India-only cleanup.**
- `.env.example`, `.env.template` and README set `NEXT_PUBLIC_DEFAULT_REGION=dk`; change to `in`.
- `initial-data-seed.ts` seeds Europe/EUR/USD with `pp_system_default`. Replace it with an India/INR seed (INR default currency, `in` country, Razorpay provider, tax region) so a fresh database never gets demo EU data.
- Remove the `[countryCode]` route tree, country and language selectors, and region-detection leftovers; one fixed region means simpler URLs and no duplicate pages.
- Remove `noDivisionCurrencies`, EUR/USD helpers and non-INR payment icons/providers.
- Reject any non-INR currency at payment initiation (already planned in B8).

**S14. Secrets hygiene.** `.gitignore` ignores `**/.env.*` but keeps only `.env.example`, so `.env.template` is untracked even though the README tells people to copy it. Keep one template file, rotate all keys that were ever used in dev, add secret scanning.

---

### 6.4 LATER - after launch

- Artwork attributes module (artist, medium, dimensions, COA, edition, year) and admin widgets (still open from the old roadmap).
- Magic link checkout (Option C) and Supabase/Medusa identity cleanup (two identity systems today).
- Trade customer group with automatic discount pricing; trade status emails.
- Analytics and consent banner (if you actually add analytics).
- Integration (HTTP) tests, Playwright end-to-end tests, load test.
- Order tracking page, invoices PDF, return/refund workflow in admin.
- International shipping is out of scope (India only).

---

## 7. Checkpoints (release gates)

Each checkpoint has an exit test. Do not start the next one until the current exit test passes.

| # | Checkpoint | Exit test |
| :--- | :--- | :--- |
| CP0 | Clean baseline | Fresh clone, `npm ci`, `npm run build`, `npm run lint`, `npm test` all pass with zero ignored errors |
| CP1 | Security fixes | B1, B2, B3 closed; manual abuse checks done (no-secret revalidate = 401, anonymous trade lookup = 401, no Manual payment option in production build) |
| CP2 | Payments verified in test mode | Full checkout in Razorpay test mode: success, failure, cancel, pay-then-close-tab recovery, refund from Admin, duplicate payment attempt |
| CP3 | Email and notifications | A test order sends confirmation; shipped, trade and commission emails arrive; inquiry form lands in studio inbox; domain passes SPF/DKIM/DMARC |
| CP4 | Staging environment | Backend + worker + Redis + Postgres (Mumbai/Singapore) + storefront deployed from CI; webhooks reach staging; backup restore tested |
| CP5 | Legal, tax, content | GST/INR region configured and an invoice reviewed by your CA; privacy, terms, returns, shipping pages approved; real products, images and prices loaded |
| CP6 | Go-live dry run | Razorpay live mode on, 1 INR real payment and refund, CSP enforced with no console violations, uptime and error alerts firing in a test |
| CP7 | Launch + hypercare | DNS cut over, 72 hours of monitoring, daily check of failed payments and webhook logs |

---

## 8. Master TODO List

### Done (carried forward)
- [x] Medusa v2 backend + Next.js 15 storefront monorepo
- [x] Catalog, collections, artwork detail, saved works, cart drawer, checkout flow
- [x] Auth hardening (JWT/cookie alignment, secret and CORS startup guards, password policy, security headers)
- [x] Password reset via Resend
- [x] Cloudflare R2 file storage + commission presigned uploads
- [x] Journal, Gallery, Trade, Commission, Feedback modules with admin UI
- [x] Razorpay provider with HMAC, API re-verification, replay check, webhook recovery workflow, 40 unit tests
- [x] Intro animation, About page redesign, performance caching (ISR + in-memory TTL)
- [x] Fail-closed Razorpay credentials in `medusa-config.ts`
- [x] **CP0 — Clean build baseline:** single lockfile, all imports declared, dead starter code deleted, `lint`/`typecheck`/`test` scripts wired, build/lint/test pass with zero ignored errors (section 5 item 25)
- [x] **CP3 — Transactional emails:** Notification module + custom Resend provider, order placed and fulfilled emails, trade and commission status emails, hardened production logging (section 5 item 24)
- [x] **B1 — Remove manual payment path:** Storefront UI + server-side action guards, check:prod-config backend validation script, SEED_DEMO_DATA guard, 25 unit tests passed (section 5 item 26)
- [x] **B2 — Hardening ISR revalidate endpoint:** constant-time verification, header-preferred POST-only route, Medusa production startup guard, backend subscriber header auth, 9 unit tests passed (section 5 item 27)

### CP0 - Clean baseline (COMPLETE — exit test passed)
- [x] Remove `apps/storefront/package-lock.json`; keep the single root lockfile
- [x] Declare or delete every undeclared import (`@headlessui/react`, `react-instantsearch`, `instantsearch.js`, `@medusajs/instantsearch-adapter`, `@stripe/*`, `ansi-colors`, plus hoisted ones)
- [x] Turn off `ignoreBuildErrors` and `ignoreDuringBuilds`, fix all errors
- [x] Add `lint`, `typecheck`, `test` scripts to the storefront; wire storefront node tests
- [x] Delete dead starter code (S4): `[countryCode]` route tree, payment-return, onboarding widgets, Stripe/PayPal icons, search stack
- [x] Search decision (S5): removed `react-instantsearch` / `instantsearch.js` / `@medusajs/instantsearch-adapter` (not wired, not INR-aware)
- [x] India-only cleanup (S15, partial): `[countryCode]` route tree deleted; `NEXT_PUBLIC_DEFAULT_REGION` set to `in` in storefront `.env.example`
- [ ] India seed instead of Europe seed in `initial-data-seed.ts` (S15 — still open)
- [ ] Merge `.env.template` and `.env.example` into one tracked file per app (S14 — still open)

### CP1 - Security fixes
- [x] Remove/gate `pp_system_default` (B1)
- [x] Fix revalidate auth, drop GET, rotate secret, add to backend env (B2)
- [ ] Require auth on trade lookup and filter in query (B3)
- [ ] Strip `webhook_verified` and client `razorpay_order_id` from client data (B8)
- [ ] Make `refundPayment` throw when no payment id (B8)
- [ ] Reject non-INR in `initiatePayment` (B8)
- [ ] Block reset-link console logging in production
- [ ] Zod validation on `POST /store/feedback`; file magic-byte check (S3)
- [ ] Distributed rate limiting on all public forms and auth routes (S2)
- [ ] Captcha on contact, inquiry, trade, feedback
- [ ] Revisit cookie attributes (S13)

### CP2 - Payments
- [ ] Integration test for replay check against real PostgreSQL
- [ ] Test matrix in Razorpay test mode: success, failed, cancelled, closed tab, double click, amount change after order creation, expired order
- [ ] Verify webhook retries are idempotent (same event twice)
- [ ] Decide refund policy and document "refund only from Medusa Admin"
- [ ] Decide commission payment path (payment link or cart) and build it (B10)
- [ ] Add Razorpay hosts to CSP and test in report-only first (S1)

### CP3 - Email and notifications (PARTIALLY COMPLETE — see B5)
- [x] Medusa Notification module + custom Resend provider (`apps/backend/src/modules/resend/`)
- [x] Order placed email (`order.placed` subscriber)
- [x] Order fulfilled / shipped email (`order.fulfillment_created` subscriber)
- [x] Trade application status emails (approved / rejected via `trade_application.status_changed`)
- [x] Commission status emails (quoted / accepted / converted via `commission.status_changed`)
- [ ] Order canceled and refunded emails (no `order.canceled` / `refund.processed` subscribers yet)
- [ ] Studio inbox notification for contact form, inquiry form, feedback widget, and new trade applications
- [ ] Newsletter provider and double opt-in
- [ ] Verify sending domain, SPF, DKIM, DMARC

### CP4 - Infrastructure
- [ ] Redis: event bus, workflow engine, locking, cache modules; `redisUrl` for sessions (B4)
- [ ] Server/worker split (`workerMode`) and production start scripts
- [ ] Dockerfile(s) or platform config for backend, worker, storefront
- [ ] GitHub Actions: install, lint, typecheck, test, build, migrate on release
- [ ] Staging environment with its own Razorpay test keys and webhook
- [ ] Postgres region move to Mumbai/Singapore; migrations over direct connection; CA-verified SSL (S6)
- [ ] Backups/PITR enabled and one restore rehearsal
- [ ] Sentry in both apps; enable `instrumentation.ts`; uptime check; alert routing (S7)
- [ ] Cloudflare in front of storefront and backend (WAF, rate rules, caching)
- [ ] Production env var checklist and secret rotation record

### CP5 - Legal, tax, content
- [ ] Verify the India/INR region in Admin: only Razorpay enabled, Europe/EUR demo region deleted, INR is the only store currency
- [ ] Configure GST/tax rates and tax-inclusive pricing with your CA; check an invoice
- [ ] Rewrite privacy, terms, shipping and returns; add commission terms and authenticity/COA terms
- [ ] Replace `hello@example.com` and fix the brand name in privacy copy
- [ ] Add seller/grievance details and data-consent wording (confirm with a lawyer)
- [ ] Remove demo products and seed content; load real artworks, images, prices, stock
- [ ] Shipping rates and zones verified for real parcels (insurance for artwork)

### CP6 - Go-live
- [ ] Razorpay KYC approved, Live mode on, auto-capture on
- [ ] Live keys in backend and storefront env
- [ ] Live webhook `https://<domain>/hooks/payment/pp_razorpay_razorpay` with secret and events `payment.authorized`, `payment.captured`, `payment.failed`, `order.paid`
- [ ] 1 INR live payment, order created, email received, refund from Admin completed
- [ ] CSP switched from report-only to enforced
- [ ] sitemap/robots verified with the real domain; Search Console submitted (S10)
- [ ] Lighthouse mobile pass; image optimization enabled (S9)
- [ ] Admin accounts cleaned up; admin access restricted (S12)

### CP7 - Launch and after
- [ ] DNS cutover and SSL check
- [ ] 72-hour monitoring of payments, webhooks, emails, errors
- [ ] Artwork attributes module and admin widgets
- [ ] Magic link checkout (Option C)
- [ ] Trade customer group and discount pricing
- [ ] Playwright end-to-end suite and HTTP integration tests
- [ ] Invoice PDF and order tracking page

---

## 9. Documentation Drift (Resolved)

The following historical documentation drift items have been audited and corrected across this file and the repository:

- **Rate Limiting (Section 5 items 11 & 17):** Corrected. Clarified that while edge/distributed rate limiting remains postponed to deployment, an in-memory sliding window limiter (`apps/storefront/src/lib/security/rate-limit.ts`) exists and exclusively guards the `login` and `register` server actions.
- **Feedback Module (Section 5 item 22):** Corrected. Updated the documented data model to match the real schema (`type: feedback|bug`, `message`, `email`, `page_url`, `image_url`, `status: new|reviewed|resolved`) and corrected the migration name to `Migration20261026102431`.
- **Local Machine Status (Section 3):** Corrected. Renamed "Current Live Status" to "Local Development Status (No Deployed Environment Yet)" and explicitly documented that all endpoints reflect local developer testing, with deployed environments still pending.
- **Starter Documentation Drift (Root README.md, AGENTS.md, & Env Examples):** Corrected. Rewrote `README.md` and `AGENTS.md` to document the real LITA platform (`npm`, Razorpay, India/INR only). Updated `NEXT_PUBLIC_DEFAULT_REGION` from `dk` to `in` in storefront `.env.example` and `.env.template`, and removed dead Stripe references.
- **Razorpay Currency Enforcement:** Clarified. The old roadmap claimed "INR currency enforcement" was complete; in reality, INR currency enforcement is strictly enforced at authorization (`authorizePayment`), but is not enforced at session initiation (`initiatePayment`, which currently passes the cart currency through to Razorpay without asserting `inr`).

---

## 10. Ready-to-Use Prompts

### Prompt 1: Close the security blockers (CP1)
```text
Refer to PROJECT_PROGRESS.md section 6.2 (B1, B2, B3, B8).
Fix these in order, with a unit test for each:
1. Remove pp_system_default from the production checkout path.
2. Make /api/revalidate reject when REVALIDATE_SECRET is unset; timing-safe compare; remove GET.
3. Require customer auth on GET /store/trade-applications and filter by email in the query.
4. Strip webhook_verified and client razorpay_order_id in the Razorpay provider; make refundPayment throw without a payment id.
```

### Prompt 2: Redis and worker setup (CP4)
```text
Refer to PROJECT_PROGRESS.md B4. Add Redis event bus, workflow engine, locking and cache modules to apps/backend/medusa-config.ts, driven by REDIS_URL, with dev fallback to in-memory when REDIS_URL is unset and a startup guard in production. Add workerMode support and update the env templates. Check module names against the Medusa 2.21 docs first.
```

### Prompt 3: Transactional emails (CP3)
```text
Refer to PROJECT_PROGRESS.md B5. Add the Medusa Notification module with a Resend provider, then subscribers for order.placed, order.fulfillment_created, trade application status changes and commission status changes. Reuse the editorial email styling from subscribers/password-reset.ts. Do not log reset links in production.
```

### Prompt 4: Clean build baseline (CP0)
```text
Refer to PROJECT_PROGRESS.md B7 and S4. Remove the storefront lockfile, delete unused Stripe/PayPal/onboarding/search starter code, declare any remaining undeclared imports, turn off ignoreBuildErrors and ignoreDuringBuilds, and fix every TypeScript and ESLint error until `npm ci && npm run build` passes from a clean clone.
```

### Prompt 5: Razorpay live-mode checklist (CP6)
```text
Refer to PROJECT_PROGRESS.md and docs/razorpay.md. Walk me through Razorpay Live mode activation: KYC status, auto-capture, live keys, live webhook and events, a 1 INR test payment and a refund from Medusa Admin. Verify each step against the code in apps/backend/src/modules/razorpay and apps/storefront/src/modules/checkout/components/payment-button.
```

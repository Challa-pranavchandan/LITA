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
│   │   ├── medusa-config.ts               # Core Medusa config: DB URL, CORS, secrets, SSL
│   │   ├── .env                           # Backend environment variables
│   │   ├── static/                        # Media assets & local upload storage
│   │   └── src/
│   │       ├── admin/                     # Custom admin dashboard widgets & extensions
│   │       ├── api/                       # File-based API endpoints (store/* and admin/*)
│   │       ├── jobs/                      # Scheduled background jobs
│   │       ├── workflows/                 # Business logic workflows and steps
│   │       └── ...
│   │
│   └── storefront/                        # Customer-Facing Next.js Storefront (@dtc/storefront)
│       ├── next.config.js                 # Next.js config (Turbopack root, aliases, remote patterns)
│       ├── .env.local                     # Storefront environment variables
│       ├── public/                        # Static imagery (hero-bg, collection thumbnails)
│       ├── src/
│       │   ├── app/                       # App Router routes:
│       │   │   ├── page.tsx               # Curated editorial gallery homepage
│       │   │   ├── artworks/              # Artwork catalog & [handle] detail pages
│       │   │   ├── collections/           # Curated collection overviews & single collection pages
│       │   │   ├── about/                 # Artist statement & studio background
│       │   │   ├── commissions/           # Bespoke commission inquiry request workflow
│       │   │   ├── contact/               # Studio contact form
│       │   │   ├── shipping/              # Shipping, handling, care & return policies
│       │   │   ├── saved/                 # Saved / Wishlist gallery
│       │   │   ├── cart/                  # Dedicated cart page
│       │   │   ├── checkout/              # Seamless guest / customer checkout flow
│       │   │   ├── account/               # Customer account portal (auth & orders)
│       │   │   ├── order/                 # Order confirmation & status
│       │   │   ├── api/inquiry/           # Commission & artwork inquiry handler
│       │   │   ├── globals.css            # Custom gallery design tokens & typography
│       │   │   └── layout.tsx             # Root layout with Header & Footer
│       │   ├── components/                # Modular gallery components (Header, HeaderNav, HeaderActions,
│       │   │                              # CartDrawer, MobileMenu, PromoBanner, ArtworkGrid, BrowseFilters,
│       │   │                              # livinIcons, SaveButton, SavedWorks, InquiryForm, Footer)
│       │   └── lib/                       # Medusa client & data services
│       │       ├── medusa.ts              # Medusa JS SDK client instance
│       │       ├── config.ts              # Site metadata & navigation configuration
│       │       ├── format.ts              # Currency & dimension formatting helpers
│       │       ├── saved.ts               # LocalStorage wishlist state helper
│       │       └── data/                  # Server Actions / fetchers (catalog, cart, customer)
│       └── package.json
│
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

---

## 6. Current Roadmap & Next Steps

1. **Payment Gateway Integration:**
   - [ ] Medusa Stripe payment module configuration in `medusa-config.ts`.
   - [ ] Connect Stripe Elements in `/checkout` with `NEXT_PUBLIC_STRIPE_KEY`.

2. **Custom Backend Artwork Attributes:**
   - [ ] Extend Medusa product entity with custom art attributes: `artist_name`, `medium`, `dimensions`, `certificate_of_authenticity`.
   - [ ] Surface metadata directly in Store API `/store/products` responses.

3. **Notification & Email Workflows:**
   - [ ] Connect inquiry form (`/api/inquiry`) and newsletter signups to email service (Resend / SendGrid).
   - [ ] Automated order confirmation and tracking email workflows.

---

## 7. Ready-to-Use Prompts for Claude

Copy and paste any of the following prompts into Claude along with this document:

### Prompt A: Adding Custom Artwork Attributes to Medusa v2 Products
```text
Refer to PROJECT_PROGRESS.md for my Medusa v2 monorepo setup.

I want to extend Medusa products to support art-specific fields:
- artist_name (string)
- medium (string, e.g., "Acrylic on Canvas", "Giclée Print")
- dimensions (string, e.g., "24x36 in")
- certificate_of_authenticity (boolean)

Please show me how to:
1. Create a custom module or extend the product module in Medusa v2.
2. Define the schema and run migrations (using npx medusa db:generate).
3. Expose these fields in the Store API (/store/products).
4. Display them on the artwork detail page in apps/storefront/src/app/artworks/[handle]/page.tsx.
```

### Prompt B: Setting Up Stripe Payments in Medusa v2 & Next.js Storefront
```text
Refer to PROJECT_PROGRESS.md for my Medusa v2 monorepo setup.

I need to configure Stripe payment processing for both backend and storefront:
1. What Medusa v2 payment module should I add in apps/backend/medusa-config.ts?
2. What environment variables are required in apps/backend/.env and apps/storefront/.env.local?
3. How do I ensure the checkout step in apps/storefront/src/app/checkout/page.tsx loads the Stripe Elements form properly?
```

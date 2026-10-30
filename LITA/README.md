# LITA — Livin In The Art

An editorial contemporary fine art ecommerce platform powered by **Medusa v2** and **Next.js 15 (App Router)**. Built for fine art collectors, interior designers, and bespoke commission clients in India.

---

## 1. Architecture Overview

- **Repository Architecture:** Turborepo monorepo (`npm` workspaces)
- **Storefront (`apps/storefront`):** Next.js 15.5+ (App Router, Turbopack, React 19, Tailwind CSS v3, GSAP animations, `@medusajs/js-sdk`)
- **Backend Engine (`apps/backend`):** Medusa v2 (`@medusajs/medusa` 2.21.2, Node.js 22+, Express, MikroORM, Knex)
- **Database:** PostgreSQL on Supabase (`aws-0-ap-southeast-2.pooler.supabase.com:6543`) with SSL pooler connection
- **Media & Asset Storage:** Cloudflare R2 (AWS S3-compatible Medusa file module provider)
- **Payment Gateway:** **Razorpay** (`pp_razorpay_razorpay`) — UPI (Google Pay, PhonePe, Paytm, BHIM), Netbanking, Credit/Debit Cards, Wallets
- **Target Market & Currency:** **India only**, Indian Rupee (**INR**, `₹`), default region `in`
- **Transactional Email:** Resend REST API (password reset, studio notifications)
- **Admin Dashboard:** Medusa Admin Dashboard (React 18 SPA served at `http://localhost:9000/app`)

---

## 2. Directory Structure

```text
.
├── apps/
│   ├── backend/                           # Medusa v2 Commerce Engine (@dtc/backend)
│   │   ├── medusa-config.ts               # Core config: DB URL, CORS, secrets, SSL, R2 S3 provider, Razorpay
│   │   ├── .env                           # Backend environment variables
│   │   └── src/
│   │       ├── admin/                     # Custom admin routes & widgets (gallery, journal, trade, commissions, feedback)
│   │       ├── api/                       # File-based API endpoints (store/* and admin/*)
│   │       ├── modules/                   # Custom Medusa modules (gallery, journal, trade, commission, feedback, razorpay)
│   │       ├── subscribers/               # Event subscribers (password-reset, razorpay recovery)
│   │       └── workflows/                 # Business logic workflows and steps
│   │
│   └── storefront/                        # Customer-Facing Next.js Storefront (@dtc/storefront)
│       ├── next.config.js                 # Next.js config (Turbopack root, aliases, CSP, R2 remote patterns)
│       ├── .env.local                     # Storefront environment variables
│       └── src/
│           ├── app/                       # App Router routes (artworks, gallery, journal, checkout, account, commissions)
│           ├── components/                # Modular gallery design system components
│           └── lib/                       # Medusa JS SDK client, data caching, rate limiting, validation
├── docs/                                  # Architecture, performance, and module specifications
├── package.json                           # Turborepo root package.json (npm@11.1.0)
├── package-lock.json                      # Authoritative lockfile
└── turbo.json                             # Turborepo pipeline tasks
```

---

## 3. Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v22+
- [npm](https://www.npmjs.com/) v11+ (authoritative lockfile: `package-lock.json`)
- Remote Supabase PostgreSQL (or local PostgreSQL v15+)
- Cloudflare R2 bucket credentials
- Razorpay test mode credentials

> [!IMPORTANT]
> The project strictly uses **`npm`**. Do not run `pnpm`, `yarn`, or `bun`.

### 1. Install Dependencies

From the repository root:

```bash
npm install
```

### 2. Configure Backend Environment

Copy the template:

```bash
cp apps/backend/.env.example apps/backend/.env
```

Configure the following key variables in `apps/backend/.env`:
- `DATABASE_URL`: Supabase PostgreSQL pooled connection URL.
- `JWT_SECRET` & `COOKIE_SECRET`: Application secrets (≥ 32 characters in production).
- `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS`: Allowed origins (e.g. `http://localhost:8000,http://localhost:9000`).
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`: Razorpay credentials.
- `R2_FILE_URL`, `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`: Cloudflare R2 credentials.
- `RESEND_API_KEY`: Resend API key for transactional email dispatch.

### 3. Configure Storefront Environment

Copy the template:

```bash
cp apps/storefront/.env.template apps/storefront/.env.local
```

Configure `apps/storefront/.env.local`:
- `NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000`
- `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`: Retrieve from Medusa Admin (**Settings** → **Publishable API Keys**).
- `NEXT_PUBLIC_DEFAULT_REGION=in` (India)
- `NEXT_PUBLIC_BASE_URL=http://localhost:8000`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`: Razorpay Public Key ID (e.g. `rzp_test_xxx`).
- `R2_PUBLIC_HOSTNAME`: Cloudflare R2 public hostname for Next.js image optimization.
- `REVALIDATE_SECRET`: Secret token for on-demand ISR revalidation.

---

## 4. Development Commands

Run all commands from the repository root using `npm`:

```bash
# Start both Backend and Storefront concurrently
npm run dev

# Start Backend only (http://localhost:9000, Admin at /app)
npm run backend:dev

# Start Storefront only (http://localhost:8000)
npm run storefront:dev

# Run linting across all workspaces
npm run lint

# Build production bundles
npm run build
```

Database migrations (run from `apps/backend`):

```bash
cd apps/backend
npx medusa db:migrate
```

---

## 5. Key Features & Modules

- **Editorial Catalog & Visual Exhibition (`/artworks`, `/gallery`):** High-resolution contemporary art showcase, masonry gallery with fullscreen lightbox, and on-demand ISR caching (`revalidate = 60`).
- **Razorpay Payment Integration (`/checkout`):** Custom payment module (`pp_razorpay_razorpay`) with INR currency enforcement at authorization, server-side HMAC verification, anti-replay guards, and abandoned cart recovery.
- **Customer Accounts & Security (`/account`, `/login`, `/register`):** Customer profile management, session cookies (`_medusa_jwt`), and in-memory rate limiting on login and registration.
- **Trade Program (`/trade`, `/app/trade-applications`):** B2B advisory and discount workflow for interior designers and architects with admin review.
- **Bespoke Commissions (`/commissions`, `/app/commissions`):** Custom artwork request workflow with presigned Cloudflare R2 image uploads, discussion threads, and draft order conversion.
- **Studio Journal (`/journal`, `/app/journal`):** Editorial articles, markdown content management, and SEO metadata.
- **Feedback & Bug Reporting (`Footer` widget):** Direct customer feedback and screenshot submissions linked to the backend feedback module.

---

## 6. Storefront Configuration Reference

| Variable | Description | Default |
|:---|:---|:---|
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | Medusa backend API URL | `http://localhost:9000` |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | Publishable key from Medusa Admin | — |
| `NEXT_PUBLIC_DEFAULT_REGION` | Default ISO-2 country code for pricing | `in` |
| `NEXT_PUBLIC_BASE_URL` | Base URL of storefront | `http://localhost:8000` |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay Public Key ID (modal checkout) | `rzp_test_xxx` |
| `R2_PUBLIC_HOSTNAME` | Hostname for R2 media remotePatterns | — |
| `REVALIDATE_SECRET` | Secret token for ISR `/api/revalidate` | — |

---

## License

Private / Proprietary — Livin In The Art. All rights reserved.

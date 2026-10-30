# AGENTS.md

## Overview

**LITA (Livin In The Art)** — a Turborepo monorepo containing a Medusa v2 backend (`apps/backend`, `@dtc/backend`, Node 22+, Express, MikroORM) and a customer-facing Next.js 15 App Router storefront (`apps/storefront`, `@dtc/storefront`).

- **Target Market & Currency:** India only, Indian Rupee (`INR`, `₹`), default region `in`.
- **Payment Provider:** **Razorpay** (`pp_razorpay_razorpay`) exclusively. No Stripe.
- **Storage:** Cloudflare R2 via Medusa S3 file provider.
- **Database:** Supabase PostgreSQL with SSL pooler connection.
- **Email:** Resend REST API.

## Directory Structure

```text
.
├── apps/
│   ├── backend/                  # Medusa application (@dtc/backend)
│   │   ├── medusa-config.ts      # Medusa config: DB URL, CORS, secrets, modules, R2, Razorpay
│   │   ├── integration-tests/    # setup.js and http/*.spec.ts suites
│   │   └── src/
│   │       ├── admin/            # Admin dashboard extensions (gallery, journal, trade, commissions, feedback)
│   │       ├── api/              # API routes: api/store/*, api/admin/* (file-based)
│   │       ├── jobs/             # Scheduled jobs
│   │       ├── modules/          # Custom modules (gallery, journal, trade, commission, feedback, razorpay)
│   │       ├── subscribers/      # Event subscribers (password-reset, razorpay recovery)
│   │       └── workflows/        # Workflows and steps
│   └── storefront/               # Next.js 15 App Router storefront (@dtc/storefront)
│       ├── next.config.js        # Next config: CSP, R2 remote patterns, Turbopack root
│       ├── src/app/              # Editorial gallery routes (artworks, gallery, journal, checkout, account)
│       ├── src/components/       # UI components & gallery design system
│       └── src/lib/              # Medusa SDK client, data caching, in-memory rate limiting, auth
├── docs/                         # Architecture, performance, and feature specifications
├── eslint.config.ts              # Root ESLint configuration
├── package-lock.json             # Authoritative lockfile (npm)
├── package.json                  # Turborepo root
└── turbo.json                    # Task graph: build, dev, start, lint, test
```

## Package Manager

**`npm` is the authoritative package manager for this repository.**
- Lockfile: `package-lock.json` (`npm@11.1.0`).
- **Never** use `pnpm`, `yarn`, or `bun`.
- **Never** introduce `pnpm-lock.yaml`, `yarn.lock`, or `bun.lockb`.

Always use `npm` for workspace commands:

### Development

```bash
npm run dev                  # all apps concurrently
npm run backend:dev          # backend only (http://localhost:9000, admin at /app)
npm run storefront:dev       # storefront only (http://localhost:8000)
```

### Build & Lint

```bash
npm run build                # build all apps via turbo
npm run lint                 # lint all apps via turbo
```

### Database Migrations & Commands

Run from `apps/backend`:

```bash
cd apps/backend
npx medusa db:generate <module-name>   # generate migrations for a custom module
npx medusa db:migrate                  # run migrations
npx medusa user -e admin@test.com -p supersecret
```

## Medusa Skills & MCP Server

When available, use Medusa agentic skills before writing code:
- `building-with-medusa`: backend modules, API routes, workflows, data models.
- `building-admin-dashboard-customizations`: admin dashboard routes and widgets under `apps/backend/src/admin`.
- `building-storefronts`: Next.js storefront logic under `apps/storefront`.

## Code Style & Conventions

- **The backend must satisfy `@medusajs/eslint-plugin`'s recommended config** (`eslint.config.ts`). Never disable a `@medusajs/*` rule to silence lint errors; fix the underlying code.
- **Backend routing is file-based:** Store endpoints reside in `src/api/store/<path>/route.ts`. Admin endpoints reside in `src/api/admin/<path>/route.ts`.
- **Business logic belongs in workflows (`src/workflows`)**, not in route handlers. Route handlers should merely resolve inputs and invoke workflows.
- **Storefront conventions (Next.js 15):** Route `params` and `searchParams` are Promises and must be awaited.
- **Regional conventions:** Storefront region defaults to `in` (India). Currency is strictly `INR` (`₹`). Razorpay is the sole payment gateway.

## Off-Limits

- `apps/backend/.medusa/`, `.next/`, `dist/`, `out/`, `.turbo/` — build output, regenerated dynamically.
- `package-lock.json` — never hand-edit or delete; change only via npm CLI.
- `.env` / `.env.local` — never commit, print, or expose secret values. Document new variables in `.env.template` or `.env.example`.
- Existing migrations in `src/modules/*/migrations/` — create a new migration rather than altering existing migrations.
- Destructive DB commands (drops, schema resets) against the remote database without explicit confirmation.

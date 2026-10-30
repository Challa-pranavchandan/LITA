# Infrastructure Topology & Multi-Instance Architecture

## 1. Overview

LITA is architected for high-reliability, zero-race-condition eCommerce operations in a multi-instance production environment. In production, the system splits into distinct services:
1. **Storefront (`@dtc/storefront`):** Customer-facing Next.js 15 App Router application with ISR caching.
2. **Backend Server (`@dtc/backend` with `workerMode: "server"`):** Medusa v2 application instance dedicated to HTTP API routes and Admin dashboard extensions.
3. **Backend Worker (`@dtc/backend` with `workerMode: "worker"`):** Medusa v2 background processing instance dedicated to event subscribers, BullMQ workflow queues, scheduled jobs, and retry mechanisms.
4. **PostgreSQL Database:** Supabase Postgres (SSL pooler connection, transaction mode for HTTP, session mode for migrations).
5. **Redis Infrastructure:** Managed Redis (Upstash, Redis Cloud, Railway, or AWS ElastiCache) providing durable queues, distributed locking, pub/sub event bus, and session storage.

```
                    +------------------------------------+
                    |        Cloudflare CDN / WAF        |
                    +-----------------+------------------+
                                      |
                     +----------------+----------------+
                     |                                 |
                     v                                 v
          +----------------------+          +----------------------+
          |   Next.js 15 Store   |          |  Medusa Server App   |
          |    (@dtc/storefront) |          |  (workerMode=server) |
          |    Port 8000 (ISR)   |          |  Port 9000 (Express) |
          +----------+-----------+          +----+------------+----+
                     |                           |            |
                     +---------------------------+            |
                     |                                        |
                     v                                        v
          +----------------------+          +----------------------+
          |   Supabase Postgres  |<---------+  Medusa Worker App   |
          |   (Port 6543 / 5432) |          |  (workerMode=worker) |
          +----------+-----------+          |  (DISABLE_ADMIN=true)|
                     ^                      +----------+-----------+
                     |                                 |
                     +---------------------------------+
                                      |
                                      v
                         +-------------------------+
                         |      Managed Redis      |
                         |   (TLS rediss://:6379)  |
                         | - Event Bus (BullMQ)    |
                         | - Workflows (BullMQ)    |
                         | - Distributed Locks     |
                         | - Caching Module        |
                         | - Express Sessions      |
                         +-------------------------+
```

---

## 2. Server vs. Worker Roles

In Medusa v2 (`2.21.2`), background task processing and HTTP request serving are partitioned using `projectConfig.workerMode`:

| Component / Function | Server Instance (`workerMode: "server"`) | Worker Instance (`workerMode: "worker"`) | Shared Mode (`workerMode: "shared"`) |
| :--- | :--- | :--- | :--- |
| **HTTP API Routes (`/store/*`, `/admin/*`)** | Enabled (Express listener) | Disabled (No HTTP listener) | Enabled |
| **Admin Dashboard UI (`/app`)** | Enabled | Disabled (`DISABLE_MEDUSA_ADMIN=true`) | Enabled |
| **Event Subscribers (`order.placed`, etc.)** | Disabled | Enabled (BullMQ worker) | Enabled |
| **Workflow Engine Queues (Retries, Timeouts)** | Disabled | Enabled (BullMQ queues & workers) | Enabled |
| **Scheduled Jobs (`jobs/*`)** | Disabled | Enabled | Enabled |
| **Scaling Characteristics** | Scale horizontally based on HTTP traffic / web traffic | Scale independently based on queue depth / jobs | Single process only (dev / small staging) |

### Why Dedicated Workers Matter in Production
1. **Event Durability:** When a webhook recovery or email notification takes 3 seconds, HTTP endpoints respond immediately without blocking the event queue.
2. **Zero Missing Webhooks:** If the HTTP server restarts during a deploy, subscribers running in the worker do not terminate mid-flight.
3. **Queue Compaction:** Long-running syncs (image optimization, mass catalog updates) cannot starve customer checkout HTTP requests.

---

## 3. Redis Modules & Architecture

When `REDIS_URL` is set, `medusa-config.ts` registers four specialized Redis modules:

### 1. Redis Event Bus (`@medusajs/medusa/event-bus-redis`)
- **Engine:** BullMQ on top of `ioredis`.
- **Purpose:** Dispatches domain events (`order.placed`, `payment.captured`, `trade_application.status_changed`, `commission.status_changed`).
- **Options:** Connects via `process.env.REDIS_URL`. Emits jobs with automatic retry capabilities.

### 2. Redis Workflow Engine (`@medusajs/medusa/workflow-engine-redis`)
- **Engine:** BullMQ with 3 specialized internal queues:
  - `medusa-workflows`: Handles workflow retries, step timeouts, and distributed compensation transactions.
  - `medusa-workflows-jobs`: Handles scheduled workflow execution.
  - `medusa-workflows-cleaner`: Cleans up completed/failed workflow execution records.
- **Options:** Configured under `options: { redis: { redisUrl: process.env.REDIS_URL } }`.

### 3. Distributed Locking (`@medusajs/medusa/locking` + `@medusajs/medusa/locking-redis`)
- **Provider:** `locking-redis` registered as default (`is_default: true`).
- **Namespace:** `medusa_lock:`.
- **Purpose:** Prevents concurrent race conditions across multiple server and worker instances (such as concurrent cart completion and webhook recovery).

### 4. Redis Caching Module (`@medusajs/caching` + `@medusajs/medusa/caching-redis`)
- **Provider:** `caching-redis` registered as default (`is_default: true`).
- **Key Prefix:** `mc:`.
- **Purpose:** High-performance shared caching layer with optional compression for data payloads exceeding 1024 bytes.

### 5. Session Storage (`projectConfig.redisUrl`)
- **Purpose:** Stores customer and admin authentication session state in Redis rather than in-memory cookies.

---

## 4. Environment Variables Matrix

### Storefront (`apps/storefront`)
| Variable | Required in Prod | Description / Example |
| :--- | :--- | :--- |
| `MEDUSA_BACKEND_URL` | Yes | Backend URL (e.g. `https://api.livinintheart.com`) |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | Yes | Medusa API publishable key (`pk_...`) |
| `NEXT_PUBLIC_DEFAULT_REGION` | Yes | Strictly `in` |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Yes | Razorpay key id (`rzp_live_...` or `rzp_test_...`) |
| `REVALIDATE_SECRET` | Yes | Minimum 32-character random string matching backend |

### Backend Server (`apps/backend` - Server Deployment)
| Variable | Required in Prod | Description / Example |
| :--- | :--- | :--- |
| `NODE_ENV` | Yes | `production` |
| `DATABASE_URL` | Yes | Supabase connection string (`postgresql://...`) |
| `DATABASE_EXTRA` | Yes | JSON driver options (`{"connection":{"ssl":{"rejectUnauthorized":false}}}`) |
| `REDIS_URL` | Yes | Redis URL (`rediss://default:password@host:6379`) |
| `MEDUSA_WORKER_MODE` | Yes | `server` |
| `DISABLE_MEDUSA_ADMIN` | No | `false` (enables admin at `/app`) |
| `JWT_SECRET` | Yes | 32+ characters |
| `COOKIE_SECRET` | Yes | 32+ characters |
| `REVALIDATE_SECRET` | Yes | 32+ characters (matches storefront) |
| `STORE_CORS` | Yes | Storefront origins (e.g. `https://livinintheart.com`) |
| `ADMIN_CORS` | Yes | Admin origins (e.g. `https://api.livinintheart.com`) |
| `AUTH_CORS` | Yes | Auth origins |
| `R2_FILE_URL` | Yes | Cloudflare R2 public URL |
| `R2_ENDPOINT` | Yes | Cloudflare S3 endpoint |
| `R2_BUCKET` | Yes | Bucket name |
| `R2_ACCESS_KEY_ID` | Yes | Cloudflare R2 access key |
| `R2_SECRET_ACCESS_KEY` | Yes | Cloudflare R2 secret key |
| `RAZORPAY_KEY_ID` | Yes | Razorpay Key ID |
| `RAZORPAY_KEY_SECRET` | Yes | Razorpay Key Secret |
| `RAZORPAY_WEBHOOK_SECRET` | Yes | Razorpay Webhook Secret |
| `RESEND_API_KEY` | Yes | Resend API key |
| `RESEND_FROM_EMAIL` | Yes | Verified domain email (e.g. `LITA Orders <orders@livinintheart.com>`) |

### Backend Worker (`apps/backend` - Worker Deployment)
The worker uses identical database, Redis, secrets, R2, Razorpay, and Resend environment variables as the server, with two key differences:
| Variable | Value | Reason |
| :--- | :--- | :--- |
| `MEDUSA_WORKER_MODE` | `worker` | Instructs Medusa to listen only to queues, subscribers, and scheduled jobs |
| `DISABLE_MEDUSA_ADMIN` | `true` | Skips loading and serving the admin bundle |

---

## 5. Deployment Commands

Both the Server and Worker run from the exact same build artifact (`medusa build`).

```bash
# Build (run once during CI/CD)
npm run build

# Start HTTP Server instance:
MEDUSA_WORKER_MODE=server npm run start:server

# Start Background Worker instance:
MEDUSA_WORKER_MODE=worker DISABLE_MEDUSA_ADMIN=true npm run start:worker
```

---

## 6. Race Condition & Distributed Lock Verification

### Problem Solved
When a customer pays via Razorpay, two asynchronous flows can fire simultaneously:
1. **Client Return:** The customer's browser finishes payment in the Razorpay Checkout modal, returns to the storefront, and calls `placeOrder()` (`completeCartWorkflow`).
2. **Webhook Recovery:** Razorpay simultaneously delivers `payment.captured` to `/hooks/payment/pp_razorpay_razorpay`, which runs `reconcileRazorpayOrderWorkflow` on the background worker.

Without a distributed lock, both instances could query the cart at the same millisecond, perceive it as uncompleted, and generate two distinct orders in Medusa for the same payment.

### How the Lock Works
With the `@medusajs/medusa/locking` Redis provider configured:
- Both the server and worker acquire a lock using key `medusa_lock:cart:<cart_id>`.
- The first process (e.g. client return) acquires the lock, completes the cart, updates `cart.completed_at`, records the order ID in the payment collection data, and releases the lock.
- The second process (e.g. webhook recovery) waits for the lock. Upon acquiring it, it reads the updated cart state, detects `cart.completed_at` is already set, and exits cleanly as a no-op without creating a duplicate order.

---

## 7. Verification Runbook

### Acceptance Test 1: Local Development Without Redis
1. Unset `REDIS_URL` in `apps/backend/.env`.
2. Run `npm run backend:dev`.
3. Verify the console prints:
   `[medusa-config] REDIS_URL is not set. Falling back to default in-memory event bus, workflow engine, locking, and caching providers for local development.`
4. Verify the backend starts on `http://localhost:9000` with admin accessible.

### Acceptance Test 2: Redis Event Durability Across Restarts
1. Start local Redis:
   ```bash
   docker run -d --name test-redis -p 6379:6379 redis:7-alpine
   ```
2. Set `REDIS_URL=redis://localhost:6379` in `apps/backend/.env`.
3. Start the backend with `npm run backend:dev`.
4. Trigger an event (or simulate an order placed).
5. Stop the backend process before the subscriber finishes processing.
6. Restart the backend process.
7. Observe BullMQ re-attaches to the `medusa-workflows` and event queues, picking up the uncompleted job and executing the subscriber to completion.

### Acceptance Test 3: Concurrent Cart Completion Race Condition
1. Run two instances concurrently pointing to the same database and Redis:
   - Terminal 1: `MEDUSA_WORKER_MODE=server npm run start`
   - Terminal 2: `MEDUSA_WORKER_MODE=worker npm run start`
2. Prepare a cart with Razorpay authorization.
3. Simultaneously fire the completion API request from the storefront and post the mock `payment.captured` webhook payload to the webhook endpoint.
4. Verify in the database / Medusa Admin:
   - Exactly one order is created.
   - The secondary worker logs: *"Order already created for cart <cart_id>. Skipping duplicate order creation."*

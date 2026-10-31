# Production-Grade Saved (Wishlist) Feature

## 1. Overview
The Saved (Wishlist) feature allows collectors and visitors of the LITA gallery to curate artworks they love.

- **Guest Visitors:** Zero-friction experience stored locally in browser `localStorage` under `"saved-artworks"`. No login or sign-up barrier is required.
- **Authenticated Customers:** Persistent server-backed wishlist managed by a custom Medusa v2 `wishlist` module with Supabase PostgreSQL persistence.
- **Seamless Transition:** When a guest logs in or registers, their local saved items are automatically merged into their customer account on the server, and guest `localStorage` is cleared.
- **Device Privacy:** When a customer logs out, their in-memory wishlist is reset to empty and local storage is wiped, preventing customer data leakage on shared computers or mobile devices.
- **Optimistic UI with Rollback:** Toggle interactions reflect instantly in the UI with sub-millisecond response time. If network connectivity fails or the 200-item cap is exceeded, the state rolls back automatically and an elegant toast notification informs the user.

---

## 2. Architecture & Data Flow

```
                      +-----------------------------------+
                      |   Storefront (Next.js 15 / R19)   |
                      +-----------------------------------+
                                        |
                 +----------------------+----------------------+
                 |                                             |
           [Guest Mode]                                [Logged-in Mode]
                 |                                             |
        localStorage (client)                        Optimistic Store Update
                 |                                             |
        useSyncExternalStore                         Server Action RPC
                 |                                             |
                 |                              +-------------------------------+
                 |                              | Medusa Store API (Port 9000)  |
                 |                              +-------------------------------+
                 |                                             |
                 |                                authenticate("customer")
                 |                                             |
                 |                              +-------------------------------+
                 |                              |      WishlistModuleService    |
                 |                              +-------------------------------+
                 |                                             |
                 |                                Supabase PostgreSQL (wishlist_item)
                 v                                             v
          Artworks Gallery                             Customer Account Sync
```

### Components & Modules

1. **Backend Wishlist Module (`apps/backend/src/modules/wishlist`)**:
   - DML Model: `WishlistItem` with `id` (prefix `wl_`), `customer_id`, `product_id`, created at, updated at.
   - Database Constraint: Composite unique index `IDX_wishlist_item_customer_product` on `(customer_id, product_id)` to guarantee idempotent records.
   - Service: `WishlistModuleService` extending `MedusaService({ WishlistItem })`.
   - Migration: `Migration20261031065846.ts` creating table `wishlist_item`.

2. **Backend API Endpoints (`apps/backend/src/api/store/customers/me/wishlist`)**:
   - `GET /store/customers/me/wishlist`: Returns `{ product_ids: string[] }` newest first, capped at 200.
   - `POST /store/customers/me/wishlist/items`: Adds item idempotently. Validates body `{ product_id }` with Zod, validates product exists in Medusa catalog (404 if invalid), enforces 200 cap (422), and emits `wishlist.item_added`.
   - `DELETE /store/customers/me/wishlist/items/:product_id`: Deletes item idempotently. Emits `wishlist.item_removed` and returns updated list.
   - `POST /store/customers/me/wishlist/merge`: Merges guest product IDs into customer's server wishlist. Dedupes input, checks valid catalog products, skips already saved items, caps total at 200, and returns merged list.
   - Middleware: Protected by `authenticate("customer", ["bearer", "session"])` and sliding-window rate limiting (`"wishlist"` action, 120 reqs/15m).

3. **Storefront Hybrid Store (`apps/storefront/src/lib/saved.ts`)**:
   - Preserves public signatures:
     - `useSaved(): string[]` (using `useSyncExternalStore`)
     - `toggleSaved(id: string): Promise<void>`
   - Seamless compatibility with all existing consumers: `SaveButton`, `ArtworkGrid`, `artworks/[handle]`, `HeaderActions`, mobile navigation, and `/saved`.
   - Tracks authentication state via `syncSavedWithAuth(isLoggedIn)`.

4. **Authentication Sync Component (`apps/storefront/src/components/SavedAuthSync.tsx`)**:
   - Mounted in `Header.tsx` where the customer session is securely resolved.
   - Triggers server merge on login and data purging on logout.

5. **Toast Feedback Component (`apps/storefront/src/components/SavedToast.tsx`)**:
   - Zero-dependency gallery-minimalist notification banner mounted in root `layout.tsx`.
   - Displays rollback notifications, limit errors, and network issues with auto-dismiss and dismiss button.

6. **Hardened Server Actions & Catalog Retrieval**:
   - `apps/storefront/src/app/saved/actions.ts`: `fetchSavedProducts(ids)` validates input array, filters string IDs, dedupes, and slices up to 200.
   - `apps/storefront/src/lib/data/catalog.ts`: `listProductsByIds(ids)` queries up to 200 products with region pricing.
   - `apps/storefront/src/components/SavedWorks.tsx`: Automatically detects unresolvable or deleted catalog products and prunes them in the background.

---

## 3. API Contract

### `GET /store/customers/me/wishlist`
- **Auth:** Required (`Bearer <jwt>`)
- **Response `200 OK`:**
  ```json
  {
    "product_ids": ["prod_01J...", "prod_02K..."]
  }
  ```

### `POST /store/customers/me/wishlist/items`
- **Auth:** Required
- **Body:**
  ```json
  {
    "product_id": "prod_01J..."
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "product_ids": ["prod_01J...", "prod_02K..."]
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Missing or invalid `product_id`.
  - `401 Unauthorized`: Missing or invalid customer JWT.
  - `404 Not Found`: Product ID does not exist in the Medusa product catalog.
  - `422 Unprocessable Entity`: Wishlist is at the maximum limit of 200 items.

### `DELETE /store/customers/me/wishlist/items/:product_id`
- **Auth:** Required
- **Response `200 OK`:**
  ```json
  {
    "product_ids": ["prod_02K..."]
  }
  ```
- **Behavior:** Idempotent (returns 200 even if the product was not in the wishlist).

### `POST /store/customers/me/wishlist/merge`
- **Auth:** Required
- **Body:**
  ```json
  {
    "product_ids": ["prod_01J...", "prod_03M..."]
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "product_ids": ["prod_01J...", "prod_02K...", "prod_03M..."]
  }
  ```

---

## 4. Merge & Logout Semantics

### Login / Guest Merge Semantics
1. User saves items while browsing as a guest (`localStorage.getItem("saved-artworks")`).
2. User signs in or completes registration.
3. Server component `Header` passes `isLoggedIn={true}` to `<SavedAuthSync />`.
4. `syncSavedWithAuth(true)` reads the local guest items and invokes `mergeWishlist(guestIds)`.
5. The backend validates which products exist in the catalog, filters out items already present in the customer's server wishlist, and saves the new items up to the 200 cap.
6. Storefront deletes `localStorage.removeItem("saved-artworks")` and writes the merged server list to the reactive store cache.

### Logout Semantics
1. User logs out via `logout()` in `apps/storefront/src/lib/data/customer.ts`.
2. `_medusa_jwt` cookie is deleted and Next.js revalidates the layout.
3. `<SavedAuthSync />` receives `isLoggedIn={false}`.
4. `syncSavedWithAuth(false)` recognizes the transition from logged-in to logged-out:
   - Clears in-memory cache (`cache = []`).
   - Clears `localStorage.removeItem("saved-artworks")`.
   - Notifies all UI listeners to render an empty guest list.
5. Guarantees that subsequent guest users on shared computers cannot view or modify the previous customer's saved artworks.

---

## 5. Security & Rate Limiting

- **Customer Identity Verification:** In Medusa v2, `req.auth_context.actor_id` is populated by `authenticate("customer", ["bearer", "session"])`. Route handlers use this ID directly, preventing any customer from viewing or tampering with another customer's wishlist.
- **Strict Server-Action Validation:** `fetchSavedProducts` in `actions.ts` rejects non-array inputs, sanitizes string identifiers, and clamps requests to 200 IDs, preventing unbounded database queries.
- **Rate Limiting:** Added `"wishlist"` action to sliding-window rate limiting middleware (120 requests per 15-minute window per IP/client).
- **Idempotency:** Composite database unique constraint prevents duplicate rows even in concurrent requests.

---

## 6. Verification & Test Coverage

### Backend Unit Tests (`wishlist.unit.spec.ts`)
- `GET /store/customers/me/wishlist`: 401 unauthenticated guard, ordering newest first, 200 cap.
- `POST /store/customers/me/wishlist/items`: 401 guard, 400 validation error, 404 missing catalog product, idempotency check, 422 limit cap, event emission (`wishlist.item_added`).
- `DELETE /store/customers/me/wishlist/items/:product_id`: 401 guard, event emission (`wishlist.item_removed`), idempotent deletion.
- `POST /store/customers/me/wishlist/merge`: 401 guard, deduplication, catalog existence check, cap enforcement.
- **Result:** 13 passed, 13 total.

### Storefront Unit Tests (`saved-feature.test.js`)
- `lib/data/saved.ts` server actions and endpoint calls.
- `lib/saved.ts` public API contract, optimistic rollback, and toast dispatch.
- `Header.tsx` and `layout.tsx` mounting of sync and toast components.
- Server action ID sanitization and 200 item clamping.
- Background pruning of unresolvable/deleted items in `SavedWorks.tsx`.
- **Result:** 8 passed, 8 total (full storefront suite: 65 passed, 0 failed).

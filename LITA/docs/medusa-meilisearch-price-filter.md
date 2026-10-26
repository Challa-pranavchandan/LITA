# Price Filtering in Medusa v2 with Meilisearch (or Algolia)

Goal: power the "Art Under $350" and "Art Under $800" menu items by indexing products in a search engine and using numeric filters.

Meilisearch is the easier option: it is open source, can be self-hosted, and Medusa has a documented route for it.

---

## Option A: Community plugin (fastest)

Plugin: `@rokmohar/medusa-plugin-meilisearch` (Meilisearch plugin for Medusa v2). It syncs products for you and exposes a search endpoint (`GET /store/meilisearch/products`).

> Check your Medusa version first. A newer, separate plugin listing says its v1 line stops at Medusa 2.18 and its v2 line starts at 2.19. Read the README that matches your version.

### 1. Run Meilisearch

```bash
docker run -d -p 7700:7700 -e MEILI_MASTER_KEY=changeme getmeili/meilisearch:latest
```

### 2. Install the plugin

```bash
npm i @rokmohar/medusa-plugin-meilisearch
```

### 3. Configure `medusa-config.ts`

```ts
plugins: [
  {
    resolve: "@rokmohar/medusa-plugin-meilisearch",
    options: {
      config: {
        host: process.env.MEILISEARCH_HOST ?? "",
        apiKey: process.env.MEILISEARCH_API_KEY ?? "",
      },
      settings: {
        products: {
          type: "products",
          indexSettings: {
            searchableAttributes: ["title", "description"],
            filterableAttributes: ["tags", "categories", "price_usd"],
            sortableAttributes: ["price_usd", "created_at"],
          },
          // the plugin documents a transformer hook like this
          transformer: async (product, defaultTransformer, options) => {
            const base = await defaultTransformer(product, options)
            const usd = product.variants
              ?.flatMap((v) => v.prices ?? [])
              .filter((p) => p.currency_code === "usd")
              .map((p) => p.amount)
            return { ...base, price_usd: usd?.length ? Math.min(...usd) : null }
          },
        },
      },
    },
  },
]
```

**Why a flat `price_usd` field?** Some tutorials filter on `variants.prices.amount` plus `variants.prices.currency_code`. Meilisearch array filters do not guarantee both conditions match the same price entry, so a EUR price could pass a USD filter. A flat number is safer and faster.

### 4. Reindex

Start the backend. Products are bulk-indexed on startup, and the plugin's subscribers keep the index in sync when you edit products in the admin.

### 5. Query from the storefront

```
# Art Under $350
GET /store/meilisearch/products?filter=price_usd <= 350

# Art Under $800
GET /store/meilisearch/products?filter=price_usd <= 800

# Combined with a medium and Featured
filter=price_usd <= 350 AND categories = "painting" AND tags = "featured"
```

Parameter names vary between plugin versions, so check the README. You can also call Meilisearch directly from a Next.js server action:

```ts
const res = await meili.index("products").search("", {
  filter: ["price_usd <= 350"],
  sort: ["price_usd:asc"],
  limit: 24,
})
```

Use the **search-only key** in the browser. Never expose the master key.

---

## Option B: Official custom module (full control)

Medusa has an official guide, "Integrate Meilisearch with Medusa".

- Create a module in `src/modules/meilisearch` with a service that adds, removes, and searches documents.
- Add subscribers or workflows that push product changes to the index.
- The Algolia guide follows the same pattern: reindex on product create, update, delete, or on a manual admin trigger.

More work than Option A, but you control exactly which fields are indexed.

---

## Algolia instead?

Same idea, different config:

1. Index a flat `price_usd` field.
2. In the Algolia dashboard, add it under **Configuration → Filtering and Faceting**.
3. Query with `numericFilters: ["price_usd<=350"]`.

The free tier is limited and it is a hosted service, so Meilisearch is usually cheaper for a small art store.

---

## Wiring it to the menu

| Menu item | Link | Storefront behavior |
|---|---|---|
| Art Under $350 | `/store?max_price=350` | read `max_price`, filter `price_usd <= 350` |
| Art Under $800 | `/store?max_price=800` | read `max_price`, filter `price_usd <= 800` |

## Things to watch

- Medusa stores prices per currency and region. If you also sell in INR, add `price_inr` the same way.
- Medusa v2 stores amounts as decimal values in the main currency unit, not cents, so use `350` rather than `35000`. Check a sample indexed document to confirm.
- With around 50 products, you can skip the search engine and filter in a custom API route using `calculated_price`. Meilisearch pays off once you also want typo-tolerant search and faceted filters.

---

## Sources

- [Integrate Meilisearch with Medusa (official docs)](https://docs.medusajs.com/resources/integrations/guides/meilisearch)
- [Integrate Algolia with Medusa (official docs)](https://docs.medusajs.com/plugins/search/algolia)
- [@rokmohar/medusa-plugin-meilisearch](https://medusajs.com/plugins/@rokmoharmedusa-plugin-meilisearch)
- [Meilisearch plugin README](https://medusajs.com/integrations/@rokmoharmedusa-plugin-meilisearch/)
- [Complete Guide on How to Integrate Meilisearch with Medusa.js](https://rigbyjs.com/blog/complete-guide-on-how-to-integrate-meilisearch-with-medusajs)

import { cache } from "react";
import type { HttpTypes } from "@medusajs/types";
import { sdk } from "@/lib/medusa";
import { siteConfig } from "@/lib/config";
import { lowestPrice } from "@/lib/format";

const PRODUCT_FIELDS =
  "*variants.calculated_price,+variants.inventory_quantity,*categories,*collection,+metadata,+material,+width,+height";

// In-memory cache to prevent repetitive 7+ second roundtrips to remote Supabase DB
const memoryCache = new Map<string, { data: unknown; expires: number }>();

export function clearCatalogCache() {
  memoryCache.clear();
}

function getCached<T>(key: string): T | null {
  const item = memoryCache.get(key);
  if (item && item.expires > Date.now()) {
    return item.data as T;
  }
  return null;
}

function setCached(key: string, data: unknown, ttlSeconds = 60) {
  memoryCache.set(key, { data, expires: Date.now() + ttlSeconds * 1000 });
}

/** Pick the region that serves the configured country, else the first region. */
export const getRegion = cache(async (): Promise<HttpTypes.StoreRegion | null> => {
  const cached = getCached<HttpTypes.StoreRegion>("default_region");
  if (cached) return cached;

  try {
    const { regions } = await sdk.store.region.list();
    const region = (
      regions.find((r) =>
        r.countries?.some((c) => c.iso_2 === siteConfig.defaultCountry)
      ) ??
      regions[0] ??
      null
    );
    if (region) setCached("default_region", region, 300); // 5 min TTL
    return region;
  } catch (e) {
    console.error("[medusa] Could not load regions. Is the backend running and the publishable key set?", (e as Error).message);
    return null;
  }
});

export type SortKey = "newest" | "price-asc" | "price-desc";

export type ArtworkQuery = {
  q?: string;
  category?: string; // category handle
  collection?: string; // collection handle
  min?: number;
  max?: number;
  sort?: SortKey;
  page?: number;
};

export type ArtworkPage = {
  products: HttpTypes.StoreProduct[];
  total: number;
  page: number;
  pageCount: number;
};

/**
 * Fetches up to 200 products for the region, then filters, sorts and pages in memory.
 * The Store API has no price-range filter, and an art store catalogue is small enough
 * for this to be fast. Swap for Meilisearch or Algolia if the catalogue grows past ~1,000.
 */
export async function listArtworks(query: ArtworkQuery = {}): Promise<ArtworkPage> {
  const cacheKey = `artworks_${JSON.stringify(query)}`;
  const cached = getCached<ArtworkPage>(cacheKey);
  if (cached) return cached;

  const empty = { products: [], total: 0, page: 1, pageCount: 1 };
  const region = await getRegion();
  if (!region) return empty;

  try {
    const params: Record<string, unknown> = {
      region_id: region.id,
      limit: 200,
      fields: PRODUCT_FIELDS,
      order: "-created_at",
    };
    if (query.q) params.q = query.q;
    if (query.category) {
      const cat = await getCategory(query.category);
      if (!cat) return empty;
      params.category_id = [cat.id];
    }
    if (query.collection) {
      const col = await getCollection(query.collection);
      if (!col) return empty;
      params.collection_id = [col.id];
    }

    const { products } = await sdk.store.product.list(params);
    let result = products;

    if (query.min != null || query.max != null) {
      result = result.filter((p) => {
        const price = lowestPrice(p)?.amount;
        if (price == null) return false;
        if (query.min != null && price < query.min) return false;
        if (query.max != null && price > query.max) return false;
        return true;
      });
    }

    if (query.sort === "price-asc" || query.sort === "price-desc") {
      const dir = query.sort === "price-asc" ? 1 : -1;
      result = [...result].sort(
        (a, b) => ((lowestPrice(a)?.amount ?? 0) - (lowestPrice(b)?.amount ?? 0)) * dir
      );
    }

    const total = result.length;
    const size = siteConfig.pageSize;
    const pageCount = Math.max(1, Math.ceil(total / size));
    const page = Math.min(Math.max(query.page ?? 1, 1), pageCount);
    const resultPage: ArtworkPage = {
      products: result.slice((page - 1) * size, page * size),
      total,
      page,
      pageCount,
    };
    setCached(cacheKey, resultPage, 60);
    return resultPage;
  } catch (e) {
    console.error("[medusa] Could not load products:", (e as Error).message);
    return empty;
  }
}

export async function getProduct(
  handle: string
): Promise<HttpTypes.StoreProduct | null> {
  const cacheKey = `product_${handle}`;
  const cached = getCached<HttpTypes.StoreProduct>(cacheKey);
  if (cached) return cached;

  const region = await getRegion();
  if (!region) return null;
  try {
    const { products } = await sdk.store.product.list({
      handle,
      region_id: region.id,
      limit: 1,
      fields: PRODUCT_FIELDS + ",*images",
    });
    const product = products[0] ?? null;
    if (product) setCached(cacheKey, product, 60);
    return product;
  } catch {
    return null;
  }
}

/** Other works from the same collection, falling back to the newest works. */
export async function listRelated(
  product: HttpTypes.StoreProduct,
  count = 4
): Promise<HttpTypes.StoreProduct[]> {
  const page = await listArtworks({
    collection: product.collection?.handle,
  });
  const others = page.products.filter((p) => p.id !== product.id);
  if (others.length >= count) return others.slice(0, count);
  const fallback = await listArtworks({});
  const ids = new Set(others.map((p) => p.id).concat(product.id));
  return others
    .concat(fallback.products.filter((p) => !ids.has(p.id)))
    .slice(0, count);
}

export const listCategories = cache(
  async (): Promise<HttpTypes.StoreProductCategory[]> => {
    const cached = getCached<HttpTypes.StoreProductCategory[]>("categories_list");
    if (cached) return cached;

    try {
      const { product_categories } = await sdk.store.category.list({
        limit: 100,
        parent_category_id: "null",
      });
      if (product_categories) setCached("categories_list", product_categories, 120);
      return product_categories;
    } catch {
      return [];
    }
  }
);

export const getCategory = cache(
  async (handle: string): Promise<HttpTypes.StoreProductCategory | null> => {
    const cacheKey = `category_${handle}`;
    const cached = getCached<HttpTypes.StoreProductCategory>(cacheKey);
    if (cached) return cached;

    try {
      const { product_categories } = await sdk.store.category.list({
        handle,
        limit: 1,
      });
      const cat = product_categories[0] ?? null;
      if (cat) setCached(cacheKey, cat, 120);
      return cat;
    } catch {
      return null;
    }
  }
);

export interface CuratedCollection {
  id: string;
  handle: string;
  title: string;
  badge: string;
  description: string;
  artworkCount: number;
  image: string;
  alt: string;
}

export const CURATED_COLLECTIONS: CuratedCollection[] = [
  {
    id: "focus",
    handle: "focus",
    badge: "CURATED",
    title: "Focus",
    description:
      "Focus Collections are curated selections of works by new artists, available for a limited-time only.",
    artworkCount: 29,
    image: "/collection-focus.jpg",
    alt: "Focus Collection",
  },
  {
    id: "landscapes",
    handle: "landscapes",
    badge: "CURATED",
    title: "Landscapes",
    description:
      "Familiar places, new perspectives. Explore landscapes transformed through the eyes of contemporary artists.",
    artworkCount: 44,
    image: "/collection-landscapes.jpg",
    alt: "Landscapes Collection",
  },
];

export const listCollections = cache(
  async (): Promise<HttpTypes.StoreCollection[]> => {
    const cached = getCached<HttpTypes.StoreCollection[]>("collections_list");
    if (cached) return cached;

    try {
      const { collections } = await sdk.store.collection.list({ limit: 100 });
      if (collections.length > 0) {
        setCached("collections_list", collections, 120);
        return collections;
      }
    } catch {
      // ignore
    }
    const fallback = CURATED_COLLECTIONS.map((c) => ({
      id: `col_${c.handle}`,
      title: c.title,
      handle: c.handle,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })) as HttpTypes.StoreCollection[];
    setCached("collections_list", fallback, 120);
    return fallback;
  }
);

export const getCollection = cache(
  async (handle: string): Promise<HttpTypes.StoreCollection | null> => {
    try {
      const { collections } = await sdk.store.collection.list({
        handle,
        limit: 1,
      });
      if (collections[0]) return collections[0];
    } catch {
      // ignore
    }
    const curated = CURATED_COLLECTIONS.find((c) => c.handle === handle);
    if (curated) {
      return {
        id: `col_${curated.handle}`,
        title: curated.title,
        handle: curated.handle,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as HttpTypes.StoreCollection;
    }
    return null;
  }
);

/** Fetch specific products by id, used by the saved-works page. */
export async function listProductsByIds(
  ids: string[]
): Promise<HttpTypes.StoreProduct[]> {
  const region = await getRegion();
  if (!region || !ids.length) return [];
  try {
    const { products } = await sdk.store.product.list({
      id: ids.slice(0, 200),
      region_id: region.id,
      limit: 200,
      fields: PRODUCT_FIELDS,
    });
    return products;
  } catch {
    return [];
  }
}

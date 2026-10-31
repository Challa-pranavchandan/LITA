"use server";

import type { HttpTypes } from "@medusajs/types";
import { listProductsByIds } from "@/lib/data/catalog";

export async function fetchSavedProducts(
  ids: string[]
): Promise<HttpTypes.StoreProduct[]> {
  if (!Array.isArray(ids)) return [];

  // Deduplicate and filter valid string identifiers, clamped to 200
  const uniqueIds = Array.from(
    new Set(
      ids.filter(
        (id): id is string =>
          typeof id === "string" && id.trim().length > 0 && id.length <= 128
      )
    )
  ).slice(0, 200);

  if (uniqueIds.length === 0) return [];

  return listProductsByIds(uniqueIds);
}

"use server";

import type { HttpTypes } from "@medusajs/types";
import { listProductsByIds } from "@/lib/data/catalog";

export async function fetchSavedProducts(
  ids: string[]
): Promise<HttpTypes.StoreProduct[]> {
  return listProductsByIds(ids.filter((id) => typeof id === "string").slice(0, 100));
}

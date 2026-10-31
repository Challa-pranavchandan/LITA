"use server";

import { sdk } from "@/lib/medusa";
import { getAuthHeaders } from "@/lib/data/customer";

function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return fallback;
}

export type WishlistResult = {
  ok: boolean;
  product_ids?: string[];
  error?: string;
};

/**
 * Checks if the user is currently authenticated with a customer session.
 */
export async function isCustomerAuthenticated(): Promise<boolean> {
  const authHeaders = await getAuthHeaders();
  return Boolean(authHeaders.authorization);
}

/**
 * Retrieves the server-persisted wishlist for the authenticated customer.
 */
export async function getWishlist(): Promise<string[]> {
  try {
    const authHeaders = await getAuthHeaders();
    if (!authHeaders.authorization) return [];

    const res = await sdk.client.fetch<{ product_ids: string[] }>(
      "/store/customers/me/wishlist",
      {
        method: "GET",
        headers: authHeaders,
        next: { revalidate: 0 },
      }
    );

    return Array.isArray(res.product_ids) ? res.product_ids : [];
  } catch (err: unknown) {
    console.error("[medusa] Failed to fetch customer wishlist:", getErrorMessage(err, ""));
    return [];
  }
}

/**
 * Adds a product to the authenticated customer's wishlist.
 */
export async function addWishlistItem(productId: string): Promise<WishlistResult> {
  try {
    const authHeaders = await getAuthHeaders();
    if (!authHeaders.authorization) {
      return { ok: false, error: "Authentication required" };
    }

    const res = await sdk.client.fetch<{ product_ids: string[] }>(
      "/store/customers/me/wishlist/items",
      {
        method: "POST",
        headers: authHeaders,
        body: { product_id: productId },
      }
    );

    return { ok: true, product_ids: res.product_ids };
  } catch (err: unknown) {
    const message = getErrorMessage(err, "Failed to save artwork.");
    return { ok: false, error: message };
  }
}

/**
 * Removes a product from the authenticated customer's wishlist.
 */
export async function removeWishlistItem(productId: string): Promise<WishlistResult> {
  try {
    const authHeaders = await getAuthHeaders();
    if (!authHeaders.authorization) {
      return { ok: false, error: "Authentication required" };
    }

    const res = await sdk.client.fetch<{ product_ids: string[] }>(
      `/store/customers/me/wishlist/items/${encodeURIComponent(productId)}`,
      {
        method: "DELETE",
        headers: authHeaders,
      }
    );

    return { ok: true, product_ids: res.product_ids };
  } catch (err: unknown) {
    const message = getErrorMessage(err, "Failed to remove artwork from saved list.");
    return { ok: false, error: message };
  }
}

/**
 * Merges guest product IDs into the customer's server wishlist.
 */
export async function mergeWishlist(productIds: string[]): Promise<WishlistResult> {
  try {
    const authHeaders = await getAuthHeaders();
    if (!authHeaders.authorization) {
      return { ok: false, error: "Authentication required" };
    }

    const res = await sdk.client.fetch<{ product_ids: string[] }>(
      "/store/customers/me/wishlist/merge",
      {
        method: "POST",
        headers: authHeaders,
        body: { product_ids: productIds },
      }
    );

    return { ok: true, product_ids: res.product_ids };
  } catch (err: unknown) {
    const message = getErrorMessage(err, "Failed to sync saved artworks.");
    return { ok: false, error: message };
  }
}

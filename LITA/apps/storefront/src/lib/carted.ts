"use client";

/**
 * Lightweight client-side persistence for "already in cart" state.
 *
 * We store an array of variant IDs that have been added to the cart in
 * localStorage under the key `_lita_carted`.
 *
 * When an item is added to the cart, its variant ID is stored in localStorage.
 * On page refresh or revisit, BuyBox checks localStorage and shows "Go to Cart"
 * immediately.
 */

import { useSyncExternalStore, useEffect } from "react";

const KEY = "_lita_carted";

export const CART_CLEARED_EVENT = "lita:cart:cleared";
export const CARTED_CHANGE_EVENT = "lita:carted:change";

// ---------------------------------------------------------------------------
// Low-level read / write (safe against SSR)
// ---------------------------------------------------------------------------

function readIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeIds(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // ignore quota errors
  }
}

function notify() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CARTED_CHANGE_EVENT));
  }
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/** Mark a variant as added to cart (call right after a successful addToCart). */
export function markCarted(variantId: string) {
  if (!variantId) return;
  const ids = readIds();
  if (!ids.includes(variantId)) {
    writeIds([...ids, variantId]);
    notify();
  }
}

/** Remove a specific variant ID (e.g. when removed from cart). */
export function unmarkCarted(variantId: string) {
  if (!variantId) return;
  const ids = readIds().filter((id) => id !== variantId);
  writeIds(ids);
  notify();
}

/** Sync with server cart items. Replaces current list with given IDs. */
export function syncCartedItems(variantIds: string[]) {
  if (typeof window === "undefined") return;
  const current = readIds();
  if (
    current.length === variantIds.length &&
    current.every((id) => variantIds.includes(id))
  ) {
    return;
  }
  writeIds(variantIds);
  notify();
}

/** Merge server cart variant IDs into localStorage (without deleting offline/mock items). */
export function mergeCartedItems(variantIds: string[]) {
  if (typeof window === "undefined" || !variantIds.length) return;
  const current = readIds();
  const next = Array.from(new Set([...current, ...variantIds]));
  if (next.length !== current.length) {
    writeIds(next);
    notify();
  }
}

/** Clear all carted variant IDs (call after checkout / order placed). */
export function clearCarted() {
  writeIds([]);
  notify();
}

/** Check synchronously whether a variant is marked as carted. */
export function isCarted(variantId: string): boolean {
  if (!variantId) return false;
  return readIds().includes(variantId);
}

// ---------------------------------------------------------------------------
// React hook using useSyncExternalStore (hydration-safe, zero lag)
// ---------------------------------------------------------------------------

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener(CARTED_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  window.addEventListener(CART_CLEARED_EVENT, callback);

  return () => {
    window.removeEventListener(CARTED_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
    window.removeEventListener(CART_CLEARED_EVENT, callback);
  };
}

export function useIsCarted(variantId: string, initialInCart = false): boolean {
  useEffect(() => {
    if (initialInCart && variantId && !isCarted(variantId)) {
      markCarted(variantId);
    }
  }, [variantId, initialInCart]);

  const carted = useSyncExternalStore(
    subscribe,
    () => isCarted(variantId),
    () => initialInCart
  );
  return carted;
}

"use client";

import { useSyncExternalStore } from "react";
import {
  getWishlist,
  addWishlistItem,
  removeWishlistItem,
  mergeWishlist,
} from "@/lib/data/saved";
import { showSavedToast } from "@/components/SavedToast";

const KEY = "saved-artworks";
const listeners = new Set<() => void>();
const EMPTY: string[] = [];

let cache: string[] | null = null;
let isUserLoggedIn = false;
let isSyncing = false;
let hasSyncedAuth = false;

function notify() {
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      // Ignore listener error
    }
  });
}

function read(): string[] {
  if (cache !== null) return cache;

  if (isUserLoggedIn) {
    return EMPTY;
  }

  if (typeof window === "undefined") {
    return EMPTY;
  }

  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(ids: string[]) {
  cache = ids;

  if (!isUserLoggedIn && typeof window !== "undefined") {
    try {
      localStorage.setItem(KEY, JSON.stringify(ids));
    } catch {
      /* storage unavailable; saved works last for this visit only */
    }
  }

  notify();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY && !isUserLoggedIn) {
      cache = null;
      cb();
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }

  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

export function useSaved(): string[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export async function toggleSaved(id: string): Promise<void> {
  const current = read();
  const exists = current.includes(id);
  const next = exists ? current.filter((x) => x !== id) : [...current, id];

  if (!isUserLoggedIn) {
    // Guest mode: update local storage directly
    write(next);
    return;
  }

  // Logged-in mode: Optimistic update
  write(next);

  try {
    const res = exists
      ? await removeWishlistItem(id)
      : await addWishlistItem(id);

    if (res.ok && Array.isArray(res.product_ids)) {
      write(res.product_ids);
    } else {
      // Rollback on server failure
      write(current);
      showSavedToast(res.error || "Could not update saved artworks.");
    }
  } catch (err: unknown) {
    // Rollback on network/unexpected error
    write(current);
    const msg =
      err instanceof Error ? err.message : "Network error. Please try again.";
    showSavedToast(msg);
  }
}

/**
 * Syncs the saved store with customer authentication state.
 * - When logged in: merges guest localStorage items to the server list,
 *   clears guest localStorage, and populates the in-memory cache with the server list.
 * - When logged out: resets the store to guest mode with an empty list.
 */
export async function syncSavedWithAuth(isLoggedIn: boolean): Promise<void> {
  if (isLoggedIn) {
    if (isUserLoggedIn && hasSyncedAuth) return;
    if (isSyncing) return;

    isSyncing = true;
    isUserLoggedIn = true;

    try {
      let guestIds: string[] = [];
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem(KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              guestIds = parsed.filter((x) => typeof x === "string");
            }
          }
        } catch {
          guestIds = [];
        }
      }

      if (guestIds.length > 0) {
        const mergeRes = await mergeWishlist(guestIds);
        if (mergeRes.ok && Array.isArray(mergeRes.product_ids)) {
          if (typeof window !== "undefined") {
            try {
              localStorage.removeItem(KEY);
            } catch {
              // ignore
            }
          }
          write(mergeRes.product_ids);
          hasSyncedAuth = true;
          return;
        }
      }

      // If no guest IDs or merge had an issue, fetch server wishlist directly
      const serverIds = await getWishlist();
      write(serverIds);
      hasSyncedAuth = true;
    } catch (err) {
      console.error("[saved] Failed to sync saved items with server:", err);
    } finally {
      isSyncing = false;
    }
  } else {
    // Logged out
    const wasLoggedIn = isUserLoggedIn;
    isUserLoggedIn = false;
    hasSyncedAuth = false;

    if (wasLoggedIn) {
      // Clear storage on logout to avoid leaking saves on shared devices
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(KEY);
        } catch {
          // ignore
        }
      }
      write([]);
    } else {
      // Re-read local storage for guest
      cache = null;
      notify();
    }
  }
}

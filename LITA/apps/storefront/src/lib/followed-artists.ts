"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "lita_followed_artists";
const INITIAL_ARTISTS = ["Amber Hearn"];

const listeners = new Set<() => void>();
let memoryCache: string[] | null = null;

function readFromStorage(): string[] {
  if (memoryCache !== null) return memoryCache;
  if (typeof window === "undefined") return INITIAL_ARTISTS;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Initialize with default artist so the account dashboard matches the design
      memoryCache = INITIAL_ARTISTS;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ARTISTS));
      return memoryCache;
    }
    const parsed = JSON.parse(raw);
    memoryCache = Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    memoryCache = INITIAL_ARTISTS;
  }
  return memoryCache;
}

function writeToStorage(artists: string[]) {
  memoryCache = artists;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(artists));
    } catch {
      // LocalStorage might be full or disabled
    }
  }
  listeners.forEach((listener) => listener());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      memoryCache = null;
      callback();
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
  }
  return () => {
    listeners.delete(callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorage);
    }
  };
}

export function useFollowedArtists(): string[] {
  return useSyncExternalStore(subscribe, readFromStorage, () => INITIAL_ARTISTS);
}

export function toggleFollowArtist(name: string): boolean {
  const current = readFromStorage();
  const exists = current.includes(name);
  const next = exists ? current.filter((a) => a !== name) : [...current, name];
  writeToStorage(next);
  return !exists;
}

export function isFollowingArtist(name: string): boolean {
  return readFromStorage().includes(name);
}

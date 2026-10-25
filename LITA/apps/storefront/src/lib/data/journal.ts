import { cache } from "react";
import { sdk } from "@/lib/medusa";

export type JournalPostSummary = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  tags: string[] | null;
};

export type JournalPostDetail = JournalPostSummary & {
  content: string;
};

// In-memory cache for storefront speed
const journalCache = new Map<string, { data: unknown; expires: number }>();

function getCached<T>(key: string): T | null {
  const item = journalCache.get(key);
  if (item && item.expires > Date.now()) {
    return item.data as T;
  }
  return null;
}

function setCached(key: string, data: unknown, ttlSeconds = 60) {
  journalCache.set(key, { data, expires: Date.now() + ttlSeconds * 1000 });
}

export const listJournalPosts = cache(async (): Promise<JournalPostSummary[]> => {
  const cacheKey = "journal_posts_list";
  const cached = getCached<JournalPostSummary[]>(cacheKey);
  if (cached) return cached;

  try {
    const data = await sdk.client.fetch<{ posts: JournalPostSummary[] }>("/store/journal");
    const posts = data.posts || [];
    setCached(cacheKey, posts, 60); // 60s cache
    return posts;
  } catch (error) {
    console.error("[medusa] Failed to fetch journal posts:", (error as Error).message);
    return [];
  }
});

export const getJournalPost = cache(async (slug: string): Promise<JournalPostDetail | null> => {
  const cacheKey = `journal_post_${slug}`;
  const cached = getCached<JournalPostDetail>(cacheKey);
  if (cached) return cached;

  try {
    const data = await sdk.client.fetch<{ post: JournalPostDetail }>(`/store/journal/${slug}`);
    if (data?.post) {
      setCached(cacheKey, data.post, 60);
      return data.post;
    }
    return null;
  } catch (error) {
    console.error(`[medusa] Failed to fetch journal post "${slug}":`, (error as Error).message);
    return null;
  }
});

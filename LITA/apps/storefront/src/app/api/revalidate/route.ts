import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { clearCatalogCache } from "@/lib/data/catalog";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { secret, tag, path, event } = body;

    if (secret !== process.env.REVALIDATE_SECRET) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // 1. Wipe the in-memory catalog cache completely so fresh queries hit the database
    clearCatalogCache();

    // 2. Revalidate Next.js cache tags
    const tagsToRevalidate = tag
      ? [tag]
      : ["gallery", "products", "categories", "collections"];

    for (const t of tagsToRevalidate) {
      try {
        revalidateTag(t);
      } catch {
        // ignore if tag not present in cache
      }
    }

    // 3. Revalidate App Router layouts and pages
    try {
      revalidatePath("/", "layout");
      revalidatePath("/artworks", "page");
      revalidatePath("/collections", "page");
      revalidatePath("/gallery", "page");
      if (path) {
        revalidatePath(path);
      }
    } catch {
      // ignore
    }

    return NextResponse.json({
      ok: true,
      clearedMemoryCache: true,
      revalidatedPaths: ["/", "/artworks", "/collections", "/gallery", ...(path ? [path] : [])],
      revalidatedTags: tagsToRevalidate,
      event: event || null,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  clearCatalogCache();

  try {
    revalidateTag("gallery");
    revalidateTag("products");
    revalidateTag("categories");
    revalidateTag("collections");
  } catch {}

  try {
    revalidatePath("/", "layout");
    revalidatePath("/artworks", "page");
    revalidatePath("/collections", "page");
  } catch {}

  return NextResponse.json({
    ok: true,
    message: "Storefront cache wiped and layout revalidated successfully.",
    clearedMemoryCache: true,
  });
}

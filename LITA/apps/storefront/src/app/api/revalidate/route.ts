import { revalidatePath, revalidateTag } from "next/cache"
import { NextResponse } from "next/server"
import { clearCatalogCache } from "@/lib/data/catalog"
import { verifyRevalidateSecret } from "@/lib/security/revalidate-auth"

export async function POST(req: Request) {
  try {
    const headerSecret = req.headers.get("x-revalidate-secret")

    let bodySecret: string | undefined
    let tag: string | undefined
    let path: string | undefined

    try {
      const body = await req.json().catch(() => ({}))
      if (body && typeof body === "object") {
        if (typeof body.secret === "string") {
          bodySecret = body.secret
        }
        if (typeof body.tag === "string") {
          tag = body.tag
        }
        if (typeof body.path === "string") {
          path = body.path
        }
      }
    } catch {
      // Body is optional or empty
    }

    const providedSecret = headerSecret || bodySecret

    if (!verifyRevalidateSecret(providedSecret)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    // 1. Wipe in-memory catalog cache so fresh requests re-query the backend
    clearCatalogCache()

    // 2. Revalidate Next.js cache tags
    const tagsToRevalidate = tag
      ? [tag]
      : ["gallery", "products", "categories", "collections"]

    for (const t of tagsToRevalidate) {
      try {
        revalidateTag(t)
      } catch {
        // Ignore tag errors if not cached
      }
    }

    // 3. Revalidate App Router layouts and pages
    try {
      revalidatePath("/", "layout")
      revalidatePath("/artworks", "page")
      revalidatePath("/collections", "page")
      revalidatePath("/gallery", "page")
      if (path) {
        revalidatePath(path)
      }
    } catch {
      // Ignore layout revalidation errors
    }

    return NextResponse.json({ ok: true, revalidated: true })
  } catch (_error) {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 })
  }
}

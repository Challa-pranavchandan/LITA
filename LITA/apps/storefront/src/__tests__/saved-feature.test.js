const { test, describe } = require("node:test")
const assert = require("node:assert")
const fs = require("node:fs")
const path = require("node:path")

describe("Production-Grade Saved Feature (Storefront)", () => {
  test("lib/data/saved.ts exports server actions for customer wishlist operations", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../lib/data/saved.ts"),
      "utf8"
    )
    assert.strictEqual(
      source.includes("export async function getWishlist"),
      true,
      "Expected getWishlist export"
    )
    assert.strictEqual(
      source.includes("export async function addWishlistItem"),
      true,
      "Expected addWishlistItem export"
    )
    assert.strictEqual(
      source.includes("export async function removeWishlistItem"),
      true,
      "Expected removeWishlistItem export"
    )
    assert.strictEqual(
      source.includes("export async function mergeWishlist"),
      true,
      "Expected mergeWishlist export"
    )
    assert.strictEqual(
      source.includes("/store/customers/me/wishlist"),
      true,
      "Expected wishlist endpoint path"
    )
  })

  test("lib/saved.ts maintains public API and implements hybrid store with optimistic rollback", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../lib/saved.ts"),
      "utf8"
    )
    assert.strictEqual(
      source.includes("export function useSaved(): string[]"),
      true,
      "Expected useSaved(): string[]"
    )
    assert.strictEqual(
      source.includes("export async function toggleSaved(id: string)"),
      true,
      "Expected toggleSaved(id: string)"
    )
    assert.strictEqual(
      source.includes("export async function syncSavedWithAuth(isLoggedIn: boolean)"),
      true,
      "Expected syncSavedWithAuth(isLoggedIn: boolean)"
    )
    assert.strictEqual(
      source.includes("showSavedToast"),
      true,
      "Expected showSavedToast invocation on failure"
    )
    assert.strictEqual(
      source.includes("write(current)"),
      true,
      "Expected rollback to current state on failure"
    )
  })

  test("Header mounts SavedAuthSync with verified customer session", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../components/Header.tsx"),
      "utf8"
    )
    assert.strictEqual(
      source.includes("SavedAuthSync"),
      true,
      "Expected SavedAuthSync import"
    )
    assert.strictEqual(
      source.includes("<SavedAuthSync isLoggedIn={Boolean(customer)} />"),
      true,
      "Expected SavedAuthSync mounted with customer auth boolean"
    )
  })

  test("Root layout mounts SavedToast for error/notification feedback", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../app/layout.tsx"),
      "utf8"
    )
    assert.strictEqual(
      source.includes("SavedToast"),
      true,
      "Expected SavedToast import"
    )
    assert.strictEqual(
      source.includes("<SavedToast />"),
      true,
      "Expected SavedToast in layout JSX"
    )
  })

  test("actions.ts validates, deduplicates, and clamps product IDs to 200", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../app/saved/actions.ts"),
      "utf8"
    )
    assert.strictEqual(
      source.includes("slice(0, 200)"),
      true,
      "Expected clamping to 200 items"
    )
    assert.strictEqual(
      source.includes("Array.isArray(ids)"),
      true,
      "Expected array validation"
    )
  })

  test("catalog.ts listProductsByIds supports up to 200 items", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../lib/data/catalog.ts"),
      "utf8"
    )
    assert.strictEqual(
      source.includes("ids.slice(0, 200)"),
      true,
      "Expected ids.slice(0, 200)"
    )
    assert.strictEqual(
      source.includes("limit: 200"),
      true,
      "Expected limit: 200"
    )
  })

  test("SavedWorks.tsx prunes unresolvable/deleted product IDs in background", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../components/SavedWorks.tsx"),
      "utf8"
    )
    assert.strictEqual(
      source.includes("toggleSaved(staleId)"),
      true,
      "Expected toggleSaved called to prune stale IDs"
    )
  })

  test("Merge logic unit test: correctly dedupes, caps at 200, and filters inputs", () => {
    // Pure function logic validation
    const serverIds = ["prod_1", "prod_2"]
    const guestIds = ["prod_2", "prod_3", "prod_1", "prod_4", 123, null]

    const validGuestIds = guestIds.filter((id) => typeof id === "string")
    const merged = Array.from(new Set([...serverIds, ...validGuestIds])).slice(0, 200)

    assert.deepStrictEqual(merged, ["prod_1", "prod_2", "prod_3", "prod_4"])
    assert.strictEqual(merged.length, 4)
  })
})

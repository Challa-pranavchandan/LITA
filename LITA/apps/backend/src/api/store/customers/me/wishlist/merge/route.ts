import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { z } from "zod"
import { WISHLIST_MODULE } from "../../../../../../modules/wishlist"
import WishlistModuleService from "../../../../../../modules/wishlist/service"

export const PostWishlistMergeSchema = z.object({
  product_ids: z.array(
    z.string().min(1, "Product ID cannot be empty").max(100)
  ).max(200, "Cannot merge more than 200 product IDs at once"),
})

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Authentication required." })
  }

  const validation = PostWishlistMergeSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({
      message: validation.error.issues[0]?.message || "Invalid request body.",
    })
  }

  const rawIds = validation.data.product_ids
  // 1. Dedupe raw IDs preserving order
  const dedupeIds = Array.from(new Set(rawIds))

  const wishlistService: WishlistModuleService = req.scope.resolve(WISHLIST_MODULE)
  const productService: any = req.scope.resolve(Modules.PRODUCT)

  // 2. Filter out IDs that do not exist in the catalog
  let validIds: string[] = []
  if (dedupeIds.length > 0) {
    try {
      const [existingProducts] = await productService.listAndCountProducts(
        { id: dedupeIds },
        { take: 200, select: ["id"] }
      )
      const existingProductIds = new Set(existingProducts.map((p: any) => p.id))
      validIds = dedupeIds.filter((id) => existingProductIds.has(id))
    } catch {
      validIds = []
    }
  }

  // 3. Fetch existing wishlist items for customer
  const currentItems = await wishlistService.listWishlistItems(
    { customer_id: customerId },
    {
      order: { created_at: "DESC" },
      take: 200,
    }
  )

  const currentProductIds = new Set(currentItems.map((item: any) => item.product_id))

  // 4. Identify new IDs not yet saved
  const newProductIds = validIds.filter((id) => !currentProductIds.has(id))

  // 5. Respect 200 cap
  const availableSlots = Math.max(0, 200 - currentItems.length)
  const toAdd = newProductIds.slice(0, availableSlots)

  // 6. Batch create new items
  if (toAdd.length > 0) {
    await wishlistService.createWishlistItems(
      toAdd.map((product_id) => ({
        customer_id: customerId,
        product_id,
      }))
    )

    // 7. Emit events
    try {
      const eventBus: any = req.scope.resolve(Modules.EVENT_BUS)
      if (eventBus && typeof eventBus.emit === "function") {
        for (const product_id of toAdd) {
          await eventBus.emit({
            name: "wishlist.item_added",
            data: {
              customer_id: customerId,
              product_id,
            },
          })
        }
      }
    } catch {
      // Non-blocking event emission
    }
  }

  // 8. Return full merged list (newest first)
  const mergedItems = await wishlistService.listWishlistItems(
    { customer_id: customerId },
    {
      order: { created_at: "DESC" },
      take: 200,
    }
  )

  const product_ids = mergedItems.map((item: any) => item.product_id)
  return res.status(200).json({ success: true, product_ids })
}

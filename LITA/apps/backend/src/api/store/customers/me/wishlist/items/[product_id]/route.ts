import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { WISHLIST_MODULE } from "../../../../../../../modules/wishlist"
import WishlistModuleService from "../../../../../../../modules/wishlist/service"

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Authentication required." })
  }

  const { product_id } = req.params
  if (!product_id) {
    return res.status(400).json({ message: "product_id is required." })
  }

  const wishlistService: WishlistModuleService = req.scope.resolve(WISHLIST_MODULE)

  // 1. Find existing record
  const existing = await wishlistService.listWishlistItems(
    {
      customer_id: customerId,
      product_id,
    },
    { take: 1 }
  )

  if (existing.length > 0) {
    await wishlistService.deleteWishlistItems(existing.map((item: any) => item.id))

    // 2. Emit event
    try {
      const eventBus: any = req.scope.resolve(Modules.EVENT_BUS)
      if (eventBus && typeof eventBus.emit === "function") {
        await eventBus.emit({
          name: "wishlist.item_removed",
          data: {
            customer_id: customerId,
            product_id,
          },
        })
      }
    } catch {
      // Non-blocking event emission
    }
  }

  // 3. Return updated list
  const remaining = await wishlistService.listWishlistItems(
    { customer_id: customerId },
    {
      order: { created_at: "DESC" },
      take: 200,
    }
  )

  const product_ids = remaining.map((item: any) => item.product_id)
  return res.status(200).json({ success: true, product_ids })
}

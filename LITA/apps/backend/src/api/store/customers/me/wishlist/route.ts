import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { WISHLIST_MODULE } from "../../../../../modules/wishlist"
import WishlistModuleService from "../../../../../modules/wishlist/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Authentication required." })
  }

  const wishlistService: WishlistModuleService = req.scope.resolve(WISHLIST_MODULE)

  const items = await wishlistService.listWishlistItems(
    { customer_id: customerId },
    {
      order: { created_at: "DESC" },
      take: 200,
    }
  )

  const product_ids = items.map((item: any) => item.product_id)

  return res.status(200).json({ product_ids })
}

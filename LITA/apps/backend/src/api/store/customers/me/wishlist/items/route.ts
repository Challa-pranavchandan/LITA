import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { z } from "zod"
import { WISHLIST_MODULE } from "../../../../../../modules/wishlist"
import WishlistModuleService from "../../../../../../modules/wishlist/service"

export const PostWishlistItemSchema = z.object({
  product_id: z.string().min(1, "product_id cannot be empty").max(100),
})

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Authentication required." })
  }

  const validation = PostWishlistItemSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({
      message: validation.error.issues[0]?.message || "Invalid request body.",
    })
  }

  const { product_id } = validation.data
  const productService: any = req.scope.resolve(Modules.PRODUCT)
  const wishlistService: WishlistModuleService = req.scope.resolve(WISHLIST_MODULE)

  // 1. Confirm product exists
  try {
    const product = await productService.retrieveProduct(product_id).catch(() => null)
    if (!product) {
      return res.status(404).json({ message: `Product with ID ${product_id} not found.` })
    }
  } catch {
    return res.status(404).json({ message: `Product with ID ${product_id} not found.` })
  }

  // 2. Fetch existing items to check idempotency and cap
  const existingItems = await wishlistService.listWishlistItems(
    { customer_id: customerId },
    {
      order: { created_at: "DESC" },
      take: 250,
    }
  )

  const isAlreadySaved = existingItems.some((item: any) => item.product_id === product_id)
  if (isAlreadySaved) {
    const product_ids = existingItems.map((item: any) => item.product_id)
    return res.status(200).json({ success: true, product_ids })
  }

  // 3. Check 200 items cap
  if (existingItems.length >= 200) {
    return res.status(422).json({
      message: "Wishlist cannot exceed 200 items.",
    })
  }

  // 4. Create wishlist item
  await wishlistService.createWishlistItems({
    customer_id: customerId,
    product_id,
  })

  // 5. Emit event
  try {
    const eventBus: any = req.scope.resolve(Modules.EVENT_BUS)
    if (eventBus && typeof eventBus.emit === "function") {
      await eventBus.emit({
        name: "wishlist.item_added",
        data: {
          customer_id: customerId,
          product_id,
        },
      })
    }
  } catch {
    // Non-blocking event emission
  }

  // 6. Return updated product_ids (newest first)
  const updatedItems = await wishlistService.listWishlistItems(
    { customer_id: customerId },
    {
      order: { created_at: "DESC" },
      take: 200,
    }
  )
  const product_ids = updatedItems.map((item: any) => item.product_id)

  return res.status(200).json({ success: true, product_ids })
}

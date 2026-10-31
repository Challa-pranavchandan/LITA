import { model } from "@medusajs/framework/utils"

export const WishlistItem = model
  .define("wishlist_item", {
    id: model.id({ prefix: "wl" }).primaryKey(),
    customer_id: model.text().index(),
    product_id: model.text().index(),
  })
  .indexes([
    {
      on: ["customer_id", "product_id"],
      unique: true,
    },
  ])

export default WishlistItem

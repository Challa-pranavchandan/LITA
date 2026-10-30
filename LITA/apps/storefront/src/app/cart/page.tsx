import type { Metadata } from "next";
import { getCart } from "@/lib/data/cart";
import { CartView } from "@/components/CartView";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your Cart" };

export default async function CartPage() {
  const cart = await getCart();

  return <CartView cart={cart} />;
}


import { getCart } from "@/lib/data/cart";
import { CartView } from "@/components/CartView";
import { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Your Cart",
  description: "View your cart",
};

export default async function Cart() {
  const cart = await getCart();

  return <CartView cart={cart} />;
}


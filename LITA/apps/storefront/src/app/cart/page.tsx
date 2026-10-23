import type { Metadata } from "next";
import Link from "next/link";
import { getCart } from "@/lib/data/cart";
import { CartLines, OrderTotals, PromoCode } from "@/components/CartLines";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your bag" };

export default async function CartPage() {
  const cart = await getCart();
  const items = cart?.items ?? [];

  if (!cart || items.length === 0) {
    return (
      <div className="page py-24 text-center">
        <h1 className="text-3xl">Your bag is empty</h1>
        <p className="mt-2 text-graphite">Artworks you add will wait here.</p>
        <Link href="/artworks" className="btn-solid mt-8">Browse artwork</Link>
      </div>
    );
  }

  return (
    <div className="page py-10">
      <h1 className="mb-8 text-3xl">Your bag</h1>
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16">
        <CartLines cart={cart} />
        <aside className="h-fit space-y-6 border border-mist bg-wall p-6">
          <PromoCode cart={cart} />
          <OrderTotals cart={cart} />
          <Link href="/checkout" className="btn-solid w-full">Go to checkout</Link>
          <Link href="/artworks" className="link block text-center text-sm">Keep browsing</Link>
        </aside>
      </div>
    </div>
  );
}

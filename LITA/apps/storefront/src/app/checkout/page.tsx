import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  attachCustomerToCart,
  getCart,
  listPaymentProviders,
  listShippingOptions,
} from "@/lib/data/cart";
import { getCustomer } from "@/lib/data/customer";
import { getRegion } from "@/lib/data/catalog";
import { CheckoutFlow } from "@/components/CheckoutFlow";
import { OrderTotals, PromoCode } from "@/components/CartLines";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const customer = await getCustomer();
  if (customer) await attachCustomerToCart();

  const [cart, region] = await Promise.all([getCart(), getRegion()]);

  if (!cart || !(cart.items ?? []).length) {
    return (
      <div className="page py-24 text-center">
        <h1 className="text-3xl">Nothing to check out yet</h1>
        <p className="mt-2 text-graphite">Add an artwork to your bag first.</p>
        <Link href="/artworks" className="btn-solid mt-8">Browse artwork</Link>
      </div>
    );
  }

  const [shippingOptions, providers] = await Promise.all([
    listShippingOptions(),
    listPaymentProviders(),
  ]);

  const countries = (region?.countries ?? [])
    .filter((c) => c.iso_2)
    .map((c) => ({ iso_2: c.iso_2!, name: c.display_name ?? c.name ?? c.iso_2! }));

  return (
    <div className="page py-10">
      <h1 className="mb-8 text-3xl">Checkout</h1>
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-20">
        <CheckoutFlow
          cart={cart}
          countries={countries}
          shippingOptions={shippingOptions}
          providers={providers}
          customerEmail={customer?.email}
        />
        <aside className="h-fit space-y-6 border border-mist bg-wall p-6 lg:sticky lg:top-24">
          <h2 className="text-lg">Your order</h2>
          <ul className="space-y-4">
            {(cart.items ?? []).map((item) => (
              <li key={item.id} className="flex gap-4">
                <div className="relative h-20 w-16 shrink-0 bg-mist">
                  {item.thumbnail && <Image src={item.thumbnail} alt="" fill sizes="64px" className="object-cover" />}
                </div>
                <div className="flex-1 text-[15px]">
                  <p className="font-serif italic leading-snug">{item.product_title ?? item.title}</p>
                  <p className="text-graphite">Quantity {item.quantity}</p>
                </div>
                <p className="text-[15px] tabular-nums">{formatMoney(item.total, cart.currency_code)}</p>
              </li>
            ))}
          </ul>
          <PromoCode cart={cart} />
          <OrderTotals cart={cart} />
          <Link href="/cart" className="link block text-center text-sm">Edit bag</Link>
        </aside>
      </div>
    </div>
  );
}

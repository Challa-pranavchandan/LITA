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
import { CheckoutFlow } from "@/components/CheckoutFlow";
import { OrderTotals, PromoCode } from "@/components/CartLines";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Secure Checkout | Livin In The Art",
  description: "Complete your fine art acquisition securely with insured delivery.",
};

export default async function CheckoutPage() {
  let [customer, cart, shippingOptions, providers] = await Promise.all([
    getCustomer().catch(() => null),
    getCart().catch(() => null),
    listShippingOptions().catch(() => []),
    listPaymentProviders().catch(() => []),
  ]);

  if (customer && cart && cart.customer_id !== customer.id) {
    await attachCustomerToCart();
    cart = await getCart();
  }

  if (!cart || !(cart.items ?? []).length) {
    return (
      <div className="page py-24 sm:py-32 text-center max-w-xl mx-auto">
        <span className="block text-xs font-sans font-medium uppercase tracking-[0.25em] text-[#5C6168] mb-3">
          Collector Checkout
        </span>
        <h1
          className="font-cormorant text-4xl sm:text-5xl font-normal text-ink mb-3"
          style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
        >
          Your Bag is Empty
        </h1>
        <p className="text-sm sm:text-base text-graphite mb-8">
          You have not added any artworks to your bag yet. Explore our curated catalog of original fine art.
        </p>
        <Link href="/artworks" className="btn-solid">
          Browse Artwork &rarr;
        </Link>
      </div>
    );
  }

  return (
    <div className="page py-10 md:py-14">
      <header className="mb-10 border-b border-[#E5E7EB] pb-6">
        <span className="block text-xs font-sans font-medium uppercase tracking-[0.25em] text-[#5C6168] mb-2">
          Fine Art Acquisition
        </span>
        <h1
          className="font-cormorant text-4xl sm:text-5xl font-normal text-ink leading-none tracking-tight"
          style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
        >
          Secure Checkout
        </h1>
      </header>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-20">
        <CheckoutFlow
          cart={cart}
          shippingOptions={shippingOptions}
          providers={providers}
          customerEmail={customer?.email}
          customerFirstName={customer?.first_name ?? undefined}
          customerLastName={customer?.last_name ?? undefined}
          customerPhone={customer?.phone ?? undefined}
          customerAddresses={customer?.addresses ?? []}
        />
        <aside className="border-t border-mist pt-8 lg:border-t-0 lg:pt-0">
          <div className="lg:sticky lg:top-24 bg-[#FAF9F7] border border-[#E5E5E5] p-6 sm:p-7">
            <h2
              className="text-2xl font-normal text-ink mb-6 pb-3 border-b border-[#E5E5E5]"
              style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
            >
              Order Summary
            </h2>
            <ul className="mb-6 divide-y divide-mist">
              {(cart.items ?? []).map((item) => (
                <li key={item.id} className="flex gap-4 py-3 text-sm">
                  {item.thumbnail ? (
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden bg-mist border border-[#E5E5E5]">
                      <Image
                        src={item.thumbnail}
                        alt={item.title ?? "Artwork"}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.title}</p>
                    <p className="text-xs text-graphite">Qty {item.quantity}</p>
                  </div>
                  <p className="text-right font-medium tabular-nums">
                    {formatMoney(item.unit_price, cart.currency_code)}
                  </p>
                </li>
              ))}
            </ul>
            <PromoCode cart={cart} />
            <div className="mt-4 border-t border-mist pt-4">
              <OrderTotals cart={cart} />
            </div>
            <div className="mt-6 border-t border-[#E5E5E5] pt-4 text-xs text-graphite space-y-1.5">
              <p className="flex items-center gap-1.5">
                <span className="text-emerald-700 font-bold">✓</span> Museum-grade archival packaging
              </p>
              <p className="flex items-center gap-1.5">
                <span className="text-emerald-700 font-bold">✓</span> Fully insured domestic transit
              </p>
              <p className="flex items-center gap-1.5">
                <span className="text-emerald-700 font-bold">✓</span> Artist Certificate of Authenticity (COA)
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

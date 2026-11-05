import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrder } from "@/lib/data/cart";
import { OrderTotals } from "@/components/CartLines";
import { formatMoney } from "@/lib/format";
import { getUpiPayment } from "@/lib/data/upi";
import { UpiPayPanel } from "@/components/upi/UpiPayPanel";
import { getOrderTracking } from "@/lib/data/order-tracking";
import { LiveOrderStatus } from "@/components/LiveOrderStatus";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Order Placed | Livin In The Art",
  robots: { index: false },
};

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pay?: string }>;
}) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();
  const [{ pay }, upiResult, trackingResult] = await Promise.all([
    searchParams,
    getUpiPayment(id),
    getOrderTracking(id),
  ]);
  const showUpiPanel = pay === "upi" || Boolean(upiResult.payment);
  const a = order.shipping_address;

  return (
    <div className="page max-w-3xl py-12 md:py-16">
      {/* ── Editorial Header ── */}
      <header className="mb-10 border-b border-[#E5E7EB] pb-8">
        <span className="block text-xs font-sans font-medium uppercase tracking-[0.25em] text-[#5C6168] mb-2">
          Acquisition Confirmed
        </span>
        <h1
          className="font-cormorant text-3xl sm:text-4xl md:text-5xl font-normal text-ink leading-tight tracking-tight"
          style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
        >
          Thank you for collecting with LITA
        </h1>
        <p className="mt-3 text-sm sm:text-base text-graphite leading-relaxed">
          Order reference{" "}
          <strong className="text-ink font-medium">
            {order.display_id ? `#${order.display_id}` : order.id}
          </strong>
          . A formal collector summary has been dispatched to{" "}
          <strong className="text-ink font-medium">{order.email}</strong>.
        </p>
      </header>

      <LiveOrderStatus
        orderId={id}
        initialStatus={order.status}
        initialPaymentStatus={order.payment_status}
        initialFulfillmentStatus={order.fulfillment_status}
        initialTracking={trackingResult.fulfillments}
        initialTrackingError={trackingResult.error ?? null}
      />

      {showUpiPanel && upiResult.payment && (
        <UpiPayPanel orderId={id} initialPayment={upiResult.payment} />
      )}
      {pay === "upi" && !upiResult.payment && (
        <p role="alert" className="mt-8 border border-dust bg-wall p-4 text-sm">
          {upiResult.error ??
            "UPI payment instructions could not be found. Please contact the studio for help."}
        </p>
      )}

      <ul className="mt-10 divide-y divide-mist border-y border-mist">
        {(order.items ?? []).map((item) => (
          <li key={item.id} className="flex gap-4 py-5">
            <div className="relative h-24 w-20 shrink-0 bg-mist border border-[#E5E5E5] overflow-hidden">
              {item.thumbnail && (
                <Image
                  src={item.thumbnail}
                  alt={item.title ?? "Artwork"}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="font-cormorant text-xl text-ink font-normal leading-snug"
                style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
              >
                {item.product_title ?? item.title}
              </p>
              <p className="text-xs uppercase tracking-wider text-graphite mt-1">Quantity {item.quantity}</p>
            </div>
            <p className="tabular-nums font-medium text-ink">
              {formatMoney(item.total, order.currency_code)}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-8 grid gap-10 sm:grid-cols-2 bg-[#FAF9F7] border border-[#E5E5E5] p-6 sm:p-7">
        <div>
          <h2 className="mb-2 text-xs uppercase tracking-wider font-semibold text-graphite">
            Delivering to
          </h2>
          {a && (
            <address className="not-italic text-sm text-[#333333] leading-relaxed">
              <strong className="block text-ink font-medium">
                {a.first_name} {a.last_name}
              </strong>
              {a.address_1}
              {a.address_2 ? `, ${a.address_2}` : ""}
              <br />
              {a.city}, {a.province} {a.postal_code}
              <br />
              {a.phone && <span className="block mt-1 text-xs text-graphite">{a.phone}</span>}
            </address>
          )}
        </div>
        <div>
          <OrderTotals cart={order} />
        </div>
      </div>

      <div className="mt-12 flex justify-between items-center border-t border-[#E5E7EB] pt-8">
        <Link href="/artworks" className="btn-line">
          &larr; Return to Catalog
        </Link>
        <Link href="/account" className="btn-solid">
          View in Account &rarr;
        </Link>
      </div>
    </div>
  );
}

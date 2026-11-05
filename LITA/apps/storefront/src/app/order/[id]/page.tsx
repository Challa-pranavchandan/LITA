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
export const metadata: Metadata = { title: "Order placed", robots: { index: false } };

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
    <div className="page max-w-3xl py-14">
      <h1 className="text-3xl">Thank you, your order is placed</h1>
      <p className="mt-2 text-graphite">
        Order number {order.display_id ? `#${order.display_id}` : order.id}. A confirmation will be sent to {order.email}.
      </p>

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
            <div className="relative h-24 w-20 shrink-0 bg-mist">
              {item.thumbnail && <Image src={item.thumbnail} alt="" fill sizes="80px" className="object-cover" />}
            </div>
            <div className="flex-1">
              <p className="font-serif text-lg italic">{item.product_title ?? item.title}</p>
              <p className="text-sm text-graphite">Quantity {item.quantity}</p>
            </div>
            <p className="tabular-nums">{formatMoney(item.total, order.currency_code)}</p>
          </li>
        ))}
      </ul>

      <div className="mt-8 grid gap-10 sm:grid-cols-2">
        <div>
          <h2 className="mb-2 text-sm text-graphite">Delivering to</h2>
          {a && (
            <address className="not-italic leading-relaxed">
              {a.first_name} {a.last_name}<br />
              {a.address_1}{a.address_2 ? `, ${a.address_2}` : ""}<br />
              {a.city}, {a.province} {a.postal_code}
            </address>
          )}
        </div>
        <OrderTotals cart={order} />
      </div>

      <Link href="/artworks" className="btn-line mt-12">Keep browsing</Link>
    </div>
  );
}

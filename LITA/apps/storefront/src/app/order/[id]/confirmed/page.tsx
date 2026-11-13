import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrder } from "@/lib/data/cart";
import { getUpiPayment } from "@/lib/data/upi";
import { getOrderTracking } from "@/lib/data/order-tracking";
import { formatOrderDate } from "@/lib/order-state";
import { LiveOrderDetail } from "@/components/order/LiveOrderDetail";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order Confirmed | Livin In The Art",
  robots: { index: false },
};

export default async function OrderConfirmedPage({
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

  const firstName =
    order.shipping_address?.first_name ||
    order.customer?.first_name ||
    "";
  const displayIdText = order.display_id
    ? `#${order.display_id}`
    : `#${order.id.slice(-6).toUpperCase()}`;
  const placedDate = formatOrderDate(order.created_at);

  return (
    <div className="bg-[#fbfaf8] min-h-[calc(100vh-var(--header-h)-120px)] py-10 md:py-16 px-4 sm:px-6 lg:px-12">
      <div className="max-w-6xl mx-auto">
        {/* ── Top Navigation Link ── */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/artworks"
            className="text-xs uppercase tracking-wider text-neutral-500 hover:text-black transition-colors inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink"
          >
            ← Return to Catalog
          </Link>
          <Link
            href="/account"
            className="text-xs uppercase tracking-wider text-neutral-500 hover:text-black transition-colors inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink"
          >
            View in Account Dashboard →
          </Link>
        </div>

        {/* ── Confirmation Header ── */}
        <header className="mb-8 border-b border-[#eee7de] pb-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-sans font-medium uppercase tracking-[0.2em] text-[#5C6168]">
              Acquisition Confirmed
            </span>
            <span className="text-xs font-mono text-neutral-500">
              Order {displayIdText}
              {placedDate && ` · Placed ${placedDate}`}
            </span>
          </div>

          <h1
            className="font-cormorant text-3xl sm:text-4xl md:text-5xl font-normal text-neutral-900 leading-tight tracking-tight"
            style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
          >
            {firstName ? `Thank you, ${firstName}` : "Thank you for collecting with LITA"}
          </h1>

          {/* Subheading: guarded against empty email */}
          <p className="mt-2.5 text-sm sm:text-base text-neutral-600 max-w-2xl leading-relaxed">
            Order reference <strong className="text-neutral-900 font-medium">{displayIdText}</strong>.
            {order.email && (
              <>
                {" "}A formal collector summary has been dispatched to{" "}
                <strong className="text-neutral-900 font-medium">{order.email}</strong>.
              </>
            )}
          </p>
        </header>

        {/* ── Fallback UPI Error Banner ── */}
        {pay === "upi" && !upiResult.payment && (
          <div role="alert" className="mb-8 border border-dust bg-wall p-4 text-xs text-rose-800 rounded">
            {upiResult.error ??
              "UPI payment instructions could not be found. Please contact the studio for help."}
          </div>
        )}

        {/* ── Main Two-Column Live Order Detail ── */}
        <LiveOrderDetail
          initialOrder={order}
          initialUpiPayment={upiResult.payment}
          initialTracking={trackingResult.fulfillments}
          initialTrackingError={trackingResult.error ?? null}
          showUpiQuery={pay === "upi"}
        />

        {/* ── Bottom Navigation Links ── */}
        <div className="mt-14 pt-8 border-t border-[#eee7de] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <Link
            href="/artworks"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-full border border-neutral-300 text-neutral-800 uppercase tracking-wider font-medium hover:border-black hover:bg-neutral-50 transition-colors"
          >
            ← Continue Browsing Artworks
          </Link>
          <Link
            href="/account"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-ink text-wall uppercase tracking-wider font-medium hover:bg-neutral-800 transition-colors"
          >
            View in Your Account →
          </Link>
        </div>
      </div>
    </div>
  );
}

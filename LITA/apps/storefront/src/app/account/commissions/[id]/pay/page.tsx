import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCustomer } from "@/lib/data/customer";
import { getCustomerCommission } from "@/lib/data/commission";
import { formatMoney } from "@/lib/format";
import CommissionPayButton from "@/components/commission/CommissionPayButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Complete Commission Payment | Livin In The Art",
  description: "Securely complete payment for your bespoke commissioned artwork.",
};

export default async function CommissionPayPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const customer = await getCustomer();
  if (!customer) {
    redirect(`/login?next=/account/commissions/${id}/pay`);
  }

  const detail = await getCustomerCommission(id);
  if (!detail || !detail.commission) {
    notFound();
  }

  const commission = detail.commission;
  const isPaid = commission.status === "paid" || !!commission.paid_at;

  return (
    <div className="bg-white min-h-[calc(100vh-var(--header-h)-120px)] py-12 md:py-20 px-6 md:px-12">
      <div className="max-w-4xl mx-auto">
        {/* Navigation Breadcrumb */}
        <div className="mb-8">
          <Link
            href="/account"
            className="text-xs uppercase tracking-wider text-neutral-500 hover:text-black transition-colors"
          >
            ← Back to Account Dashboard
          </Link>
        </div>

        {/* Page Header */}
        <div className="border-b border-neutral-200 pb-6 mb-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[11px] uppercase tracking-widest text-[#5f2f3c] font-semibold">
              Bespoke Commission
            </span>
            <span className="text-[11px] uppercase tracking-wider px-2 py-0.5 bg-neutral-100 text-neutral-700">
              {commission.status.replace("_", " ")}
            </span>
          </div>
          <h1 className="font-cormorant text-3xl md:text-5xl text-[#111111] font-normal">
            {commission.title}
          </h1>
        </div>

        {/* Two-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Left Column: Commission Specifications */}
          <div className="md:col-span-7 space-y-8">
            <div>
              <h2 className="text-xs uppercase tracking-wider font-semibold text-neutral-500 mb-3">
                Artwork Concept
              </h2>
              <p className="text-sm text-neutral-800 leading-relaxed bg-[#faf8f5] p-5 border border-[#eee7de]">
                {commission.idea}
              </p>
            </div>

            {commission.requirements && (
              <div>
                <h2 className="text-xs uppercase tracking-wider font-semibold text-neutral-500 mb-3">
                  Placement &amp; Details
                </h2>
                <p className="text-sm text-neutral-800 leading-relaxed bg-[#faf8f5] p-5 border border-[#eee7de]">
                  {commission.requirements}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 border-t border-neutral-200 pt-6">
              <div>
                <span className="block text-xs uppercase tracking-wider text-neutral-500">
                  Medium
                </span>
                <span className="text-sm font-medium text-neutral-900 mt-1 block">
                  {commission.medium || "Bespoke fine art"}
                </span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider text-neutral-500">
                  Target Dimensions
                </span>
                <span className="text-sm font-medium text-neutral-900 mt-1 block">
                  {commission.size || "Custom dimensions"}
                </span>
              </div>
            </div>

            {commission.admin_notes && (
              <div className="border-t border-neutral-200 pt-6">
                <span className="block text-xs uppercase tracking-wider text-neutral-500 mb-2">
                  Atelier Notes
                </span>
                <p className="text-xs text-neutral-700 italic leading-relaxed">
                  {commission.admin_notes}
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Order Summary & Razorpay Payment */}
          <div className="md:col-span-5">
            <div className="border border-neutral-200 bg-[#faf8f5] p-6 sm:p-8 space-y-6 sticky top-28">
              <h2 className="font-cormorant text-2xl text-[#111111]">
                Payment Summary
              </h2>

              <div className="space-y-3 text-sm text-neutral-700 border-b border-neutral-200 pb-4">
                <div className="flex justify-between items-center">
                  <span>Commission Artwork</span>
                  <span className="font-medium text-neutral-900">
                    {commission.quoted_price
                      ? formatMoney(commission.quoted_price, commission.currency_code || "INR")
                      : "Pending Quote"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-neutral-500">
                  <span>Museum-Grade Packaging</span>
                  <span>Complimentary</span>
                </div>
                <div className="flex justify-between items-center text-xs text-neutral-500">
                  <span>Insured Courier in India</span>
                  <span>Included</span>
                </div>
                <div className="flex justify-between items-center text-xs text-neutral-500">
                  <span>GST (Goods &amp; Services Tax)</span>
                  <span>Included</span>
                </div>
              </div>

              <div className="flex justify-between items-baseline pt-1">
                <span className="text-sm font-semibold uppercase tracking-wider text-neutral-900">
                  Total
                </span>
                <span className="text-2xl font-cormorant font-semibold text-[#111111]">
                  {commission.quoted_price
                    ? formatMoney(commission.quoted_price, commission.currency_code || "INR")
                    : "—"}
                </span>
              </div>

              {isPaid ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                  <p className="font-semibold">Payment Completed</p>
                  <p>
                    Thank you! Your payment is confirmed. Reference:{" "}
                    <span className="font-mono">{commission.payment_reference || "Verified"}</span>
                  </p>
                  {commission.order_id && (
                    <p className="pt-2">
                      <Link
                        href="/account"
                        className="underline text-emerald-800 hover:text-emerald-950 font-medium"
                      >
                        View in Account Orders →
                      </Link>
                    </p>
                  )}
                </div>
              ) : (
                <div className="pt-2">
                  <CommissionPayButton
                    commission={commission}
                    customer={customer}
                  />
                </div>
              )}

              <div className="pt-4 border-t border-neutral-200 text-[11px] text-neutral-500 space-y-1">
                <p>🔒 256-Bit SSL Encrypted Razorpay Checkout</p>
                <p>✓ UPI, NetBanking, Credit &amp; Debit Cards Accepted</p>
                <p>✓ Handcrafted studio piece made to bespoke specifications</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

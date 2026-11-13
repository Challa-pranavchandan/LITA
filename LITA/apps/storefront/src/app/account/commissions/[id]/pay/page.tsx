import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCustomer } from "@/lib/data/customer";
import { getCustomerCommission } from "@/lib/data/commission";
import { getUpiPayment } from "@/lib/data/upi";

// Components
import { CommissionHeader } from "./components/CommissionHeader";
import { ProgressStepper } from "./components/ProgressStepper";
import { CommissionTabs } from "./components/CommissionTabs";
import { PaymentCard } from "./components/PaymentCard";
import { MobilePayBar } from "./components/MobilePayBar";

// Note: PaymentCard embeds and renders CommissionPayButton for checkout flow

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bespoke Artwork Commission | Livin In The Art Atelier",
  description:
    "Review your bespoke commission specifications, track progress with your artist, and securely complete payments.",
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

  const enableUpiManual =
    process.env.NEXT_PUBLIC_ENABLE_UPI_MANUAL === "true";
  const upiResult =
    enableUpiManual && commission.order_id
      ? await getUpiPayment(commission.order_id)
      : { payment: null };
  const initialUpiPayment = upiResult.payment ?? null;

  // Progress updates data source (ready for future backend wiring, currently empty for atelier progress photos)
  const updates: Array<{
    id?: string;
    image_url: string;
    note: string;
    date: string;
    title?: string;
  }> = [];

  return (
    <div className="bg-[#fbfaf8] min-h-[calc(100vh-var(--header-h)-120px)] py-8 md:py-14 px-4 sm:px-6 lg:px-12">
      <div className="max-w-7xl mx-auto">
        {/* ── 1. Page Header ── */}
        <CommissionHeader commission={commission} />

        {/* ── 2. Progress Stepper (Brief → Deposit → Creating → Final payment → Shipped) ── */}
        <ProgressStepper commission={commission} />

        {/* ── 3. Two-Column Grid (Desktop: ~65% / 35%, Mobile: Stacked) ── */}
        <div className="mt-8 lg:mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Left Column: Tabbed Content (Overview | Messages | Updates) */}
          <div className="lg:col-span-7 xl:col-span-8">
            <CommissionTabs
              commission={commission}
              initialMessages={detail.messages || []}
              updates={updates}
            />
          </div>

          {/* Right Column: Sticky Payment Card */}
          <div className="lg:col-span-5 xl:col-span-4">
            <PaymentCard
              commission={commission}
              customer={customer}
              initialUpiPayment={initialUpiPayment}
              enableUpiManual={enableUpiManual}
            />
          </div>
        </div>

        {/* ── 4. Mobile Quick Action Bar (Sticky at bottom for screens < 1024px) ── */}
        <MobilePayBar commission={commission} />

        {/* ── 5. Atelier Footer & Support Link (Replaces floating red pill) ── */}
        <footer className="mt-16 pt-8 border-t border-[#e8e4df] text-center sm:flex sm:items-center sm:justify-between text-xs text-neutral-500 pb-16 lg:pb-6">
          <p>
            Livin In The Art Atelier · Handcrafted bespoke artworks &amp; insured fine art transit.
            Inclusive of all taxes &amp; GST.
          </p>
          <div className="mt-3 sm:mt-0 flex items-center justify-center gap-4">
            <Link
              href="/contact"
              className="text-neutral-600 hover:text-black underline underline-offset-4 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5f2f3c] rounded"
            >
              Need help? Contact the studio
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}

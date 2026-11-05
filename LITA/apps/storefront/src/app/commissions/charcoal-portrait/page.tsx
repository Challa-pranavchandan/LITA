import type { Metadata } from "next";
import Link from "next/link";
import { getCustomer } from "@/lib/data/customer";
import { CharcoalPortraitRequestForm } from "@/components/CharcoalPortraitRequestForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Charcoal Portraits | Livin In The Art",
  description:
    "Commission a hand-drawn charcoal portrait on archival paper with transparent fixed pricing from Livin In The Art.",
};

export default async function CharcoalPortraitPage() {
  const customer = await getCustomer();

  return (
    <div className="w-full bg-white text-[#232629]">
      {/* ── Editorial Header ── */}
      <header className="border-b border-[#E5E7EB]">
        <div className="mx-auto max-w-4xl px-6 pt-16 pb-12 sm:pt-20 sm:pb-16 text-center">
          <div className="mb-6">
            <Link
              href="/commissions"
              className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-graphite hover:text-ink transition-colors"
            >
              <span>&larr;</span> Back to All Commissions
            </Link>
          </div>
          <span className="block pb-3 text-xs font-sans font-medium uppercase tracking-[0.25em] text-[#5f2f3c]">
            Hand-Drawn Atelier Work
          </span>
          <h1
            className="font-cormorant text-4xl sm:text-5xl md:text-6xl font-normal text-[#232629] leading-[1.15]"
            style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
          >
            Fine Art Charcoal Portraits
          </h1>
          <p className="mt-4 text-sm sm:text-base text-[#5C6168] max-w-xl mx-auto leading-relaxed">
            Select paper dimensions and the number of subjects to calculate your transparent fixed price before requesting your portrait.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <section className="border border-[#E5E5E5] bg-white p-6 sm:p-10 shadow-sm">
          <CharcoalPortraitRequestForm isLoggedIn={Boolean(customer?.id)} />
        </section>
      </main>
    </div>
  );
}

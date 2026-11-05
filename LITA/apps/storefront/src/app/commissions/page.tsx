import type { Metadata } from "next";
import { getCustomer } from "@/lib/data/customer";
import { CommissionRequestForm } from "@/components/CommissionRequestForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bespoke Art Commissions | Livin In The Art",
  description:
    "Commission an original, one-of-a-kind artwork tailored to your sacred space, architectural project, or private collection.",
};

export default async function CommissionsPage() {
  const customer = await getCustomer();
  const isLoggedIn = Boolean(customer?.id);

  return (
    <div className="w-full bg-white text-[#232629]">
      {/* ── Editorial Header ── */}
      <header className="border-b border-[#E5E7EB]">
        <div className="mx-auto max-w-4xl px-6 pt-16 pb-12 sm:pt-20 sm:pb-16 text-center">
          <span className="block pb-3 text-xs font-sans font-medium uppercase tracking-[0.25em] text-[#5C6168]">
            Original Bespoke Artworks
          </span>
          <h1
            className="font-cormorant text-4xl sm:text-5xl md:text-6xl font-normal text-[#232629] leading-[1.15]"
            style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
          >
            Commission an Original Piece
          </h1>
          <p className="mt-4 text-base sm:text-lg text-[#5C6168] max-w-2xl mx-auto leading-relaxed">
            Collaborate directly with the studio to bring an original vision into physical form. Whether for an architecturally curated residence, a spiritual sanctuary, or a commemorative collection, every commission is handcrafted with reverence and artisanal materials.
          </p>
        </div>
      </header>

      <main className="max-w-[1480px] mx-auto px-6 sm:px-10 lg:px-12 py-12 sm:py-16">
        {/* Fixed Price Feature Banner */}
        <Link
          href="/commissions/charcoal-portrait"
          className="mb-14 flex flex-col gap-4 border border-[#E5E5E5] bg-[#FAF9F7] p-7 transition-all duration-200 hover:border-[#111111] hover:bg-white sm:flex-row sm:items-center sm:justify-between group"
        >
          <div>
            <span className="block text-[11px] font-sans font-semibold uppercase tracking-[0.2em] text-[#5f2f3c]">
              Fixed-Price Atelier Work
            </span>
            <span
              className="mt-1 block text-2xl font-normal text-ink group-hover:text-black transition-colors"
              style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
            >
              Hand-Drawn Charcoal Portraits
            </span>
            <span className="mt-1 block text-sm text-graphite">
              A4 from ₹999 · A3 from ₹1,500 · Handcrafted on archival heavyweight paper
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-medium text-[#232629] group-hover:translate-x-1 transition-transform">
            <span>View Pricing &amp; Request</span>
            <span>&rarr;</span>
          </span>
        </Link>

        {/* 3-Step Process Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 border-y border-[#E5E7EB] py-10">
          <div>
            <div className="text-xs font-mono tracking-widest text-graphite mb-2">01 / CONCEPT</div>
            <h2
              className="text-2xl font-normal text-ink mb-2"
              style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
            >
              Share Your Vision
            </h2>
            <p className="text-sm text-graphite leading-relaxed">
              Select your preferred medium, desired dimensions, and upload reference photos or architectural placement context.
            </p>
          </div>
          <div>
            <div className="text-xs font-mono tracking-widest text-graphite mb-2">02 / COLLABORATION</div>
            <h2
              className="text-2xl font-normal text-ink mb-2"
              style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
            >
              Dialogue &amp; Proposal
            </h2>
            <p className="text-sm text-graphite leading-relaxed">
              The artist reviews your concept, refines details in a private discussion thread, and issues an all-inclusive quote.
            </p>
          </div>
          <div>
            <div className="text-xs font-mono tracking-widest text-graphite mb-2">03 / CREATION</div>
            <h2
              className="text-2xl font-normal text-ink mb-2"
              style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
            >
              Approval &amp; Craft
            </h2>
            <p className="text-sm text-graphite leading-relaxed">
              A 50% deposit commences creation. Review photographic studio progress before final balance settlement and museum packaging.
            </p>
          </div>
        </div>

        {/* Main Commission Form Area */}
        <div className="grid gap-14 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
          <div className="space-y-6">
            <h2
              className="text-3xl font-normal text-ink"
              style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
            >
              Commission Specifications
            </h2>
            <div className="text-graphite text-[15px] space-y-4 leading-relaxed">
              <p>
                Please provide as much architectural context as possible. Details such as your target wall dimensions, room lighting conditions, or color palettes help us tailor the composition and framing.
              </p>
              <p>
                All reference photographs and sketches are uploaded directly to our private storage vault and reviewed exclusively by the studio.
              </p>
            </div>

            <div className="border border-[#E5E5E5] bg-[#FAF9F7] p-6 sm:p-7 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-ink">
                Studio Craft Standards
              </div>
              <ul className="text-xs text-graphite space-y-2.5 list-disc list-inside">
                <li>Archival museum-grade paper and triple-primed cotton/linen canvas.</li>
                <li>Lightfast charcoal, pigmented inks, and artist-grade fine art pigments.</li>
                <li>Signed Certificate of Authenticity (COA) with unique catalog provenance.</li>
                <li>Fully insured domestic courier delivery with bespoke crate packaging.</li>
              </ul>
            </div>
          </div>

          <div className="border border-[#E5E5E5] bg-white p-6 sm:p-10 shadow-sm">
            <CommissionRequestForm isLoggedIn={isLoggedIn} />
          </div>
        </div>
      </main>
    </div>
  );
}

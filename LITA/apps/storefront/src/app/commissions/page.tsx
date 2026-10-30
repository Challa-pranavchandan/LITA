import type { Metadata } from "next";
import { getCustomer } from "@/lib/data/customer";
import { CommissionRequestForm } from "@/components/CommissionRequestForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bespoke Art Commissions | LITA Studio",
  description:
    "Commission an original, one-of-a-kind artwork tailored to your sacred space, architectural project, or private collection.",
};

export default async function CommissionsPage() {
  const customer = await getCustomer();
  const isLoggedIn = Boolean(customer?.id);

  return (
    <div className="page py-12 md:py-16">
      {/* Editorial Header */}
      <div className="max-w-3xl mb-12">
        <span className="text-xs uppercase tracking-widest text-graphite font-medium">
          Original Bespoke Artworks
        </span>
        <h1 className="text-4xl md:text-5xl leading-tight font-medium tracking-tightish mt-2">
          Commission a Piece
        </h1>
        <p className="text-graphite text-lg md:text-xl mt-4 leading-relaxed font-serif">
          Collaborate directly with the studio to bring an original vision into physical form. Whether for an architecturally curated residence, a spiritual sanctuary, or a commemorative collection, every commission is handcrafted with reverence and artisanal materials.
        </p>
      </div>

      {/* 3-Step Process Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 border-y border-dust py-8">
        <div>
          <div className="text-xs font-mono text-graphite mb-1">01 / CONCEPT</div>
          <h2 className="text-lg font-medium text-ink">Share Your Vision</h2>
          <p className="text-sm text-graphite mt-1 leading-relaxed">
            Select your preferred medium, desired dimensions, and upload reference photos or architectural placement context.
          </p>
        </div>
        <div>
          <div className="text-xs font-mono text-graphite mb-1">02 / COLLABORATION</div>
          <h2 className="text-lg font-medium text-ink">Dialogue & Proposal</h2>
          <p className="text-sm text-graphite mt-1 leading-relaxed">
            The artist reviews your concept, refines details in a private discussion thread, and issues a formal quote.
          </p>
        </div>
        <div>
          <div className="text-xs font-mono text-graphite mb-1">03 / CREATION</div>
          <h2 className="text-lg font-medium text-ink">Approval & Craft</h2>
          <p className="text-sm text-graphite mt-1 leading-relaxed">
            Accept the quote with a single click in your dashboard. Your bespoke order is generated and studio creation commences.
          </p>
        </div>
      </div>

      {/* Main Commission Form Area */}
      <div className="grid gap-14 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
        <div className="space-y-6">
          <h2 className="text-2xl font-medium tracking-tightish">
            Commission Specifications
          </h2>
          <div className="prose-art text-graphite text-[15px] space-y-4 leading-relaxed">
            <p>
              Please provide as much context as possible. Details such as your target wall dimensions, room lighting conditions, or color palettes help us tailor the composition and framing.
            </p>
            <p>
              All reference photographs and sketches are uploaded directly to our private storage vault and reviewed exclusively by the studio.
            </p>
          </div>

          <div className="border border-dust bg-wall p-6 rounded space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-ink">
              Studio Craft Standards
            </div>
            <ul className="text-xs text-graphite space-y-2 list-disc list-inside">
              <li>Archival museum-grade paper and triple-primed cotton/linen canvas.</li>
              <li>Lightfast charcoal, pigmented inks, and artist-grade acrylics.</li>
              <li>Signed Certificate of Authenticity with unique provenance record.</li>
              <li>Insured worldwide art-courier shipping with bespoke crate packaging.</li>
            </ul>
          </div>
        </div>

        <div className="border border-dust bg-wall p-6 md:p-8 rounded">
          <CommissionRequestForm isLoggedIn={isLoggedIn} />
        </div>
      </div>
    </div>
  );
}

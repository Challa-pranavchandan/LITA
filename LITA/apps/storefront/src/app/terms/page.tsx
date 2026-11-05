import type { Metadata } from "next";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Terms of Service | Livin In The Art",
  description:
    "Terms and conditions governing purchases, bespoke art commissions, and exhibition inquiries with Livin In The Art.",
};

export default function TermsPage() {
  return (
    <div className="w-full bg-white text-[#232629]">
      {/* ── Page Header ── */}
      <header className="border-b border-[#E5E7EB]">
        <div className="mx-auto max-w-4xl px-6 pt-16 pb-12 sm:pt-20 sm:pb-16 text-center">
          <span className="block pb-3 text-xs font-sans font-medium uppercase tracking-[0.25em] text-[#5C6168]">
            Collector Agreement
          </span>
          <h1
            className="font-cormorant text-4xl sm:text-5xl md:text-6xl font-normal text-[#232629] leading-[1.15]"
            style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
          >
            Terms of Service
          </h1>
          <p className="mt-4 text-sm sm:text-base text-[#5C6168] max-w-xl mx-auto leading-relaxed">
            Terms and conditions governing fine art acquisitions, custom artwork commissions, and advisory relationships with Livin In The Art.
          </p>
          <p className="mt-2 text-xs font-mono uppercase tracking-wider text-[#888888]">
            Effective Date: November 2026
          </p>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <div className="space-y-12 text-[15px] sm:text-base leading-relaxed text-[#3a3a3a]">
          <section className="border-b border-[#E5E7EB] pb-10">
            <h2
              className="text-2xl sm:text-3xl font-normal text-[#232629] mb-4"
              style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
            >
              1. Original Artworks &amp; Copyright Ownership
            </h2>
            <p className="mb-4">
              Every artwork showcased on Livin In The Art is an original creation or limited edition fine art print. Acquisition of an artwork grants the collector physical ownership of the unique object.
            </p>
            <p>
              In accordance with intellectual property and copyright laws, all reproduction rights, digital rights, and moral rights remain strictly with the artist and Livin In The Art. No artwork imagery may be duplicated, commercially licensed, or reproduced without express prior written consent.
            </p>
          </section>

          <section className="border-b border-[#E5E7EB] pb-10">
            <h2
              className="text-2xl sm:text-3xl font-normal text-[#232629] mb-4"
              style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
            >
              2. Certificate of Authenticity (COA)
            </h2>
            <p>
              Each original painting and limited edition piece dispatched from our studio is accompanied by an artist-signed Certificate of Authenticity specifying the piece&rsquo;s title, dimensions, medium, completion year, and unique catalog provenance number.
            </p>
          </section>

          <section className="border-b border-[#E5E7EB] pb-10">
            <h2
              className="text-2xl sm:text-3xl font-normal text-[#232629] mb-4"
              style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
            >
              3. Pricing, Invoicing &amp; Orders
            </h2>
            <p className="mb-4">
              All prices across our catalog are quoted in Indian Rupees (INR).
            </p>
            <p>
              Orders placed through the online gallery are confirmed upon successful authorization and capture of funds via our secure gateway (Razorpay) or verified manual UPI transfer. In the rare event of an inadvertent inventory or clerical discrepancy, we reserve the right to notify the collector and issue an immediate full refund.
            </p>
          </section>

          <section className="border-b border-[#E5E7EB] pb-10">
            <h2
              className="text-2xl sm:text-3xl font-normal text-[#232629] mb-4"
              style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
            >
              4. Bespoke Commission Agreements
            </h2>
            <p className="mb-4">
              Custom commissions represent a unique, personalized collaboration between the collector and the studio. The process operates under two structured milestones:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-[#4a4a4a]">
              <li>
                <strong className="text-[#232629]">Deposit (50%):</strong> Once an inquiry is quoted and accepted, a 50% deposit covers initial canvas preparation, premium raw pigments, and dedicated studio time. This initial deposit is non-refundable once creation commences.
              </li>
              <li>
                <strong className="text-[#232629]">Final Balance (50%):</strong> Upon completion of the artwork and collector review of photographic studio proofs, the remaining 50% balance is requested. Final balance settlement triggers archival varnishing, custom museum packaging, and dispatch.
              </li>
            </ul>
          </section>

          <section className="border-b border-[#E5E7EB] pb-10">
            <h2
              className="text-2xl sm:text-3xl font-normal text-[#232629] mb-4"
              style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
            >
              5. Shipping, Transit &amp; Insurance
            </h2>
            <p className="mb-4">
              Due to the delicate and irreplaceable nature of fine art, every piece is packed with custom museum-grade corner protection, moisture barriers, and shock-absorbent cushioning.
            </p>
            <p>
              Parcels are insured for transit and delivered via premier courier partners across India. Please inspect all external packaging upon arrival and notify the studio within 48 hours in the unlikely event of transit damage.
            </p>
          </section>

          <section>
            <h2
              className="text-2xl sm:text-3xl font-normal text-[#232629] mb-4"
              style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
            >
              6. Studio Inquiries &amp; Advisory
            </h2>
            <p className="mb-4">
              For project consultations, architectural curations, or questions regarding these terms, our advisory team is available at:
            </p>
            <div className="bg-[#FAF9F7] border border-[#E5E5E5] p-6 text-sm">
              <p className="font-medium text-[#232629]">Livin In The Art Gallery &amp; Advisory</p>
              <p className="mt-1 text-[#5C6168]">
                Email:{" "}
                <a href={`mailto:${siteConfig.email}`} className="text-[#232629] underline underline-offset-4 hover:text-[#5f2f3c]">
                  {siteConfig.email}
                </a>
              </p>
              <p className="mt-1 text-[#5C6168]">
                WhatsApp:{" "}
                <a href="https://wa.me/917799671321" target="_blank" rel="noopener noreferrer" className="text-[#232629] underline underline-offset-4 hover:text-[#5f2f3c]">
                  +91 77996 71321
                </a>
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

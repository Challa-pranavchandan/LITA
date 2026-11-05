import type { Metadata } from "next";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Shipping & Handling | Livin In The Art",
  description:
    "Learn about our museum-grade artwork packaging, insured pan-India delivery, and collector satisfaction policies at Livin In The Art.",
};

export default function ShippingPage() {
  return (
    <div className="w-full bg-white text-[#232629]">
      {/* ── Page Header ── */}
      <header className="border-b border-[#E5E7EB]">
        <div className="mx-auto max-w-4xl px-6 pt-16 pb-12 sm:pt-20 sm:pb-16 text-center">
          <span className="block pb-3 text-xs font-sans font-medium uppercase tracking-[0.25em] text-[#5C6168]">
            Care &amp; Delivery
          </span>
          <h1
            className="font-cormorant text-4xl sm:text-5xl md:text-6xl font-normal text-[#232629] leading-[1.15]"
            style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
          >
            Shipping, Handling &amp; Returns
          </h1>
          <p className="mt-4 text-sm sm:text-base text-[#5C6168] max-w-xl mx-auto leading-relaxed">
            Every original work is treated as a cultural artifact. Discover how we protect, pack, and safely transport fine art across India.
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
              1. Museum-Grade Packaging
            </h2>
            <p className="mb-4">
              Original canvases and fine art works require specialized material protection to prevent surface friction, temperature fluctuations, and corner stress during transit.
            </p>
            <ul className="list-disc pl-5 space-y-2 text-[#4a4a4a]">
              <li>
                <strong className="text-[#232629]">Surface Protection:</strong> Wrapped in archival acid-free glassine paper that breathes without adhering to fresh pigments or varnish.
              </li>
              <li>
                <strong className="text-[#232629]">Impact Resistance:</strong> Fitted with high-density rigid foam corner protectors and cushioned with multi-layer bubble insulation.
              </li>
              <li>
                <strong className="text-[#232629]">Rigid Outer Shell:</strong> Encased in heavy-duty double-wall corrugated crates or custom timber-reinforced fine art boxes.
              </li>
            </ul>
          </section>

          <section className="border-b border-[#E5E7EB] pb-10">
            <h2
              className="text-2xl sm:text-3xl font-normal text-[#232629] mb-4"
              style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
            >
              2. Domestic Transit &amp; Insurance
            </h2>
            <p className="mb-4">
              We deliver to collectors, private residences, and architectural spaces across all states and union territories in India.
            </p>
            <p className="mb-4">
              All consignments are fully insured against loss or damage in transit and handled exclusively by verified fine-art logistics partners (such as Blue Dart Express and premium surface couriers).
            </p>
            <p>
              Once your artwork is securely dispatched, you will receive an email containing carrier details and direct tracking references, which can also be tracked live on your order status page.
            </p>
          </section>

          <section className="border-b border-[#E5E7EB] pb-10">
            <h2
              className="text-2xl sm:text-3xl font-normal text-[#232629] mb-4"
              style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
            >
              3. Dispatch Timelines
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-[#FAF9F7] border border-[#E5E5E5] p-6 text-sm">
              <div>
                <p className="font-semibold text-[#232629] uppercase tracking-wider text-xs">Catalog Works</p>
                <p className="mt-2 text-[#5C6168]">
                  Existing gallery paintings and limited prints ship within <strong>3 to 5 business days</strong> following completion of inspection and Certificate of Authenticity signing.
                </p>
              </div>
              <div>
                <p className="font-semibold text-[#232629] uppercase tracking-wider text-xs">Bespoke Commissions</p>
                <p className="mt-2 text-[#5C6168]">
                  Custom pieces adhere to the individualized timeline agreed upon in your commission thread, allowing for pigment curing and final protective varnish.
                </p>
              </div>
            </div>
          </section>

          <section className="border-b border-[#E5E7EB] pb-10">
            <h2
              className="text-2xl sm:text-3xl font-normal text-[#232629] mb-4"
              style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
            >
              4. Returns &amp; Collector Satisfaction
            </h2>
            <p className="mb-4">
              We want you to live with artwork that brings warmth and genuine inspiration to your space.
            </p>
            <p className="mb-4">
              For original catalog artworks, if a work does not fit your architectural space as envisioned, you may initiate a return within <strong>7 days of delivery</strong>. The artwork must remain in immaculate condition with its original packaging, seals, and Certificate of Authenticity.
            </p>
            <p>
              <em>Please note:</em> Tailored bespoke commissions and charcoal portraits handcrafted to collector-provided reference imagery are unique collaborative creations and cannot be returned once approved and dispatched.
            </p>
          </section>

          <section>
            <h2
              className="text-2xl sm:text-3xl font-normal text-[#232629] mb-4"
              style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
            >
              5. Transit Damage Protocol
            </h2>
            <p className="mb-4">
              In the extraordinarily rare event that an artwork crate arrives damaged:
            </p>
            <ol className="list-decimal pl-5 space-y-2 text-[#4a4a4a] mb-6">
              <li>Photograph the external box prior to unsealing.</li>
              <li>Photograph any damage sustained to the artwork canvas or frame.</li>
              <li>
                Contact our studio team within <strong>48 hours</strong> at{" "}
                <a href={`mailto:${siteConfig.email}`} className="text-[#232629] underline underline-offset-4 hover:text-[#5f2f3c]">
                  {siteConfig.email}
                </a>{" "}
                or via WhatsApp at{" "}
                <a href="https://wa.me/917799671321" target="_blank" rel="noopener noreferrer" className="text-[#232629] underline underline-offset-4 hover:text-[#5f2f3c]">
                  +91 77996 71321
                </a>.
              </li>
            </ol>
            <p>
              We will arrange immediate fine-art collection and issue a priority repair, custom replacement, or 100% full refund under our transit insurance policy.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

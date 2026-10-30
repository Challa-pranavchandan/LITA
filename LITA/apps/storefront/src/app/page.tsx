import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/lib/config";
import { listArtworks, listCollections, CURATED_COLLECTIONS } from "@/lib/data/catalog";
import { ArtworkGrid } from "@/components/ArtworkGrid";
import { RecentlyAddedSection } from "@/components/RecentlyAddedSection";


const STUDIO_SERVICES = [
  {
    id: "shopping",
    number: "01",
    tag: "Art Catalog & Shopping",
    title: "Original Works & Prints",
    description:
      "Explore and acquire handcrafted studio originals ready for placement—from textured paintings to intricate line work, mandalas, and limited-run archival prints.",
    image: "/about/original-artwork-perrote.jpg",
    features: [
      "Studio-signed originals & small-batch editions",
      "Ready-to-hang artisanal framing options",
      "Insured global shipping with certificate of authenticity",
    ],
    ctaText: "Shop Artworks",
    ctaHref: "/artworks",
  },
  {
    id: "commissions",
    number: "02",
    tag: "Bespoke Commissions",
    title: "Custom Tailored Artwork",
    description:
      "Collaborate directly with the studio to bring a one-of-a-kind concept to life. Tailored specifically to your spatial dimensions, color palette, and personal narrative.",
    image: "/about/artist-dan-covert.jpg",
    features: [
      "1-on-1 direct dialogue with the studio artist",
      "Custom scales, mediums & palette alignment",
      "Transparent quote and digital concept review",
    ],
    ctaText: "Request a Commission",
    ctaHref: "/commissions",
  },
  {
    id: "trade",
    number: "03",
    tag: "Trade & Art Advisory",
    title: "For Designers & Architects",
    description:
      "A dedicated studio partnership program for interior designers, architects, and corporate art curators. Access tier pricing, custom curations, and project logistics support.",
    image: "/trade/interior-designers.jpg",
    features: [
      "Exclusive trade pricing & volume tiered discounts",
      "Complimentary digital room mockups & custom framing",
      "Dedicated art advisor & white-glove logistics",
    ],
    ctaText: "Explore Trade Program",
    ctaHref: "/trade",
  },
];

export const revalidate = 60;

export default async function HomePage() {
  const [{ products }, collections] = await Promise.all([
    listArtworks({}),
    listCollections(),
  ]);

  const recent = products.slice(0, 9);

  return (
    <>
      {/* ── Hero Section ── */}
      <section className="relative w-full h-screen min-h-[580px] overflow-hidden">
        {/* Background image - unoptimized and quality=100 ensures zero compression loss */}
        <Image
          src="/hero-bg.jpg"
          alt="Livinin The Art - Handcrafted Artwork"
          fill
          priority
          unoptimized
          quality={100}
          sizes="100vw"
          className="object-cover object-center w-full h-full"
          data-hero-img=""
        />
        {/* Gentle gradient scrim to keep artwork vibrant while ensuring text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/20 pointer-events-none" />

        {/* Text content anchored gracefully towards the bottom so the central artwork remains visible */}
        <div className="absolute inset-x-0 bottom-12 md:bottom-16 flex flex-col items-center justify-end text-center px-6 z-10">
          <h1
            className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-normal text-white drop-shadow-md"
            style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif", letterSpacing: "0.01em" }}
          >
            Livinin The Art
          </h1>
          <p className="mt-4 max-w-lg text-base md:text-lg text-white/95 drop-shadow leading-relaxed">
            Artworks with heart — painted, lived, and made to be treasured.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/artworks"
              className="rounded-full border border-white bg-white/20 backdrop-blur-md px-7 py-3 text-sm font-medium text-white hover:bg-white hover:text-[#111111] transition-all duration-200 shadow-sm"
            >
              View Collection
            </Link>
            <Link
              href="/artworks?sort=newest"
              className="rounded-full border border-white/80 bg-black/20 backdrop-blur-md px-7 py-3 text-sm font-medium text-white hover:bg-white hover:text-[#111111] transition-all duration-200 shadow-sm"
            >
              Featured Artworks
            </Link>
          </div>
        </div>
      </section>

      {/* ── Recently Added Section (80vh Carousel) ── */}
      <RecentlyAddedSection products={recent} />

      {/* ── Collections Section (Curated Showcase) ── */}
      <section className="w-full border-t border-b border-[#e2e2e2] bg-white">
        <div className="w-full flex flex-col md:flex-row items-stretch">
          {/* Left Column: Heading & View All */}
          <div className="w-full md:w-[35%] lg:w-[34%] border-b md:border-b-0 md:border-r border-[#e2e2e2] px-8 sm:px-12 lg:px-16 py-12 md:py-20 flex flex-col justify-center">
            <div>
              <h2
                className="font-serif text-4xl sm:text-5xl lg:text-6xl font-normal text-[#1a1a1a] tracking-tight leading-none"
                style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
              >
                Collections
              </h2>
              <div className="mt-8 lg:mt-10">
                <Link
                  href="/collections"
                  className="text-xs sm:text-sm text-[#1a1a1a] underline underline-offset-4 hover:opacity-60 transition-opacity font-normal tracking-wide"
                >
                  View All
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column: Collection Rows */}
          <div className="w-full md:w-[65%] lg:w-[66%] flex flex-col">
            {CURATED_COLLECTIONS.map((item, idx) => (
              <div
                key={item.id}
                className={`flex flex-col lg:flex-row items-stretch ${idx < CURATED_COLLECTIONS.length - 1 ? "border-b border-[#e2e2e2]" : ""
                  }`}
              >
                {/* Text Content */}
                <div className="w-full lg:w-1/2 p-8 sm:p-10 lg:p-12 xl:p-16 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-semibold tracking-[0.25em] text-[#222222] uppercase">
                      {item.badge}
                    </span>
                    <h3
                      className="font-serif text-3xl sm:text-4xl lg:text-[42px] font-normal text-[#1a1a1a] mt-3 mb-4 leading-tight"
                      style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
                    >
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#555555] font-light leading-relaxed max-w-sm">
                      {item.description}
                    </p>
                  </div>
                  <div className="mt-8 lg:mt-16">
                    <Link
                      href={`/collections/${item.handle}`}
                      className="text-xs sm:text-sm text-[#1a1a1a] underline underline-offset-4 hover:opacity-60 transition-opacity font-normal tracking-wide inline-block"
                    >
                      View {item.artworkCount} Artworks
                    </Link>
                  </div>
                </div>

                {/* Artwork Image */}
                <div className="w-full lg:w-1/2 p-6 sm:p-8 lg:p-10 xl:p-12 flex items-center justify-center">
                  <Link
                    href={`/collections/${item.handle}`}
                    className="group relative w-full block overflow-hidden"
                  >
                    <div className="relative w-full aspect-[4/3] overflow-hidden bg-neutral-100">
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        sizes="(min-width: 1024px) 35vw, 90vw"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                      />
                    </div>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Brand Statement Section ── */}
      <section className="w-full bg-white py-20 sm:py-24 md:py-28 lg:py-32 px-6 sm:px-10 border-b border-[#e2e2e2]">
        <div className="mx-auto max-w-[880px] text-center">
          <h2
            className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-[60px] xl:text-[52px] font-normal text-[#3e3e42] leading-[1.28] tracking-[0.01em]"
            style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
          >
            Livin in the Art is a studio dedicated to handcrafted art across mediums—offering{" "}
            <span className="italic">original works</span>, prints, and custom commissions made to bring
            warmth and character to your walls.
          </h2>
          <div className="mt-8 md:mt-10">
            <Link
              href="/about"
              className="text-xs sm:text-sm text-[#3e3e42] underline underline-offset-4 hover:opacity-70 transition-opacity font-normal tracking-wide inline-block"
            >
              About Livin in the Art
            </Link>
          </div>
        </div>
      </section>

      {/* ── Studio Services & Advisory Section (Shopping, Commissions, Trade) ── */}
      <section className="w-full bg-[#FAF9F7] py-20 sm:py-24 lg:py-28 px-6 sm:px-10 lg:px-16 border-b border-[#e2e2e2]">
        <div className="mx-auto max-w-[1360px]">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 sm:mb-16 pb-8 border-b border-[#e2e2e2] gap-6">
            <div className="max-w-2xl">
              <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#888888] block mb-3">
                Studio Services & Advisory
              </span>
              <h2
                className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-[#1a1a1a] leading-tight"
                style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
              >
                Made by hand, curated for your space
              </h2>
              <p className="mt-4 text-sm sm:text-base text-[#555555] font-light leading-relaxed max-w-xl">
                Every artwork is crafted with reverence in the studio. Explore our three primary services—whether you are acquiring ready works, commissioning a bespoke piece, or specifying for an interior project.
              </p>
            </div>
            <div>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-[#1a1a1a] underline underline-offset-4 hover:opacity-60 transition-opacity tracking-wide"
              >
                About the Studio & Craft →
              </Link>
            </div>
          </div>

          {/* 3-Column Services Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 xl:gap-10">
            {STUDIO_SERVICES.map((service) => (
              <div
                key={service.id}
                className="bg-white border border-[#E5E5E5] flex flex-col justify-between group transition-all duration-300 hover:border-[#111111] hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)]"
              >
                <div>
                  {/* Image Container */}
                  <div className="relative w-full aspect-[4/3] overflow-hidden bg-neutral-100">
                    <Image
                      src={service.image}
                      alt={service.title}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 text-[10px] font-semibold tracking-[0.2em] uppercase text-[#111111] border border-white/60 shadow-sm">
                      {service.number} / {service.id.toUpperCase()}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-6 sm:p-8">
                    <span className="text-[11px] font-semibold tracking-[0.2em] text-[#888888] uppercase block mb-2">
                      {service.tag}
                    </span>
                    <h3
                      className="font-serif text-2xl sm:text-[28px] font-normal text-[#1a1a1a] mb-3 leading-snug"
                      style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
                    >
                      {service.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#666666] leading-relaxed font-light mb-6">
                      {service.description}
                    </p>

                    {/* Features checklist */}
                    <div className="border-t border-[#f0f0f0] pt-5 mb-6 space-y-2.5">
                      {service.features.map((feature, i) => (
                        <div key={i} className="flex items-start gap-2.5 text-xs text-[#444444]">
                          <span className="text-black font-semibold mt-0.5">•</span>
                          <span className="leading-relaxed">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="p-6 sm:p-8 pt-0 mt-auto">
                  <Link
                    href={service.ctaHref}
                    className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-5 text-xs font-medium tracking-[0.1em] uppercase text-white bg-[#111111] hover:bg-neutral-800 transition-colors duration-150 border border-[#111111]"
                  >
                    <span>{service.ctaText}</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

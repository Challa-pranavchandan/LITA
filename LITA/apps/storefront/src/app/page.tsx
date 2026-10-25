import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/lib/config";
import { listArtworks, listCollections, CURATED_COLLECTIONS } from "@/lib/data/catalog";
import { ArtworkGrid } from "@/components/ArtworkGrid";
import { RecentlyAddedSection } from "@/components/RecentlyAddedSection";


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

      <section className="page grid gap-10 py-20 md:grid-cols-2">
        <div>
          <h2 className="text-3xl leading-tight">Made by hand, one piece at a time</h2>
        </div>
        <div className="prose-art">
          <p>
            Every artwork here is original: drawn, painted or dotted in the studio, signed, and
            packed by hand. Gifts are made in small batches, so each one is slightly different.
          </p>
          <p>
            Looking for something that doesn't exist yet? Commissions are open for portraits,
            line work and mandalas.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/commissions" className="btn-line">Request a commission</Link>
            <Link href="/about" className="btn-line">About the studio</Link>
          </div>
        </div>
      </section>
    </>
  );
}

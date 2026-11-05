import type { Metadata } from "next";
import Link from "next/link";
import { listCollections } from "@/lib/data/catalog";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Curated Collections | Livin In The Art",
  description: "Explore curated fine art collections and thematically unified bodies of work from Livin In The Art.",
};

export default async function CollectionsPage() {
  const collections = await listCollections();

  return (
    <div className="w-full bg-white text-[#232629]">
      {/* ── Page Header ── */}
      <header className="border-b border-[#E5E7EB]">
        <div className="mx-auto max-w-4xl px-6 pt-16 pb-12 sm:pt-20 sm:pb-16 text-center">
          <span className="block pb-3 text-xs font-sans font-medium uppercase tracking-[0.25em] text-[#5C6168]">
            Curated Series
          </span>
          <h1
            className="font-cormorant text-4xl sm:text-5xl md:text-6xl font-normal text-[#232629] leading-[1.15]"
            style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
          >
            Curated Collections
          </h1>
          <p className="mt-4 text-sm sm:text-base text-[#5C6168] max-w-xl mx-auto leading-relaxed">
            Thematically unified series, architectural focal statements, and seasonal studio explorations crafted for discerning collectors.
          </p>
        </div>
      </header>

      {/* ── Collection Grid ── */}
      <main className="max-w-[1480px] mx-auto px-6 sm:px-10 lg:px-12 py-12 sm:py-16">
        {collections.length === 0 ? (
          <div className="text-center py-24 max-w-md mx-auto">
            <h2
              className="font-cormorant text-3xl font-normal text-[#232629] mb-3"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Collections in Curation
            </h2>
            <p className="text-sm text-[#5C6168] leading-relaxed mb-8">
              Our curators are currently organizing new themed collections. Explore all original works in the catalog in the meantime.
            </p>
            <Link
              href="/artworks"
              className="inline-flex items-center justify-center border border-[#232629] bg-[#232629] text-white px-7 py-3 text-xs sm:text-sm font-medium tracking-wide hover:bg-black transition-colors"
            >
              Explore Artworks
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {collections.map((c) => (
              <div
                key={c.id}
                className="group border border-[#E5E5E5] bg-[#FAF9F7] p-8 sm:p-10 flex flex-col justify-between min-h-[260px] transition-all duration-200 hover:border-[#111111] hover:bg-white"
              >
                <div>
                  <span className="block text-[11px] font-mono uppercase tracking-widest text-[#888888] mb-3">
                    Curated Series
                  </span>
                  <h2
                    className="font-cormorant text-2xl sm:text-3xl font-normal text-[#232629] group-hover:text-black transition-colors"
                    style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
                  >
                    {c.title}
                  </h2>
                </div>

                <div className="pt-8">
                  <Link
                    href={`/collections/${c.handle}`}
                    className="inline-flex items-center gap-2 text-xs uppercase tracking-wider font-medium text-[#232629] group-hover:text-black group-hover:translate-x-1 transition-all"
                  >
                    <span>View Collection</span>
                    <span>&rarr;</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

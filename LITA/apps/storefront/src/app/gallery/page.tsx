import type { Metadata } from "next";
import Link from "next/link";
import "./gallery.css";
import { GalleryGrid, GalleryItem } from "./GalleryGrid";

export const metadata: Metadata = {
  title: "Photo Gallery | Livinin The Art",
  description:
    "Explore captured moments, exhibitions, artists in the studio, and curated installations from Livin in the Art.",
};

async function getGallery(): Promise<GalleryItem[]> {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
    const apiKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

    const res = await fetch(`${backendUrl}/store/gallery`, {
      headers: {
        ...(apiKey ? { "x-publishable-api-key": apiKey } : {}),
      },
      next: { tags: ["gallery"], revalidate: 300 },
      cache: "no-store", // Keep fresh or rely on ISR tags
    });

    if (!res.ok) {
      console.warn(`[getGallery] Failed to fetch gallery items: ${res.status} ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    return data.items || [];
  } catch (error) {
    console.error("[getGallery] Error fetching gallery items:", error);
    return [];
  }
}

export default async function GalleryPage() {
  const items = await getGallery();

  return (
    <div className="w-full bg-[#FAF9F7] min-h-screen text-[#232629] pb-24">
      {/* ── Page Header ── */}
      <header className="border-b border-[#E5E5E5] bg-white">
        <div className="max-w-4xl mx-auto px-6 pt-16 pb-12 sm:pt-20 sm:pb-16 text-center">
          <span className="inline-block px-3.5 py-1 text-[11px] font-sans font-medium uppercase tracking-[0.25em] text-[#5C6168] bg-[#F1F1EF] rounded-full mb-4">
            Curated Moments
          </span>
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-normal text-[#232629] leading-[1.15]"
            style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
          >
            Photo Gallery
          </h1>
          <p className="mt-4 text-base sm:text-lg text-[#5C6168] max-w-xl mx-auto leading-relaxed">
            A visual retrospective of studio sessions, gallery openings, behind-the-scenes craftsmanship, and living art installations.
          </p>
        </div>
      </header>

      {/* ── Gallery Grid Area ── */}
      <div className="max-w-[1480px] mx-auto px-6 sm:px-10 lg:px-12 pt-12 sm:pt-16">
        {items.length === 0 ? (
          <div className="text-center py-24 max-w-md mx-auto bg-white rounded-2xl p-10 border border-[#E5E5E5] shadow-sm">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#F4F3F0] flex items-center justify-center text-[#5C6168]">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2
              className="text-2xl sm:text-3xl font-normal text-[#232629] mb-2"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Gallery Opening Soon
            </h2>
            <p className="text-sm text-[#5C6168] leading-relaxed mb-6">
              Photos are being curated and arranged. Please check back soon.
            </p>
            <Link
              href="/artworks"
              className="inline-flex items-center justify-center border border-[#232629] bg-[#232629] text-white px-7 py-3 text-xs sm:text-sm font-medium tracking-wide hover:bg-black transition-colors rounded-sm"
            >
              Explore Artworks
            </Link>
          </div>
        ) : (
          <GalleryGrid items={items} />
        )}
      </div>
    </div>
  );
}

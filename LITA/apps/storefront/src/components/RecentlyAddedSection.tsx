"use client";

import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import type { HttpTypes } from "@medusajs/types";
import { formatMoney, lowestPrice, isSoldOut, metaString } from "@/lib/format";

export type ArtworkDisplayItem = {
  id: string;
  handle: string;
  title: string;
  artist: string;
  medium: string;
  price: string;
  image: string;
  isSold?: boolean;
};

// Showcase artworks matching curated studio reference pieces
export const CURATED_RECENT_WORKS: ArtworkDisplayItem[] = [
  {
    id: "curated-1",
    handle: "garden-geometries-no-2",
    title: "Garden Geometries No. 2",
    artist: "Anna Koeferl",
    medium: "Oil on Linen",
    price: "$1,325",
    image: "/artworks/garden-geometries.jpg",
  },
  {
    id: "curated-2",
    handle: "blue-room-sunset-garden",
    title: "Blue Room with Sunset Garden",
    artist: "Sarah Ingraham",
    medium: "Acrylic & Gouache",
    price: "$6,450",
    image: "/artworks/blue-room-sunset.jpg",
  },
  {
    id: "curated-3",
    handle: "wave-of-forgiveness",
    title: "Wave of Forgiveness",
    artist: "Tony Sjöman",
    medium: "Mixed Media on Canvas",
    price: "$2,400",
    image: "/artworks/wave-forgiveness.jpg",
  },
];

export function RecentlyAddedSection({
  products = [],
}: {
  products?: HttpTypes.StoreProduct[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Convert Medusa products to ArtworkDisplayItem format
  const mappedProducts: ArtworkDisplayItem[] = products.map((p) => {
    const priceObj = lowestPrice(p);
    const sold = isSoldOut(p);
    const artist =
      metaString(p, "artist") ||
      metaString(p, "artist_name") ||
      p.subtitle ||
      "Studio Artist";
    const medium =
      p.material || metaString(p, "medium") || "Painting";

    return {
      id: p.id,
      handle: p.handle || p.id,
      title: p.title,
      artist,
      medium,
      price: sold
        ? "Sold"
        : priceObj
        ? formatMoney(priceObj.amount, priceObj.currency)
        : "",
      image: p.thumbnail || "/artworks/garden-geometries.jpg",
      isSold: sold,
    };
  });

  // Combine real store products with the curated showcase pieces
  const allItems: ArtworkDisplayItem[] = [
    ...mappedProducts,
    ...CURATED_RECENT_WORKS.filter(
      (c) => !mappedProducts.some((m) => m.title.toLowerCase() === c.title.toLowerCase())
    ),
  ];

  function updateScrollButtons() {
    if (!containerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  }

  useEffect(() => {
    updateScrollButtons();
    const el = containerRef.current;
    if (el) {
      el.addEventListener("scroll", updateScrollButtons, { passive: true });
      window.addEventListener("resize", updateScrollButtons);
      return () => {
        el.removeEventListener("scroll", updateScrollButtons);
        window.removeEventListener("resize", updateScrollButtons);
      };
    }
  }, [allItems.length]);

  function scroll(direction: "left" | "right") {
    if (!containerRef.current) return;
    const firstCard = containerRef.current.firstElementChild as HTMLElement | null;
    const scrollStep = firstCard ? firstCard.offsetWidth + 24 : containerRef.current.clientWidth / 3;

    containerRef.current.scrollBy({
      left: direction === "left" ? -scrollStep : scrollStep,
      behavior: "smooth",
    });
  }

  return (
    <section className="relative w-full bg-[#FAF9F7] select-none py-14 sm:py-16 md:py-20 border-b border-[#e2e2e2] flex flex-col justify-center">
      {/* ── Section Header: Brand Editorial Headline ── */}
      <div className="w-full text-center mb-10 md:mb-14 px-4">
        <span className="text-[11px] font-semibold tracking-[0.25em] text-[#888888] uppercase block mb-3 font-sans">
          Fresh From The Studio
        </span>
        <h2
          className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-[54px] font-normal text-[#1a1a1a] tracking-tight leading-tight"
          style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
        >
          Recently Added
        </h2>
        <div className="mt-3.5 sm:mt-4">
          <Link
            href="/artworks?sort=newest"
            className="text-xs sm:text-sm text-[#1a1a1a] underline underline-offset-4 hover:opacity-60 transition-opacity font-normal tracking-wide inline-block"
          >
            View All Artworks &rarr;
          </Link>
        </div>
      </div>

      {/* ── Full-Width Carousel Track ── */}
      <div className="relative w-full px-4 sm:px-6 md:px-8 lg:px-10">
        {/* Navigation Arrow: Left */}
        <button
          type="button"
          onClick={() => scroll("left")}
          disabled={!canScrollLeft}
          aria-label="Previous artworks"
          className="absolute left-2 sm:left-3 md:left-4 lg:left-6 top-[33vh] -translate-y-1/2 z-20 flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-white/95 backdrop-blur-sm shadow-[0_4px_16px_rgba(0,0,0,0.08)] border border-[#E5E5E5] text-[#1a1a1a] transition-all hover:scale-105 hover:border-[#1a1a1a] hover:bg-white disabled:opacity-0 disabled:pointer-events-none cursor-pointer focus:outline-none"
        >
          <svg
            className="w-4 h-4 text-[#1a1a1a]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Navigation Arrow: Right */}
        <button
          type="button"
          onClick={() => scroll("right")}
          disabled={!canScrollRight}
          aria-label="Next artworks"
          className="absolute right-2 sm:right-3 md:right-4 lg:right-6 top-[33vh] -translate-y-1/2 z-20 flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-white/95 backdrop-blur-sm shadow-[0_4px_16px_rgba(0,0,0,0.08)] border border-[#E5E5E5] text-[#1a1a1a] transition-all hover:scale-105 hover:border-[#1a1a1a] hover:bg-white disabled:opacity-0 disabled:pointer-events-none cursor-pointer focus:outline-none"
        >
          <svg
            className="w-4 h-4 text-[#1a1a1a]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>

        {/* Scrollable Track: exactly 3 items fill 100% of the desktop row */}
        <div
          ref={containerRef}
          className="flex w-full gap-5 sm:gap-6 md:gap-7 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-none items-stretch py-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {allItems.map((item, index) => (
            <div
              key={item.id}
              className="recently-added-card flex-shrink-0 snap-start flex flex-col justify-between"
            >
              <Link
                href={`/artworks/${item.handle}`}
                className="group flex flex-col w-full h-full text-left"
              >
                {/* Artwork Wall Canvas Container */}
                <div className="relative w-full h-[58vh] sm:h-[62vh] md:h-[65vh] lg:h-[68vh] min-h-[460px] md:min-h-[520px] bg-white border border-[#EBE7DF] overflow-hidden flex items-center justify-center transition-all duration-300 group-hover:border-[#1a1a1a] group-hover:shadow-[0_16px_36px_rgba(0,0,0,0.06)]">
                  <div className="relative w-full h-full p-4 sm:p-6 md:p-8 flex items-center justify-center">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      priority={index < 3}
                      sizes="(min-width: 1024px) 33.33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-contain transition-transform duration-700 ease-out group-hover:scale-[1.03] drop-shadow-[0_16px_28px_rgba(0,0,0,0.09)]"
                    />
                  </div>

                  {item.isSold && (
                    <span className="absolute left-4 top-4 bg-[#1a1a1a] text-white px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] shadow-sm">
                      Sold
                    </span>
                  )}
                </div>

                {/* Gallery Placard Details: Title, Price, Artist, Medium */}
                <div className="pt-4 pb-2 px-1 flex flex-col">
                  {/* Row 1: Title and Price */}
                  <div className="flex items-baseline justify-between gap-4">
                    <h3
                      className="font-serif text-[18px] md:text-[20px] font-normal text-[#1a1a1a] tracking-[0.01em] truncate group-hover:text-black transition-colors"
                      style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
                    >
                      {item.title}
                    </h3>
                    {item.price && (
                      <span className="font-sans text-[14px] md:text-[15px] font-medium text-[#1a1a1a] whitespace-nowrap tabular-nums">
                        {item.price}
                      </span>
                    )}
                  </div>

                  {/* Row 2: Artist */}
                  <p className="font-sans text-[11.5px] uppercase tracking-[0.16em] text-[#666666] font-medium mt-1 truncate">
                    {item.artist}
                  </p>

                  {/* Row 3: Medium (with breathing room) */}
                  <p
                    className="font-serif text-[13.5px] italic text-[#888888] font-normal mt-2.5"
                    style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
                  >
                    {item.medium}
                  </p>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default RecentlyAddedSection;

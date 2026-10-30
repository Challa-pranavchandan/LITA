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

// Showcase artworks exactly matching the user's reference images
export const CURATED_RECENT_WORKS: ArtworkDisplayItem[] = [
  {
    id: "curated-1",
    handle: "garden-geometries-no-2",
    title: "Garden Geometries No. 2",
    artist: "Anna Koeferl",
    medium: "Painting",
    price: "$1,325",
    image: "/artworks/garden-geometries.jpg",
  },
  {
    id: "curated-2",
    handle: "blue-room-sunset-garden",
    title: "Blue Room with Sunset Garden",
    artist: "Sarah Ingraham",
    medium: "Painting",
    price: "$6,450",
    image: "/artworks/blue-room-sunset.jpg",
  },
  {
    id: "curated-3",
    handle: "wave-of-forgiveness",
    title: "Wave of Forgiveness",
    artist: "Tony Sjöman",
    medium: "Painting",
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
    <section className="relative w-full bg-white select-none pt-10 pb-16 md:pt-14 md:pb-20 flex flex-col justify-center">
      {/* ── Section Header: Recently Added & View All ── */}
      <div className="w-full text-center mb-8 md:mb-10 px-4">
        <h2 className="font-sans text-3xl sm:text-4xl md:text-[44px] lg:text-[48px] font-normal text-[#333333] tracking-[-0.015em] leading-tight">
          Recently Added
        </h2>
        <div className="mt-3 sm:mt-3.5">
          <Link
            href="/artworks?sort=newest"
            className="font-sans text-[12.5px] sm:text-[13px] text-[#333333] underline underline-offset-[5px] decoration-[#333333] hover:opacity-60 transition-opacity tracking-normal inline-block"
          >
            View All
          </Link>
        </div>
      </div>

      {/* ── Full-Width Carousel Track ── */}
      <div className="relative w-full px-3 sm:px-5 md:px-7 lg:px-8">
        {/* Navigation Arrow: Left */}
        <button
          type="button"
          onClick={() => scroll("left")}
          disabled={!canScrollLeft}
          aria-label="Previous artworks"
          className="absolute left-1 sm:left-2 md:left-3 lg:left-4 top-[32vh] -translate-y-1/2 z-20 flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-full bg-white shadow-[0_2px_12px_rgba(0,0,0,0.15)] border border-[#E8E8E8] text-[#222222] transition-all hover:scale-105 hover:bg-neutral-50 disabled:opacity-20 disabled:pointer-events-none cursor-pointer focus:outline-none"
        >
          <svg
            className="w-4 h-4 text-[#222222]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
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
          className="absolute right-1 sm:right-2 md:right-3 lg:right-4 top-[32vh] -translate-y-1/2 z-20 flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-full bg-white shadow-[0_2px_12px_rgba(0,0,0,0.15)] border border-[#E8E8E8] text-[#222222] transition-all hover:scale-105 hover:bg-neutral-50 disabled:opacity-20 disabled:pointer-events-none cursor-pointer focus:outline-none"
        >
          <svg
            className="w-4 h-4 text-[#222222]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
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
          className="flex w-full gap-5 sm:gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-none items-stretch py-2"
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
                {/* Artwork Wall Canvas Container (filling ~65-68vh of screen height) */}
                <div className="relative w-full h-[58vh] sm:h-[62vh] md:h-[65vh] lg:h-[68vh] min-h-[460px] md:min-h-[520px] bg-[#F7F7F6] overflow-hidden flex items-center justify-center transition-colors">
                  <div className="relative w-full h-full p-2 sm:p-3 md:p-4 flex items-center justify-center">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      priority={index < 3}
                      sizes="(min-width: 1024px) 33.33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-contain transition-transform duration-500 ease-out group-hover:scale-[1.02] drop-shadow-[0_12px_24px_rgba(0,0,0,0.08)]"
                    />
                  </div>

                  {item.isSold && (
                    <span className="absolute left-4 top-4 bg-white/90 backdrop-blur-sm px-2.5 py-1 text-xs font-medium text-[#222222]">
                      Sold
                    </span>
                  )}
                </div>

                {/* Card Details: Title, Price, Artist, Medium */}
                <div className="pt-4 pb-2 px-0.5 flex flex-col">
                  {/* Row 1: Title and Price */}
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="font-sans text-[14.5px] md:text-[15px] font-normal text-[#222222] tracking-tight truncate group-hover:text-black">
                      {item.title}
                    </h3>
                    {item.price && (
                      <span className="font-sans text-[14.5px] md:text-[15px] font-normal text-[#222222] whitespace-nowrap tabular-nums">
                        {item.price}
                      </span>
                    )}
                  </div>

                  {/* Row 2: Artist */}
                  <p className="font-sans text-[13.5px] md:text-[14px] text-[#666666] font-normal mt-0.5 truncate">
                    {item.artist}
                  </p>

                  {/* Row 3: Medium (with spacing below artist) */}
                  <p className="font-sans text-[13px] text-[#777777] font-normal mt-3">
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

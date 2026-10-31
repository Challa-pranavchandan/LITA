"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { HttpTypes } from "@medusajs/types";
import { useSaved, toggleSaved } from "@/lib/saved";
import { fetchSavedProducts } from "@/app/saved/actions";
import { ArtworkCard } from "@/components/ArtworkGrid";
import { aspectOf, isSoldOut, lowestPrice, metaString } from "@/lib/format";

function EmptySavedState() {
  return (
    <div className="flex min-h-[50vh] sm:min-h-[55vh] flex-col items-center justify-center px-4 py-20 text-center sm:py-28 md:py-36">
      <h1 className="font-cormorant text-4xl sm:text-5xl md:text-[54px] font-normal leading-none tracking-tight text-[#222222]">
        Saved
      </h1>
      <p className="mt-4 sm:mt-5 font-sans text-[14px] sm:text-[15px] text-[#666666]">
        You currently have no saved artworks.
      </p>
      <Link
        href="/artworks"
        className="mt-6 sm:mt-7 inline-flex items-center justify-center rounded-full border border-[#767676] px-6 sm:px-7 py-2 text-[13px] sm:text-[14px] font-normal text-[#222222] transition-colors duration-200 hover:border-black hover:bg-black hover:text-white"
      >
        Browse Artwork
      </Link>
    </div>
  );
}

function FilterAccordion({
  title,
  isOpen,
  onToggle,
  active,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-[#EAEAEA]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between py-3.5 text-left text-[14px] text-[#222222] transition-colors hover:text-black group"
      >
        <span className="flex items-center gap-2 font-normal">
          {title}
          {active && (
            <span className="h-1.5 w-1.5 rounded-full bg-[#222222]" />
          )}
        </span>
        <span className="text-[17px] font-light text-[#222222] group-hover:text-black select-none leading-none">
          {isOpen ? "−" : "+"}
        </span>
      </button>
      {isOpen && (
        <div className="pb-4 pt-1 space-y-1.5 text-[13.5px]">
          {children}
        </div>
      )}
    </div>
  );
}

export function SavedWorks() {
  const ids = useSaved();
  const key = ids.join(",");
  const [products, setProducts] = useState<HttpTypes.StoreProduct[] | null>(null);
  const [mounted, setMounted] = useState(false);

  // Filter sidebar state
  const [showFilters, setShowFilters] = useState(true);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  // Filter selections
  const [availability, setAvailability] = useState<"all" | "available" | "sold">("all");
  const [selectedMedium, setSelectedMedium] = useState<string>("all");
  const [selectedArtist, setSelectedArtist] = useState<string>("all");
  const [selectedSize, setSelectedSize] = useState<"all" | "small" | "medium" | "large">("all");
  const [selectedOrientation, setSelectedOrientation] = useState<"all" | "horizontal" | "vertical" | "square">("all");
  const [selectedPrice, setSelectedPrice] = useState<"all" | "under-5000" | "5000-15000" | "over-15000">("all");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!ids.length) {
      setProducts([]);
      return;
    }
    fetchSavedProducts(ids).then((p) => {
      if (cancelled) return;
      setProducts(p);

      // Prune unresolvable or deleted catalog products in background
      if (p.length > 0 && ids.length > p.length) {
        const foundSet = new Set(p.map((item) => item.id));
        const staleIds = ids.filter((id) => !foundSet.has(id));
        if (staleIds.length > 0) {
          staleIds.forEach((staleId) => {
            toggleSaved(staleId).catch(() => {});
          });
        }
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const toggleSection = (name: string) => {
    setOpenSections((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const hasActiveFilters =
    availability !== "all" ||
    selectedMedium !== "all" ||
    selectedArtist !== "all" ||
    selectedSize !== "all" ||
    selectedOrientation !== "all" ||
    selectedPrice !== "all";

  const clearFilters = () => {
    setAvailability("all");
    setSelectedMedium("all");
    setSelectedArtist("all");
    setSelectedSize("all");
    setSelectedOrientation("all");
    setSelectedPrice("all");
  };

  // Saved artworks matching the current user's saved IDs
  const savedProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => ids.includes(p.id));
  }, [products, ids]);

  // Derived filter options from actual saved artworks
  const availableMediums = useMemo(() => {
    const set = new Set<string>();
    savedProducts.forEach((p) => {
      const m = p.material || metaString(p, "medium") || "Painting";
      if (m) set.add(m);
    });
    return Array.from(set);
  }, [savedProducts]);

  const availableArtists = useMemo(() => {
    const set = new Set<string>();
    savedProducts.forEach((p) => {
      const a =
        metaString(p, "artist") ||
        metaString(p, "artist_name") ||
        p.subtitle ||
        "Studio Artist";
      if (a) set.add(a);
    });
    return Array.from(set);
  }, [savedProducts]);

  // Apply filters
  const filteredProducts = useMemo(() => {
    return savedProducts.filter((p) => {
      // 1. Availability
      if (availability === "available" && isSoldOut(p)) return false;
      if (availability === "sold" && !isSoldOut(p)) return false;

      // 2. Medium
      if (selectedMedium !== "all") {
        const m = (p.material || metaString(p, "medium") || "Painting").toLowerCase();
        if (m !== selectedMedium.toLowerCase()) return false;
      }

      // 3. Artist
      if (selectedArtist !== "all") {
        const a =
          metaString(p, "artist") ||
          metaString(p, "artist_name") ||
          p.subtitle ||
          "Studio Artist";
        if (a !== selectedArtist) return false;
      }

      // 4. Size
      if (selectedSize !== "all") {
        const w = Number(p.width) || 0;
        const h = Number(p.height) || 0;
        const maxDim = Math.max(w, h);
        if (selectedSize === "small" && maxDim >= 40 && maxDim > 0) return false;
        if (selectedSize === "medium" && (maxDim < 40 || maxDim > 100)) return false;
        if (selectedSize === "large" && maxDim <= 100) return false;
      }

      // 5. Orientation
      if (selectedOrientation !== "all") {
        const ratio = aspectOf(p);
        if (selectedOrientation === "horizontal" && ratio <= 1.05) return false;
        if (selectedOrientation === "vertical" && ratio >= 0.95) return false;
        if (selectedOrientation === "square" && (ratio < 0.95 || ratio > 1.05)) return false;
      }

      // 6. Price
      if (selectedPrice !== "all") {
        const price = lowestPrice(p);
        const amount = price?.amount ?? 0;
        if (selectedPrice === "under-5000" && amount >= 5000) return false;
        if (selectedPrice === "5000-15000" && (amount < 5000 || amount > 15000)) return false;
        if (selectedPrice === "over-15000" && amount <= 15000) return false;
      }

      return true;
    });
  }, [
    savedProducts,
    availability,
    selectedMedium,
    selectedArtist,
    selectedSize,
    selectedOrientation,
    selectedPrice,
  ]);

  // If not yet mounted on client or no saved works, render empty state
  if (!mounted || ids.length === 0) {
    return <EmptySavedState />;
  }

  if (products === null) {
    return (
      <div className="w-full bg-white">
        <div className="pt-10 pb-8 sm:pt-14 sm:pb-12 text-center">
          <h1 className="font-cormorant text-4xl sm:text-5xl md:text-[54px] font-normal leading-none tracking-tight text-[#222222]">
            Saved
          </h1>
        </div>
        <div className="w-full border-b border-[#E5E5E5]" />
        <div className="py-20 text-center text-sm text-[#666666]">
          Loading your saved artworks…
        </div>
      </div>
    );
  }

  if (savedProducts.length === 0) {
    return <EmptySavedState />;
  }

  return (
    <div className="w-full bg-white">
      {/* 1. Centered Header */}
      <div className="pt-10 pb-8 sm:pt-14 sm:pb-12 text-center">
        <h1 className="font-cormorant text-4xl sm:text-5xl md:text-[54px] font-normal leading-none tracking-tight text-[#222222]">
          Saved
        </h1>
      </div>

      {/* 2. Full-width border below 'Saved' */}
      <div className="w-full border-b border-[#E5E5E5]" />

      {/* 3. Action Bar & Content Area */}
      <div className="mx-auto w-full max-w-[1480px] px-6 sm:px-10 md:px-12 pt-7 pb-24">
        {/* Top Filter Button */}
        <div className="mb-7">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2.5 rounded-full bg-[#2E3033] px-4 py-2 text-[13px] font-normal text-white transition-colors hover:bg-black"
            aria-expanded={showFilters}
          >
            <span>{showFilters ? "Hide filters" : "Show filters"}</span>
            <svg
              width="13"
              height="13"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <line x1="2" y1="4" x2="14" y2="4" />
              <line x1="4.5" y1="8" x2="11.5" y2="8" />
              <line x1="7" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>

        {/* 2-Column Layout */}
        <div
          className={`grid gap-8 lg:gap-12 ${
            showFilters
              ? "grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)]"
              : "grid-cols-1"
          }`}
        >
          {/* Left Column: Sidebar Filters */}
          {showFilters && (
            <aside className="w-full">
              {/* Artwork Count */}
              <div className="flex items-baseline justify-between mb-5">
                <span className="text-[14px] font-normal text-[#222222]">
                  {filteredProducts.length} {filteredProducts.length === 1 ? "Artwork" : "Artworks"}
                </span>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-[12.5px] text-[#666666] hover:text-black underline underline-offset-2"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Accordion Filters */}
              <div>
                {/* 1. Availability */}
                <FilterAccordion
                  title="Availability"
                  isOpen={Boolean(openSections.availability)}
                  onToggle={() => toggleSection("availability")}
                  active={availability !== "all"}
                >
                  <label className="flex items-center gap-2.5 py-1 cursor-pointer text-[#444444] hover:text-black">
                    <input
                      type="radio"
                      name="availability"
                      checked={availability === "all"}
                      onChange={() => setAvailability("all")}
                      className="accent-[#222222]"
                    />
                    <span>All</span>
                  </label>
                  <label className="flex items-center gap-2.5 py-1 cursor-pointer text-[#444444] hover:text-black">
                    <input
                      type="radio"
                      name="availability"
                      checked={availability === "available"}
                      onChange={() => setAvailability("available")}
                      className="accent-[#222222]"
                    />
                    <span>Available</span>
                  </label>
                  <label className="flex items-center gap-2.5 py-1 cursor-pointer text-[#444444] hover:text-black">
                    <input
                      type="radio"
                      name="availability"
                      checked={availability === "sold"}
                      onChange={() => setAvailability("sold")}
                      className="accent-[#222222]"
                    />
                    <span>Sold</span>
                  </label>
                </FilterAccordion>

                {/* 2. Medium */}
                <FilterAccordion
                  title="Medium"
                  isOpen={Boolean(openSections.medium)}
                  onToggle={() => toggleSection("medium")}
                  active={selectedMedium !== "all"}
                >
                  <label className="flex items-center gap-2.5 py-1 cursor-pointer text-[#444444] hover:text-black">
                    <input
                      type="radio"
                      name="medium"
                      checked={selectedMedium === "all"}
                      onChange={() => setSelectedMedium("all")}
                      className="accent-[#222222]"
                    />
                    <span>All</span>
                  </label>
                  {availableMediums.map((m) => (
                    <label key={m} className="flex items-center gap-2.5 py-1 cursor-pointer text-[#444444] hover:text-black">
                      <input
                        type="radio"
                        name="medium"
                        checked={selectedMedium.toLowerCase() === m.toLowerCase()}
                        onChange={() => setSelectedMedium(m)}
                        className="accent-[#222222]"
                      />
                      <span>{m}</span>
                    </label>
                  ))}
                </FilterAccordion>

                {/* 3. Artists */}
                <FilterAccordion
                  title="Artists"
                  isOpen={Boolean(openSections.artists)}
                  onToggle={() => toggleSection("artists")}
                  active={selectedArtist !== "all"}
                >
                  <label className="flex items-center gap-2.5 py-1 cursor-pointer text-[#444444] hover:text-black">
                    <input
                      type="radio"
                      name="artist"
                      checked={selectedArtist === "all"}
                      onChange={() => setSelectedArtist("all")}
                      className="accent-[#222222]"
                    />
                    <span>All</span>
                  </label>
                  {availableArtists.map((a) => (
                    <label key={a} className="flex items-center gap-2.5 py-1 cursor-pointer text-[#444444] hover:text-black">
                      <input
                        type="radio"
                        name="artist"
                        checked={selectedArtist === a}
                        onChange={() => setSelectedArtist(a)}
                        className="accent-[#222222]"
                      />
                      <span>{a}</span>
                    </label>
                  ))}
                </FilterAccordion>

                {/* 4. Size */}
                <FilterAccordion
                  title="Size"
                  isOpen={Boolean(openSections.size)}
                  onToggle={() => toggleSection("size")}
                  active={selectedSize !== "all"}
                >
                  <label className="flex items-center gap-2.5 py-1 cursor-pointer text-[#444444] hover:text-black">
                    <input
                      type="radio"
                      name="size"
                      checked={selectedSize === "all"}
                      onChange={() => setSelectedSize("all")}
                      className="accent-[#222222]"
                    />
                    <span>All</span>
                  </label>
                  <label className="flex items-center gap-2.5 py-1 cursor-pointer text-[#444444] hover:text-black">
                    <input
                      type="radio"
                      name="size"
                      checked={selectedSize === "small"}
                      onChange={() => setSelectedSize("small")}
                      className="accent-[#222222]"
                    />
                    <span>Small (under 40cm)</span>
                  </label>
                  <label className="flex items-center gap-2.5 py-1 cursor-pointer text-[#444444] hover:text-black">
                    <input
                      type="radio"
                      name="size"
                      checked={selectedSize === "medium"}
                      onChange={() => setSelectedSize("medium")}
                      className="accent-[#222222]"
                    />
                    <span>Medium (40–100cm)</span>
                  </label>
                  <label className="flex items-center gap-2.5 py-1 cursor-pointer text-[#444444] hover:text-black">
                    <input
                      type="radio"
                      name="size"
                      checked={selectedSize === "large"}
                      onChange={() => setSelectedSize("large")}
                      className="accent-[#222222]"
                    />
                    <span>Large (over 100cm)</span>
                  </label>
                </FilterAccordion>

                {/* 5. Orientation */}
                <FilterAccordion
                  title="Orientation"
                  isOpen={Boolean(openSections.orientation)}
                  onToggle={() => toggleSection("orientation")}
                  active={selectedOrientation !== "all"}
                >
                  <label className="flex items-center gap-2.5 py-1 cursor-pointer text-[#444444] hover:text-black">
                    <input
                      type="radio"
                      name="orientation"
                      checked={selectedOrientation === "all"}
                      onChange={() => setSelectedOrientation("all")}
                      className="accent-[#222222]"
                    />
                    <span>All</span>
                  </label>
                  <label className="flex items-center gap-2.5 py-1 cursor-pointer text-[#444444] hover:text-black">
                    <input
                      type="radio"
                      name="orientation"
                      checked={selectedOrientation === "horizontal"}
                      onChange={() => setSelectedOrientation("horizontal")}
                      className="accent-[#222222]"
                    />
                    <span>Horizontal</span>
                  </label>
                  <label className="flex items-center gap-2.5 py-1 cursor-pointer text-[#444444] hover:text-black">
                    <input
                      type="radio"
                      name="orientation"
                      checked={selectedOrientation === "vertical"}
                      onChange={() => setSelectedOrientation("vertical")}
                      className="accent-[#222222]"
                    />
                    <span>Vertical</span>
                  </label>
                  <label className="flex items-center gap-2.5 py-1 cursor-pointer text-[#444444] hover:text-black">
                    <input
                      type="radio"
                      name="orientation"
                      checked={selectedOrientation === "square"}
                      onChange={() => setSelectedOrientation("square")}
                      className="accent-[#222222]"
                    />
                    <span>Square</span>
                  </label>
                </FilterAccordion>

                {/* 6. Price */}
                <FilterAccordion
                  title="Price"
                  isOpen={Boolean(openSections.price)}
                  onToggle={() => toggleSection("price")}
                  active={selectedPrice !== "all"}
                >
                  <label className="flex items-center gap-2.5 py-1 cursor-pointer text-[#444444] hover:text-black">
                    <input
                      type="radio"
                      name="price"
                      checked={selectedPrice === "all"}
                      onChange={() => setSelectedPrice("all")}
                      className="accent-[#222222]"
                    />
                    <span>All</span>
                  </label>
                  <label className="flex items-center gap-2.5 py-1 cursor-pointer text-[#444444] hover:text-black">
                    <input
                      type="radio"
                      name="price"
                      checked={selectedPrice === "under-5000"}
                      onChange={() => setSelectedPrice("under-5000")}
                      className="accent-[#222222]"
                    />
                    <span>Under ₹5,000</span>
                  </label>
                  <label className="flex items-center gap-2.5 py-1 cursor-pointer text-[#444444] hover:text-black">
                    <input
                      type="radio"
                      name="price"
                      checked={selectedPrice === "5000-15000"}
                      onChange={() => setSelectedPrice("5000-15000")}
                      className="accent-[#222222]"
                    />
                    <span>₹5,000 – ₹15,000</span>
                  </label>
                  <label className="flex items-center gap-2.5 py-1 cursor-pointer text-[#444444] hover:text-black">
                    <input
                      type="radio"
                      name="price"
                      checked={selectedPrice === "over-15000"}
                      onChange={() => setSelectedPrice("over-15000")}
                      className="accent-[#222222]"
                    />
                    <span>Over ₹15,000</span>
                  </label>
                </FilterAccordion>
              </div>
            </aside>
          )}

          {/* Right Column: Artwork Grid */}
          <div className="min-w-0">
            {filteredProducts.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-[15px] text-[#666666]">
                  No saved artworks match the selected filters.
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 inline-flex items-center justify-center rounded-full border border-[#767676] px-5 py-2 text-[13px] text-[#222222] hover:border-black hover:bg-black hover:text-white transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div
                className={`grid gap-x-6 gap-y-10 ${
                  showFilters
                    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3"
                    : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                }`}
              >
                {filteredProducts.map((p, i) => (
                  <ArtworkCard key={p.id} product={p} priority={i < 4} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}



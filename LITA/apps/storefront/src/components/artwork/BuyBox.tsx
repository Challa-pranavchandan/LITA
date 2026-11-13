"use client";

import React, { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { addToCart } from "@/lib/data/cart";
import { CART_OPEN_EVENT } from "@/components/CartDrawer";
import { useSaved, toggleSaved } from "@/lib/saved";
import { formatMoney } from "@/lib/format";
import type { VariantOption } from "@/components/AddToCart";
import { SpecGrid } from "./SpecGrid";
import { TrustBadges } from "./TrustBadges";
import { ArtworkScaleVisual } from "./ArtworkScaleVisual";
import { StickyAddToCartBar } from "./StickyAddToCartBar";
import { useIsCarted, markCarted } from "@/lib/carted";

export interface BuyBoxProps {
  productId: string;
  handle: string;
  title: string;
  artist: string;
  artistHandle?: string;
  price: number | null;
  currency: string | null;
  material: string;
  description: string;
  extendedDescription?: string;
  dimensionsIn: string;
  dimensionsCm: string;
  framedDimensionsIn?: string;
  framedDimensionsCm?: string;
  framingNote?: string;
  year?: string;
  framing?: string;
  variants: VariantOption[];
  shippingTimeline?: string;
  thumbnailUrl?: string;
  artworkInfo?: {
    medium?: string;
    support?: string;
    signature?: string;
    certificate?: string;
    year?: string;
    provenance?: string;
    condition?: string;
  };
  shippingDetails?: {
    transit?: string;
    packaging?: string;
    timeline?: string;
    returns?: string;
  };
  className?: string;
  initialInCart?: boolean;
}

export function BuyBox({
  productId,
  handle: _handle,
  title,
  artist,
  artistHandle,
  price,
  currency = "USD",
  material,
  description,
  extendedDescription,
  dimensionsIn,
  dimensionsCm,
  framedDimensionsIn,
  framedDimensionsCm,
  framingNote,
  year = "2024",
  framing = "Unframed, edge-painted (custom floater frame available)",
  variants = [],
  shippingTimeline = "1-3 weeks",
  thumbnailUrl = "/artworks/blue-room-front.jpg",
  artworkInfo,
  shippingDetails,
  className = "",
  initialInCart = false,
}: BuyBoxProps) {
  const shouldReduceMotion = useReducedMotion();

  // Summary Read More toggle
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

  // Accordion state (Dimensions open by default)
  const [openSections, setOpenSections] = useState<{
    dimensions: boolean;
    info: boolean;
    shipping: boolean;
  }>({
    dimensions: true,
    info: false,
    shipping: false,
  });

  // Affirm Modal state
  const [showAffirmModal, setShowAffirmModal] = useState(false);

  // Cart transition
  const firstAvailable = variants.find((v) => !v.soldOut) ?? variants[0];
  const [selectedVariantId, setSelectedVariantId] = useState(
    firstAvailable?.id || `variant_${productId}`
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Persistent "in cart" state — survives page refresh via localStorage & server cart
  const isInCart = useIsCarted(selectedVariantId, initialInCart);

  // Sticky add-to-cart intersection observer
  const [showStickyBar, setShowStickyBar] = useState(false);
  const mainCtaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mainCtaRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // When main CTA is NOT intersecting (scrolled above view), show sticky bar
        setShowStickyBar(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Saved / Wishlist hook
  const isSaved = useSaved().includes(productId);

  const selectedVariant = variants.find((v) => v.id === selectedVariantId);
  const currentPrice = selectedVariant?.amount ?? price;
  const currentCurrency = selectedVariant?.currency ?? currency;
  const isSold = selectedVariant?.soldOut ?? false;

  function toggleSection(key: "dimensions" | "info" | "shipping") {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleAddToCart() {
    setError(null);
    startTransition(async () => {
      const res = await addToCart(selectedVariantId, 1);
      if (!res.ok) {
        // Fallback for curated mock products not yet populated in remote Medusa
        if (res.error?.includes("variant") || res.error?.includes("not found")) {
          markCarted(selectedVariantId);
          window.dispatchEvent(new Event(CART_OPEN_EVENT));
          return;
        }
        setError(res.error);
        return;
      }
      markCarted(selectedVariantId);
      window.dispatchEvent(new Event(CART_OPEN_EVENT));
    });
  }

  const installmentPrice = currentPrice ? Math.round(currentPrice / 4) : 0;

  // Split description into one-line teaser + remaining text
  const cleanDescription = description || "Original fine artwork by artist.";
  const firstSentenceMatch = cleanDescription.match(/^(.*?[.!?])(\s+|$)/);
  const oneLineSummary = firstSentenceMatch ? firstSentenceMatch[1] : cleanDescription;
  const remainingDescription = firstSentenceMatch
    ? cleanDescription.slice(oneLineSummary.length).trim()
    : "";

  return (
    <>
      {/* Sticky Mini Add To Cart Bar */}
      <StickyAddToCartBar
        isVisible={showStickyBar}
        thumbnailUrl={thumbnailUrl}
        title={title}
        artist={artist}
        price={currentPrice}
        currency={currentCurrency}
        onAddToCart={handleAddToCart}
        pending={pending}
        isSold={isSold}
        added={isInCart}
      />

      {/* Buy Box Card: 1px hairline border, subtle background, rounded-xl */}
      <div
        className={`w-full rounded-xl border border-gallery-hairline bg-gallery-card/90 backdrop-blur-xs p-6 sm:p-8 lg:p-9 shadow-sm transition-shadow hover:shadow-card-lift text-left ${className}`}
      >
        {/* 1. Small uppercase eyebrow in accent colour */}
        <span className="block text-[11px] font-semibold uppercase tracking-eyebrow text-gallery-accent mb-2">
          {material ? material.toUpperCase() : "ACRYLIC ON CANVAS"}
        </span>

        {/* 2. Large serif title with thin accent red line */}
        <h1
          className="font-serif text-3xl sm:text-4xl lg:text-[40px] font-normal text-gallery-charcoal leading-[1.14] tracking-tight"
          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
        >
          {title}
        </h1>

        {/* Thin accent line under title */}
        <div className="w-10 h-[2px] bg-gallery-accent mt-3 mb-2.5" />

        {/* Artist Name & "View more works" link */}
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-base font-normal text-gallery-muted">by</span>
          <Link
            href={artistHandle ? `/artists/${artistHandle}` : "/about"}
            className="text-base font-medium text-gallery-charcoal hover:text-gallery-accent hover:underline underline-offset-4 transition-colors"
          >
            {artist}
          </Link>
          <span className="text-gallery-hairline text-xs">·</span>
          <Link
            href="/artworks"
            className="text-xs uppercase tracking-wider text-gallery-muted hover:text-gallery-accent transition-colors"
          >
            View more works →
          </Link>
        </div>

        {/* 3. Price (larger and bolder than artist name) */}
        {currentPrice != null && (
          <div className="mt-4 text-3xl sm:text-[34px] font-semibold text-gallery-charcoal tabular-nums tracking-tight">
            {formatMoney(currentPrice, currentCurrency)}
          </div>
        )}

        {/* 4. Short summary with "Read more" toggle */}
        <div className="mt-4 text-sm leading-relaxed text-gallery-charcoal/90 border-t border-gallery-hairline/80 pt-4">
          <p className="inline">
            {oneLineSummary}
            {!isSummaryExpanded && (remainingDescription || extendedDescription) && (
              <>
                {" "}
                <button
                  type="button"
                  onClick={() => setIsSummaryExpanded(true)}
                  className="font-medium text-gallery-accent hover:underline underline-offset-2 cursor-pointer inline"
                >
                  Read more
                </button>
              </>
            )}
          </p>

          <AnimatePresence>
            {isSummaryExpanded && (
              <motion.div
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="mt-2.5 space-y-2.5 text-gallery-muted overflow-hidden"
              >
                {remainingDescription && <p>{remainingDescription}</p>}
                {extendedDescription &&
                  extendedDescription.split("\n\n").map((para, idx) => (
                    <p key={idx}>{para}</p>
                  ))}
                <button
                  type="button"
                  onClick={() => setIsSummaryExpanded(false)}
                  className="font-medium text-gallery-accent hover:underline underline-offset-2 cursor-pointer block mt-1 text-xs"
                >
                  Show less
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 5. Spec Grid (2 columns: Medium, Size with in/cm toggle, Year, Framing) */}
        <SpecGrid
          medium={material}
          dimensionsIn={dimensionsIn}
          dimensionsCm={dimensionsCm}
          year={year}
          framing={framing}
          className="my-5"
        />

        {/* Multiple Editions / Variants Picker (if applicable) */}
        {variants.length > 1 && (
          <div className="mb-5">
            <label className="block text-[11px] uppercase tracking-eyebrow text-gallery-muted font-medium mb-2">
              Select Edition
            </label>
            <div className="flex flex-wrap gap-2">
              {variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVariantId(v.id)}
                  className={`py-2 px-3.5 text-xs rounded-lg border transition-all cursor-pointer ${
                    v.id === selectedVariantId
                      ? "border-gallery-charcoal bg-gallery-charcoal text-white font-medium"
                      : "border-gallery-hairline bg-white/70 text-gallery-charcoal hover:border-gallery-charcoal/50"
                  }`}
                >
                  {v.title}
                  {v.amount && ` (${formatMoney(v.amount, v.currency)})`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 6. Action CTAs */}
        <div className="space-y-3">
          {/* Sentinel for sticky-bar observer (always in DOM) */}
          <div ref={mainCtaRef} aria-hidden="true" className="h-0" />
          {/* Primary CTA: "Add to Cart" → switches to "Go to Cart →" once added */}
          {isInCart ? (
            <Link
              href="/cart"
              className="w-full bg-[#2E7D32] hover:bg-[#256328] text-white py-4 px-6 rounded-xl text-[15px] font-medium tracking-wide transition-all duration-200 text-center shadow-md hover:-translate-y-0.5 hover:shadow-btn-lift flex items-center justify-center gap-2"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
              Go to Cart →
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={pending || isSold}
              className="w-full bg-gallery-charcoal hover:bg-black text-gallery-page py-4 px-6 rounded-xl text-[15px] font-medium tracking-wide transition-all duration-200 text-center shadow-md hover:-translate-y-0.5 hover:shadow-btn-lift active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSold ? "Sold Out" : pending ? "Adding to Cart…" : "Add to Cart"}
            </button>
          )}

          {/* Secondary "Save Artwork" Outline Button with Heart turning accent colour */}
          <button
            type="button"
            onClick={() => toggleSaved(productId)}
            aria-pressed={isSaved}
            className={`w-full group bg-transparent border py-3.5 px-6 rounded-xl text-[14px] font-medium tracking-wide transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5 ${
              isSaved
                ? "border-gallery-accent text-gallery-accent bg-gallery-accent/5"
                : "border-gallery-hairline text-gallery-charcoal hover:border-gallery-accent hover:text-gallery-accent"
            }`}
          >
            <svg
              className={`w-4 h-4 transition-colors duration-200 ${
                isSaved
                  ? "fill-gallery-accent text-gallery-accent scale-105"
                  : "fill-none stroke-current group-hover:text-gallery-accent"
              }`}
              viewBox="0 0 24 24"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              />
            </svg>
            <span>{isSaved ? "Saved to Collection" : "Save Artwork"}</span>
          </button>

          {/* Feedbacks */}
          {error && (
            <p className="text-xs text-red-600 mt-2 text-center" role="alert">
              {error}
            </p>
          )}
        </div>

        {/* 7. Trust Row under buttons */}
        <TrustBadges shippingTimeline={shippingTimeline} className="mt-5" />

        {/* 8. Affirm line (smaller, muted) */}
        <div className="mt-4 pt-3 border-t border-gallery-hairline/60 flex items-center justify-between text-[11px] text-gallery-muted">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span>Pay in 4 interest-free installments of</span>
            <span className="font-semibold text-gallery-charcoal">
              {formatMoney(installmentPrice, currentCurrency)}
            </span>
            <span>with</span>
            <span className="font-bold text-gallery-charcoal tracking-tight text-xs">
              affirm
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowAffirmModal(true)}
            className="underline hover:text-gallery-charcoal cursor-pointer font-medium ml-2 shrink-0"
          >
            Learn more
          </button>
        </div>

        {/* 9. Dimensions & Framing Accordion with Scale Visual */}
        <div className="mt-5 border-t border-gallery-hairline divide-y divide-gallery-hairline">
          {/* Section 1: Dimensions & Framing with Scale Silhouette Visual */}
          <div className="py-3.5">
            <button
              type="button"
              onClick={() => toggleSection("dimensions")}
              aria-expanded={openSections.dimensions}
              className="w-full flex items-center justify-between text-left text-sm font-medium text-gallery-charcoal hover:text-gallery-accent transition-colors cursor-pointer"
            >
              <span>Dimensions & Framing</span>
              <span className="text-base text-gallery-muted font-light">
                {openSections.dimensions ? "−" : "+"}
              </span>
            </button>

            {openSections.dimensions && (
              <div className="pt-3 pb-1 space-y-3 text-xs text-gallery-muted">
                <div>
                  <span className="font-medium text-gallery-charcoal block mb-0.5">
                    Unframed Artwork Canvas
                  </span>
                  <p>
                    {dimensionsIn} / {dimensionsCm}
                  </p>
                </div>

                <div>
                  <span className="font-medium text-gallery-charcoal block mb-0.5">
                    Framed Exterior Dimensions
                  </span>
                  <p>
                    {framedDimensionsIn || dimensionsIn} /{" "}
                    {framedDimensionsCm || dimensionsCm}
                  </p>
                  <p className="mt-1 text-[11px] text-gallery-muted/80">
                    {framingNote || "Bespoke museum floater framing is hand-crafted from solid FSC-certified hardwood (natural maple, walnut, or satin black)."}
                  </p>
                </div>

                {/* Scale Visual */}
                <ArtworkScaleVisual dimensionsIn={dimensionsIn} />
              </div>
            )}
          </div>

          {/* Section 2: Artwork Information & Provenance */}
          <div className="py-3.5">
            <button
              type="button"
              onClick={() => toggleSection("info")}
              aria-expanded={openSections.info}
              className="w-full flex items-center justify-between text-left text-sm font-medium text-gallery-charcoal hover:text-gallery-accent transition-colors cursor-pointer"
            >
              <span>Artwork Information</span>
              <span className="text-base text-gallery-muted font-light">
                {openSections.info ? "−" : "+"}
              </span>
            </button>

            {openSections.info && (
              <div className="pt-3 pb-1 space-y-2 text-xs text-gallery-muted">
                <div className="grid grid-cols-[100px_1fr] gap-2">
                  <span className="text-gallery-muted/80">Medium</span>
                  <span className="text-gallery-charcoal font-medium">
                    {artworkInfo?.medium || material || "Acrylic on canvas"}
                  </span>
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-2">
                  <span className="text-gallery-muted/80">Support</span>
                  <span className="text-gallery-charcoal font-medium">
                    {artworkInfo?.support ||
                      "Heavyweight Belgian linen on kiln-dried solid wood stretcher bars"}
                  </span>
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-2">
                  <span className="text-gallery-muted/80">Signature</span>
                  <span className="text-gallery-charcoal font-medium">
                    {artworkInfo?.signature ||
                      `Hand-signed, titled, and dated on verso by ${artist}`}
                  </span>
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-2">
                  <span className="text-gallery-muted/80">Authenticity</span>
                  <span className="text-gallery-charcoal font-medium">
                    {artworkInfo?.certificate ||
                      "Includes physical Certificate of Authenticity registered with LITA Studio Archive"}
                  </span>
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-2">
                  <span className="text-gallery-muted/80">Year</span>
                  <span className="text-gallery-charcoal font-medium">
                    {artworkInfo?.year || year}
                  </span>
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-2">
                  <span className="text-gallery-muted/80">Provenance</span>
                  <span className="text-gallery-charcoal font-medium">
                    {artworkInfo?.provenance || "Direct from the artist's studio"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Fine Art Shipping & Returns */}
          <div className="py-3.5">
            <button
              type="button"
              onClick={() => toggleSection("shipping")}
              aria-expanded={openSections.shipping}
              className="w-full flex items-center justify-between text-left text-sm font-medium text-gallery-charcoal hover:text-gallery-accent transition-colors cursor-pointer"
            >
              <span>Shipping & Guarantee</span>
              <span className="text-base text-gallery-muted font-light">
                {openSections.shipping ? "−" : "+"}
              </span>
            </button>

            {openSections.shipping && (
              <div className="pt-3 pb-1 space-y-2.5 text-xs text-gallery-muted leading-relaxed">
                <p>
                  {shippingDetails?.transit ||
                    "Insured transit via fine-art courier with dedicated GPS tracking and white-glove delivery options."}
                </p>
                <p>
                  {shippingDetails?.packaging ||
                    "Packaged in a custom-built museum timber crate with archival interior cushions and moisture protection."}
                </p>
                <p>
                  {shippingDetails?.returns ||
                    "14-day collector trial policy. If the artwork does not resonate in your space, you may return it for a full refund."}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Advisory Link */}
        <div className="mt-4 pt-3 border-t border-gallery-hairline/60 text-xs text-gallery-muted flex items-center justify-between">
          <span>Need custom framing or mockups?</span>
          <a
            href="#inquire"
            className="text-gallery-charcoal hover:text-gallery-accent font-medium underline underline-offset-2 transition-colors"
          >
            Ask our curators →
          </a>
        </div>
      </div>

      {/* Affirm Modal */}
      {showAffirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setShowAffirmModal(false)}
        >
          <div
            className="bg-white rounded-xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-gallery-hairline text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-serif text-xl font-normal text-gallery-charcoal">
                Pay over time with Affirm
              </h3>
              <button
                type="button"
                onClick={() => setShowAffirmModal(false)}
                className="text-neutral-400 hover:text-black text-2xl leading-none cursor-pointer"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-gallery-muted leading-relaxed mb-4">
              Split your purchase into 4 interest-free bi-weekly payments of{" "}
              <strong className="text-gallery-charcoal">
                {formatMoney(installmentPrice, currentCurrency)}
              </strong>
              , or choose flexible monthly terms up to 36 months.
            </p>
            <ul className="text-xs text-gallery-muted space-y-2 mb-6">
              <li>✓ No hidden fees or surprises</li>
              <li>✓ Checking eligibility won&apos;t affect your credit score</li>
              <li>✓ Immediate decision upon checkout</li>
            </ul>
            <button
              type="button"
              onClick={() => setShowAffirmModal(false)}
              className="w-full bg-gallery-charcoal text-white py-3 rounded-lg text-sm font-medium hover:bg-black transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}

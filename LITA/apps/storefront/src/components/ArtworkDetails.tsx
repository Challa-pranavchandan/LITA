"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { addToCart } from "@/lib/data/cart";
import { CART_OPEN_EVENT } from "@/components/CartDrawer";
import { useSaved, toggleSaved } from "@/lib/saved";
import { formatMoney } from "@/lib/format";
import type { VariantOption } from "@/components/AddToCart";

export interface ArtworkDetailsProps {
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
  depthIn?: string;
  depthCm?: string;
  variants: VariantOption[];
  shippingTimeline?: string;
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
}

export function ArtworkDetails({
  productId,
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
  variants = [],
  shippingTimeline = "1-3 weeks",
  artworkInfo,
  shippingDetails,
}: ArtworkDetailsProps) {
  // Unit switcher state ('in' | 'cm')
  const [unit, setUnit] = useState<"in" | "cm">("in");

  // Read more expand/collapse
  const [isExpanded, setIsExpanded] = useState(false);

  // Accordion open states (Dimensions open by default as in reference image)
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
  const [added, setAdded] = useState(false);

  // Saved / Wishlist
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
    setAdded(false);
    startTransition(async () => {
      const res = await addToCart(selectedVariantId, 1);
      if (!res.ok) {
        setError(res.error || "Failed to add artwork to cart.");
        return;
      }
      setAdded(true);
      window.dispatchEvent(new Event(CART_OPEN_EVENT));
    });
  }

  // Affirm calculation (4 interest-free installments)
  const installmentPrice = currentPrice ? Math.round(currentPrice / 4) : 0;

  return (
    <div className="w-full flex flex-col font-sans">
      {/* Title & Artist */}
      <h1
        className="font-cormorant text-3xl sm:text-4xl md:text-[42px] font-normal text-[#1A1D20] leading-tight tracking-normal"
        style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
      >
        {title}
      </h1>

      <div className="mt-1.5">
        <Link
          href={artistHandle ? `/artists/${artistHandle}` : "/about"}
          className="text-[17px] text-[#44484E] hover:text-[#111111] transition-colors inline-block"
        >
          {artist}
        </Link>
      </div>

      {/* Price */}
      {currentPrice != null && (
        <div className="mt-3 text-2xl font-normal text-[#1A1D20] tabular-nums">
          {formatMoney(currentPrice, currentCurrency)}
        </div>
      )}

      {/* Hairline Divider */}
      <hr className="border-t border-[#E8E8E8] my-5" />

      {/* Description / Curatorial Blurb */}
      <div className="text-[14px] leading-relaxed text-[#33373D]">
        <p>
          {description}
          {extendedDescription && !isExpanded && (
            <>
              {" "}
              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className="underline underline-offset-2 text-[#1A1D20] font-medium hover:text-black cursor-pointer inline"
              >
                Read more.
              </button>
            </>
          )}
        </p>

        {isExpanded && extendedDescription && (
          <div className="mt-3 space-y-3 text-[#33373D] animate-fadeIn">
            {extendedDescription.split("\n\n").map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="underline underline-offset-2 text-[#1A1D20] font-medium hover:text-black cursor-pointer block mt-1"
            >
              Read less.
            </button>
          </div>
        )}
      </div>

      {/* Materials & Size Specs */}
      <div className="mt-6 space-y-4">
        {/* Materials */}
        <div>
          <span className="block text-[13px] font-medium text-[#1A1D20]">Materials</span>
          <span className="text-[14px] text-[#555A60]">{material || "Acrylic on canvas"}</span>
        </div>

        {/* Size with in / cm interactive toggle */}
        <div>
          <span className="block text-[13px] font-medium text-[#1A1D20]">Size</span>
          <div className="flex items-center gap-2 text-[14px] text-[#555A60]">
            <span>{unit === "in" ? dimensionsIn : dimensionsCm}</span>
            <span className="text-[#CCCCCC]">/</span>
            <div className="inline-flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setUnit("in")}
                aria-label="Switch size unit to inches"
                className={`transition-colors cursor-pointer ${
                  unit === "in"
                    ? "font-semibold text-[#1A1D20] underline underline-offset-2"
                    : "text-[#888888] hover:text-[#1A1D20]"
                }`}
              >
                in
              </button>
              <span className="text-[#CCCCCC]">|</span>
              <button
                type="button"
                onClick={() => setUnit("cm")}
                aria-label="Switch size unit to centimeters"
                className={`transition-colors cursor-pointer ${
                  unit === "cm"
                    ? "font-semibold text-[#1A1D20] underline underline-offset-2"
                    : "text-[#888888] hover:text-[#1A1D20]"
                }`}
              >
                cm
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Multiple Variants / Editions Selector (if applicable) */}
      {variants.length > 1 && (
        <div className="mt-6">
          <label className="block text-xs uppercase tracking-wider text-[#666666] font-medium mb-2">
            Select Edition / Framing
          </label>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVariantId(v.id)}
                className={`py-2 px-3.5 text-xs rounded-full border transition-all ${
                  v.id === selectedVariantId
                    ? "border-[#1A1D20] bg-[#1A1D20] text-white"
                    : "border-[#DDDDDD] bg-white text-[#333333] hover:border-black"
                }`}
              >
                {v.title}
                {v.amount && ` (${formatMoney(v.amount, v.currency)})`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-7 space-y-3">
        {/* Primary CTA: Add to Cart */}
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={pending || isSold}
          className="w-full bg-[#2E3338] hover:bg-[#1E2124] text-white py-3.5 px-6 rounded-full text-[15px] font-medium tracking-wide transition-all duration-200 text-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.995]"
        >
          {isSold ? "Sold Out" : pending ? "Adding to Cart…" : "Add to Cart"}
        </button>

        {/* Secondary CTA: Save Artwork */}
        <button
          type="button"
          onClick={() => toggleSaved(productId)}
          aria-pressed={isSaved}
          className="w-full bg-white hover:bg-[#F9F9F9] text-[#1A1D20] border border-[#CCCCCC] py-3.5 px-6 rounded-full text-[15px] font-medium tracking-wide transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.995]"
        >
          <span>{isSaved ? "Saved Artwork" : "Save Artwork"}</span>
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isSaved ? "fill-current text-red-500 scale-110" : "fill-none stroke-current"}`}
            viewBox="0 0 24 24"
            strokeWidth="1.8"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            />
          </svg>
        </button>

        {/* Error notification if cart failed */}
        {error && (
          <p className="text-xs text-red-600 mt-2 text-center" role="alert">
            {error}
          </p>
        )}
        {added && (
          <p className="text-xs text-[#2E7D32] mt-2 text-center">
            ✓ Added to your bag.
          </p>
        )}
      </div>

      {/* Fulfillment Notice */}
      <div className="mt-5 text-[13px] leading-relaxed text-[#5C6168]">
        <p>
          This artwork is expected to ship within {shippingTimeline}. After your order is placed, our team will be in touch to confirm the timeline.
        </p>
      </div>

      {/* Affirm Installment Banner */}
      <div className="mt-3 flex items-center gap-1.5 text-xs text-[#5C6168]">
        <span>Available through installments with</span>
        <span className="font-bold text-[#1A1D20] tracking-tight">affirm</span>
        <button
          type="button"
          onClick={() => setShowAffirmModal(true)}
          className="underline hover:text-black ml-0.5 cursor-pointer font-medium"
        >
          Learn more
        </button>
      </div>

      {/* Hairline Divider before accordions */}
      <hr className="border-t border-[#E8E8E8] mt-6 mb-2" />

      {/* Accordions */}
      <div className="divide-y divide-[#E8E8E8]">
        {/* 1. Dimensions & Framing */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection("dimensions")}
            aria-expanded={openSections.dimensions}
            className="w-full py-4 flex items-center justify-between text-left text-[14px] font-medium text-[#1A1D20] hover:text-black transition-colors"
          >
            <span>Dimensions & Framing</span>
            <span className="text-lg leading-none text-[#555A60] font-light">
              {openSections.dimensions ? "×" : "+"}
            </span>
          </button>

          {openSections.dimensions && (
            <div className="pb-5 pt-1 space-y-4 text-[13px] text-[#4A4E54] animate-fadeIn">
              <div>
                <span className="block font-medium text-[#1A1D20] mb-0.5">
                  Artwork Dimensions
                </span>
                <p>
                  {dimensionsIn} / {dimensionsCm}
                </p>
              </div>

              <div>
                <span className="block font-medium text-[#1A1D20] mb-0.5">
                  Final Dimensions (framed, where applicable)
                </span>
                <p>
                  {framedDimensionsIn || dimensionsIn} / {framedDimensionsCm || dimensionsCm}
                </p>
                <p className="mt-1 text-xs text-[#777C82]">
                  Custom gallery floater framing available upon request in natural maple, museum black, or white satin finish.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 2. Artwork Information */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection("info")}
            aria-expanded={openSections.info}
            className="w-full py-4 flex items-center justify-between text-left text-[14px] font-medium text-[#1A1D20] hover:text-black transition-colors"
          >
            <span>Artwork Information</span>
            <span className="text-lg leading-none text-[#555A60] font-light">
              {openSections.info ? "×" : "+"}
            </span>
          </button>

          {openSections.info && (
            <div className="pb-5 pt-1 space-y-2.5 text-[13px] text-[#4A4E54] animate-fadeIn">
              <div className="grid grid-cols-[110px_1fr] gap-2">
                <span className="text-[#777C82]">Medium</span>
                <span className="text-[#1A1D20]">{artworkInfo?.medium || material || "Acrylic on canvas"}</span>
              </div>
              <div className="grid grid-cols-[110px_1fr] gap-2">
                <span className="text-[#777C82]">Support</span>
                <span className="text-[#1A1D20]">
                  {artworkInfo?.support || "Heavyweight 100% Belgian linen on solid wood stretcher bars"}
                </span>
              </div>
              <div className="grid grid-cols-[110px_1fr] gap-2">
                <span className="text-[#777C82]">Signature</span>
                <span className="text-[#1A1D20]">
                  {artworkInfo?.signature || `Hand-signed, titled, and dated on verso by ${artist}`}
                </span>
              </div>
              <div className="grid grid-cols-[110px_1fr] gap-2">
                <span className="text-[#777C82]">Authenticity</span>
                <span className="text-[#1A1D20]">
                  {artworkInfo?.certificate || "Includes a Certificate of Authenticity signed by the artist"}
                </span>
              </div>
              <div className="grid grid-cols-[110px_1fr] gap-2">
                <span className="text-[#777C82]">Year</span>
                <span className="text-[#1A1D20]">{artworkInfo?.year || "2024"}</span>
              </div>
              <div className="grid grid-cols-[110px_1fr] gap-2">
                <span className="text-[#777C82]">Provenance</span>
                <span className="text-[#1A1D20]">
                  {artworkInfo?.provenance || "Direct from the artist's studio"}
                </span>
              </div>
              <div className="grid grid-cols-[110px_1fr] gap-2">
                <span className="text-[#777C82]">Condition</span>
                <span className="text-[#1A1D20]">
                  {artworkInfo?.condition || "Pristine, original studio condition"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 3. Shipping */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection("shipping")}
            aria-expanded={openSections.shipping}
            className="w-full py-4 flex items-center justify-between text-left text-[14px] font-medium text-[#1A1D20] hover:text-black transition-colors"
          >
            <span>Shipping</span>
            <span className="text-lg leading-none text-[#555A60] font-light">
              {openSections.shipping ? "×" : "+"}
            </span>
          </button>

          {openSections.shipping && (
            <div className="pb-5 pt-1 space-y-2.5 text-[13px] text-[#4A4E54] animate-fadeIn">
              <p>
                {shippingDetails?.transit ||
                  "Insured transit via fine-art courier with dedicated tracking and white-glove delivery options."}
              </p>
              <p>
                {shippingDetails?.packaging ||
                  "Packaged in a custom-built museum timber crate with archival interior cushions and moisture protection."}
              </p>
              <p>
                {shippingDetails?.returns ||
                  "14-day collector trial policy. If you are not completely enchanted with the work in your space, you may return it for a full refund."}
              </p>
              <p className="pt-1 text-xs text-[#777C82]">
                For international shipping questions or special crating requirements, contact our art advisory team.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Advisory & Help text links */}
      <div className="mt-6 pt-4 border-t border-[#E8E8E8] text-[13px] text-[#5C6168] space-y-1.5">
        <p>
          Have questions about this artwork? Our art specialists are here to help.{" "}
          <a href="#inquire" className="underline hover:text-black font-medium">
            Contact Us.
          </a>
        </p>
        <p>
          For more information, contact us or visit our{" "}
          <Link href="/about" className="underline hover:text-black font-medium">
            FAQs page
          </Link>
          .
        </p>
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
            className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-[#1A1D20]">
                Pay over time with Affirm
              </h3>
              <button
                type="button"
                onClick={() => setShowAffirmModal(false)}
                className="text-neutral-500 hover:text-black text-xl leading-none"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-[#4A4E54] leading-relaxed mb-4">
              Split your purchase into 4 interest-free bi-weekly payments of{" "}
              <strong className="text-[#1A1D20]">
                {formatMoney(installmentPrice, currentCurrency)}
              </strong>
              , or choose flexible monthly terms up to 36 months.
            </p>
            <ul className="text-xs text-[#5C6168] space-y-2 mb-6">
              <li>✓ No hidden fees or surprises</li>
              <li>✓ Checking eligibility won&apos;t affect your credit score</li>
              <li>✓ Immediate decision upon checkout</li>
            </ul>
            <button
              type="button"
              onClick={() => setShowAffirmModal(false)}
              className="w-full bg-[#1A1D20] text-white py-2.5 rounded-full text-sm font-medium hover:bg-neutral-800 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

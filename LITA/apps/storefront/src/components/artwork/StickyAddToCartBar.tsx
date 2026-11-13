"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { formatMoney } from "@/lib/format";

export interface StickyAddToCartBarProps {
  isVisible: boolean;
  thumbnailUrl: string;
  title: string;
  artist: string;
  price: number | null;
  currency: string | null;
  onAddToCart: () => void;
  pending: boolean;
  isSold: boolean;
  added?: boolean;
}

export function StickyAddToCartBar({
  isVisible,
  thumbnailUrl,
  title,
  artist,
  price,
  currency = "USD",
  onAddToCart,
  pending,
  isSold,
  added = false,
}: StickyAddToCartBarProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={
            shouldReduceMotion
              ? { opacity: 0 }
              : { opacity: 0, y: -20 }
          }
          animate={{ opacity: 1, y: 0 }}
          exit={
            shouldReduceMotion
              ? { opacity: 0 }
              : { opacity: 0, y: -20 }
          }
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="fixed top-0 inset-x-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-gallery-hairline shadow-md py-2.5 px-4 sm:px-8 transition-colors"
          role="region"
          aria-label="Quick order bar"
        >
          <div className="mx-auto max-w-[1380px] flex items-center justify-between gap-4">
            {/* Artwork thumbnail & meta */}
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative w-11 h-11 shrink-0 overflow-hidden rounded-md border border-gallery-hairline bg-gallery-wall">
                {thumbnailUrl ? (
                  <Image
                    src={thumbnailUrl}
                    alt={title}
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gallery-wall" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="font-serif text-sm sm:text-base font-normal text-gallery-charcoal truncate leading-tight">
                  {title}
                </h3>
                <p className="text-xs text-gallery-muted truncate">
                  {artist}
                </p>
              </div>
            </div>

            {/* Price & Action Button */}
            <div className="flex items-center gap-4 shrink-0">
              {price != null && (
                <span className="text-base sm:text-lg font-medium text-gallery-charcoal tabular-nums">
                  {formatMoney(price, currency)}
                </span>
              )}
              {added ? (
                <Link
                  href="/cart"
                  className="bg-[#2E7D32] hover:bg-[#256328] text-white px-5 py-2.5 rounded-lg text-xs sm:text-sm font-medium tracking-wide transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 flex items-center gap-1.5"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  Go to Cart
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={onAddToCart}
                  disabled={pending || isSold}
                  className="bg-gallery-charcoal hover:bg-black text-gallery-page px-5 py-2.5 rounded-lg text-xs sm:text-sm font-medium tracking-wide transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSold ? "Sold Out" : pending ? "Adding…" : "Add to Cart"}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

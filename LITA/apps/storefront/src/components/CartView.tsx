"use client";

import React, { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import type { HttpTypes } from "@medusajs/types";
import { clearStaleCart, deleteLineItem, updateLineItem } from "@/lib/data/cart";
import { TrashIcon } from "@/components/livinIcons";

function formatItemPrice(
  amount: number | null | undefined,
  currency: string | null | undefined
): string {
  if (amount == null || !currency) return "";
  const code = currency.toUpperCase();
  return new Intl.NumberFormat(code === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency: code,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

function formatSummaryPrice(
  amount: number | null | undefined,
  currency: string | null | undefined
): string {
  if (amount == null || !currency) return "—";
  const code = currency.toUpperCase();
  const formatted = new Intl.NumberFormat(code === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency: code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formatted} ${code}`;
}

function getItemArtist(item: HttpTypes.StoreCartLineItem): string {
  const product = item.product;
  const pMeta = (product?.metadata ?? {}) as Record<string, unknown>;
  const iMeta = (item.metadata ?? {}) as Record<string, unknown>;
  const vMeta = (item.variant?.metadata ?? {}) as Record<string, unknown>;

  return (
    (pMeta.artist as string) ||
    (pMeta.artist_name as string) ||
    product?.subtitle ||
    (iMeta.artist as string) ||
    (vMeta.artist as string) ||
    "Artist"
  );
}

function getItemSize(item: HttpTypes.StoreCartLineItem): string {
  const product = item.product;
  const pMeta = (product?.metadata ?? {}) as Record<string, unknown>;
  const iMeta = (item.metadata ?? {}) as Record<string, unknown>;
  const vMeta = (item.variant?.metadata ?? {}) as Record<string, unknown>;

  if (typeof pMeta.dimensions === "string" && pMeta.dimensions) return pMeta.dimensions;
  if (typeof pMeta.size === "string" && pMeta.size) return pMeta.size;
  if (typeof iMeta.dimensions === "string" && iMeta.dimensions) return iMeta.dimensions;
  if (typeof iMeta.size === "string" && iMeta.size) return iMeta.size;

  const w = Number(product?.width);
  const h = Number(product?.height);
  const d = Number(product?.length || (pMeta.depth as number) || 0);

  if (w > 0 && h > 0) {
    const toIn = (n: number) => (n / 2.54).toFixed(1).replace(/\.0$/, "");
    const inStr =
      d > 0
        ? `${toIn(w)} in x ${toIn(h)} in x ${toIn(d)} in`
        : `${toIn(w)} in x ${toIn(h)} in`;
    const cmStr =
      d > 0
        ? `${w} cm x ${h} cm x ${d} cm`
        : `${w} cm x ${h} cm`;
    return `${inStr} / ${cmStr}`;
  }

  if (item.variant_title && item.variant_title !== "Default") {
    return item.variant_title;
  }

  return "Original Artwork";
}

function getItemMedium(item: HttpTypes.StoreCartLineItem): string {
  const product = item.product;
  const pMeta = (product?.metadata ?? {}) as Record<string, unknown>;
  const iMeta = (item.metadata ?? {}) as Record<string, unknown>;
  const vMeta = (item.variant?.metadata ?? {}) as Record<string, unknown>;

  return (
    product?.material ||
    (pMeta.medium as string) ||
    (iMeta.medium as string) ||
    (vMeta.medium as string) ||
    "Painting"
  );
}

function getItemFraming(item: HttpTypes.StoreCartLineItem): string {
  const product = item.product;
  const pMeta = (product?.metadata ?? {}) as Record<string, unknown>;
  const iMeta = (item.metadata ?? {}) as Record<string, unknown>;
  const vMeta = (item.variant?.metadata ?? {}) as Record<string, unknown>;

  return (
    (pMeta.framing as string) ||
    (pMeta.framed ? "Framed" : null) ||
    (iMeta.framing as string) ||
    (vMeta.framing as string) ||
    "Unframed"
  );
}

export function CartView({ cart }: { cart: HttpTypes.StoreCart | null }) {
  const [isPending, startTransition] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [specialRequestsOpen, setSpecialRequestsOpen] = useState(false);
  const [specialRequestsText, setSpecialRequestsText] = useState("");

  const items = cart?.items ?? [];
  const itemCount = items.reduce((sum, item) => sum + (item.quantity ?? 1), 0);
  const currency = cart?.currency_code || "usd";
  const subtotal = cart?.item_subtotal ?? cart?.subtotal ?? 0;
  const total = cart?.total ?? subtotal;

  useEffect(() => {
    if (!cart) {
      clearStaleCart();
    }
  }, [cart]);

  const handleRemove = (lineId: string) => {
    setError(null);
    setRemovingId(lineId);
    startTransition(async () => {
      const res = await deleteLineItem(lineId);
      if (!res.ok) {
        // Fallback to updateLineItem with 0
        const fallbackRes = await updateLineItem(lineId, 0);
        if (!fallbackRes.ok) {
          setError(fallbackRes.error || "Failed to remove item.");
        }
      }
      setRemovingId(null);
    });
  };

  return (
    <div className="w-full bg-white">
      {/* 1. Centered Header: "Your Cart" */}
      <div className="w-full py-10 md:py-12 text-center">
        <h1 className="font-cormorant text-3xl sm:text-4xl md:text-[42px] font-normal text-[#222222] tracking-normal">
          Your Cart
        </h1>
      </div>

      {/* Full-width Divider Line */}
      <div className="w-full border-b border-[#EAEAEA]" />

      {/* 2. Main Content Area */}
      <div className="mx-auto max-w-[1240px] px-6 md:px-12 py-10 md:py-14">
        {error && (
          <div
            role="alert"
            className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-700 border border-red-200"
          >
            {error}
          </div>
        )}

        {items.length === 0 ? (
          /* Empty Cart State (Image 1) */
          <div>
            <h2 className="font-cormorant text-2xl md:text-3xl font-normal text-[#222222] pb-3 border-b border-[#EAEAEA]">
              Items (0)
            </h2>
            <p className="mt-6 text-xs md:text-sm text-[#555555]">
              Your cart is empty
            </p>
            <div className="mt-8">
              <Link
                href="/artworks"
                className="inline-block rounded-full bg-[#2E3138] hover:bg-[#1E2024] text-white px-7 py-3 text-xs md:text-sm font-normal tracking-wide transition-colors"
              >
                Browse Artwork
              </Link>
            </div>
          </div>
        ) : (
          /* Populated Cart State (Image 2 & 3) */
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px] gap-12 lg:gap-16 items-start">
            {/* Left Column: Items List */}
            <div>
              <h2 className="font-cormorant text-2xl md:text-3xl font-normal text-[#222222] mb-6">
                Items ({itemCount})
              </h2>

              {/* Table Column Headers */}
              <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1.5fr)_auto] gap-6 border-b border-[#EAEAEA] pb-3 mb-6 text-xs text-[#555555] font-normal">
                <span>Artwork</span>
                <span>Description</span>
                <span className="text-right">Price</span>
              </div>

              {/* Items Rows */}
              <div className="divide-y divide-[#EAEAEA] border-b border-[#EAEAEA]">
                {items.map((item) => {
                  const isRemoving = removingId === item.id && isPending;
                  const artist = getItemArtist(item);
                  const size = getItemSize(item);
                  const medium = getItemMedium(item);
                  const framing = getItemFraming(item);
                  const itemTotal = item.total ?? item.unit_price;

                  return (
                    <div
                      key={item.id}
                      className={`py-6 grid grid-cols-[minmax(0,1.3fr)_minmax(0,1.5fr)_auto] gap-6 sm:gap-8 items-start transition-opacity ${
                        isRemoving ? "opacity-40 pointer-events-none" : ""
                      }`}
                    >
                      {/* Column 1: Artwork (Thumbnail + Title + Artist + Remove) */}
                      <div className="flex items-start gap-4 sm:gap-5">
                        <Link
                          href={item.product_handle ? `/artworks/${item.product_handle}` : "#"}
                          className="relative w-[76px] h-[96px] sm:w-[84px] sm:h-[105px] bg-[#F7F7F6] shrink-0 overflow-hidden flex items-center justify-center border border-[#F0F0F0]"
                        >
                          {item.thumbnail ? (
                            <Image
                              src={item.thumbnail}
                              alt={item.product_title || item.title || "Artwork"}
                              fill
                              sizes="105px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="text-[10px] text-[#888888] text-center p-1">
                              Artwork
                            </div>
                          )}
                        </Link>

                        <div className="flex flex-col min-w-0">
                          <Link
                            href={item.product_handle ? `/artworks/${item.product_handle}` : "#"}
                            className="text-sm sm:text-[15px] font-normal text-[#111111] hover:opacity-70 transition-opacity leading-snug line-clamp-2"
                          >
                            {item.product_title || item.title}
                          </Link>

                          <span className="text-xs sm:text-sm text-[#555555] mt-1">
                            {artist}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleRemove(item.id)}
                            disabled={isPending}
                            className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#222222] hover:opacity-60 transition-opacity self-start cursor-pointer"
                            aria-label={`Remove ${item.product_title || item.title} from cart`}
                          >
                            <TrashIcon className="w-3.5 h-3.5 text-[#222222] shrink-0" />
                            <span className="underline underline-offset-2">Remove</span>
                          </button>
                        </div>
                      </div>

                      {/* Column 2: Description (Size, Medium, Framed) */}
                      <div className="text-xs sm:text-sm text-[#333333] space-y-1.5 leading-relaxed">
                        <div>
                          <span className="text-[#333333]">Size: </span>
                          <span className="text-[#444444]">{size}</span>
                        </div>
                        <div>
                          <span className="text-[#333333]">Medium: </span>
                          <span className="text-[#444444]">{medium}</span>
                        </div>
                        <div>
                          <span className="text-[#333333]">Framed: </span>
                          <span className="text-[#444444]">{framing}</span>
                        </div>
                      </div>

                      {/* Column 3: Price */}
                      <div className="text-right">
                        <span className="text-sm sm:text-base text-[#111111] font-normal tabular-nums whitespace-nowrap">
                          {formatItemPrice(itemTotal, currency)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Special Requests Checkbox */}
              <div className="pt-6">
                <label className="inline-flex items-center gap-2.5 cursor-pointer text-xs md:text-sm text-[#222222] select-none">
                  <input
                    type="checkbox"
                    checked={specialRequestsOpen}
                    onChange={(e) => setSpecialRequestsOpen(e.target.checked)}
                    className="w-3.5 h-3.5 rounded-none border-[#A0A0A0] text-[#222222] focus:ring-0 accent-[#222222] cursor-pointer"
                  />
                  <span>Special requests</span>
                </label>

                {specialRequestsOpen && (
                  <div className="mt-3 max-w-lg animate-in fade-in duration-200">
                    <textarea
                      rows={3}
                      value={specialRequestsText}
                      onChange={(e) => setSpecialRequestsText(e.target.value)}
                      placeholder="Add any special instructions, delivery notes, or gift requests..."
                      className="w-full text-xs md:text-sm border border-[#EAEAEA] p-3 focus:outline-none focus:border-[#222222] text-[#222222] bg-[#FAF8F5] resize-y"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Order Summary */}
            <div className="lg:pl-4">
              <h2 className="font-cormorant text-2xl md:text-3xl font-normal text-[#222222] mb-6">
                Order Summary
              </h2>

              <div className="space-y-3.5 text-xs sm:text-sm">
                <div className="flex items-center justify-between text-[#333333]">
                  <span>Subtotal</span>
                  <span className="tabular-nums font-normal text-[#111111]">
                    {formatSummaryPrice(subtotal, currency)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[#333333]">
                  <span>Shipping and tax</span>
                  <span className="text-[#555555]">Calculated at checkout</span>
                </div>

                <div className="border-b border-[#EAEAEA] my-4" />

                <div className="flex items-center justify-between text-[#111111]">
                  <span className="font-normal">Total</span>
                  <span className="tabular-nums font-normal">
                    {formatSummaryPrice(total, currency)}
                  </span>
                </div>
              </div>

              {/* Checkout Button */}
              <Link
                href="/checkout"
                className="mt-6 flex w-full items-center justify-center rounded-full bg-[#2E3138] hover:bg-[#1E2024] text-white py-3.5 px-6 text-sm md:text-base font-normal tracking-wide transition-colors shadow-sm"
              >
                Checkout
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

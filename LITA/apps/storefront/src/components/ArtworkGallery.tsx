"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";

export interface GalleryImage {
  id: string;
  url: string;
  alt?: string;
}

export function ArtworkGallery({
  images,
  title,
  artist,
}: {
  images: GalleryImage[];
  title: string;
  artist?: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  // Close lightbox on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsZoomOpen(false);
      if (e.key === "ArrowRight") {
        setActiveIndex((prev) => (prev + 1) % images.length);
      }
      if (e.key === "ArrowLeft") {
        setActiveIndex((prev) => (prev - 1 + images.length) % images.length);
      }
    }
    if (isZoomOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isZoomOpen, images.length]);

  if (!images || images.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center bg-[#F7F7F6] text-neutral-400">
        No artwork images available
      </div>
    );
  }

  const activeImage = images[activeIndex] || images[0];

  return (
    <>
      <div className="flex flex-col-reverse md:flex-row gap-4 lg:gap-6 items-start w-full">
        {/* Left Vertical Thumbnails Strip (Desktop) / Horizontal (Mobile) */}
        {images.length > 1 && (
          <div
            role="tablist"
            aria-label="Artwork views"
            className="flex md:flex-col gap-3 w-full md:w-[76px] lg:w-[84px] shrink-0 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-none"
          >
            {images.map((img, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <button
                  key={img.id || idx}
                  role="tab"
                  aria-selected={isSelected}
                  aria-label={`View ${idx + 1} of ${images.length}: ${title}`}
                  onClick={() => setActiveIndex(idx)}
                  className={`relative aspect-square w-16 md:w-full shrink-0 border transition-all duration-200 overflow-hidden bg-[#FBFBFA] ${
                    isSelected
                      ? "border-[#222222] ring-1 ring-[#222222] opacity-100"
                      : "border-[#E5E5E5] hover:border-[#999999] opacity-70 hover:opacity-100"
                  }`}
                >
                  <Image
                    src={img.url}
                    alt={img.alt || `${title} thumbnail ${idx + 1}`}
                    fill
                    sizes="84px"
                    className="object-cover"
                  />
                </button>
              );
            })}
          </div>
        )}

        {/* Main Artwork Viewer */}
        <div className="relative flex-1 w-full bg-[#FAF9F6] border border-[#F0EFEB] flex items-center justify-center p-3 sm:p-6 lg:p-8 min-h-[440px] md:min-h-[580px] lg:min-h-[640px] group">
          <button
            type="button"
            onClick={() => setIsZoomOpen(true)}
            aria-label={`Enlarge view of ${title}`}
            className="relative w-full h-[400px] sm:h-[520px] lg:h-[580px] cursor-zoom-in flex items-center justify-center focus:outline-none"
          >
            <Image
              key={activeImage.id || activeIndex}
              src={activeImage.url}
              alt={activeImage.alt || `${title} - View ${activeIndex + 1}`}
              fill
              priority
              sizes="(min-width: 1280px) 55vw, (min-width: 1024px) 50vw, 100vw"
              className="object-contain transition-opacity duration-300 drop-shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
            />
          </button>

          {/* Enlarge Hint Button */}
          <button
            type="button"
            onClick={() => setIsZoomOpen(true)}
            aria-label="Zoom artwork"
            className="absolute bottom-4 right-4 bg-white/90 hover:bg-white text-[#222222] p-2 rounded-full shadow-sm border border-[#E5E5E5] transition-opacity opacity-80 group-hover:opacity-100"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Fullscreen Lightbox Modal */}
      {isZoomOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${title} by ${artist || "Studio Artist"}, enlarged view`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 md:p-8 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setIsZoomOpen(false)}
        >
          {/* Header Bar */}
          <div
            className="absolute top-0 inset-x-0 p-5 flex items-center justify-between text-white/90 z-10 bg-gradient-to-b from-black/80 to-transparent pointer-events-none"
          >
            <div className="pointer-events-auto">
              <h2 className="text-lg font-serif">{title}</h2>
              {artist && <p className="text-xs text-neutral-400">{artist}</p>}
            </div>

            <button
              type="button"
              onClick={() => setIsZoomOpen(false)}
              className="pointer-events-auto text-sm text-neutral-300 hover:text-white flex items-center gap-1.5 py-1.5 px-3 rounded bg-white/10 hover:bg-white/20 transition-colors"
            >
              <span>Close</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIndex((prev) => (prev - 1 + images.length) % images.length);
                }}
                aria-label="Previous image"
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white bg-black/40 hover:bg-black/70 rounded-full transition-colors z-20"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIndex((prev) => (prev + 1) % images.length);
                }}
                aria-label="Next image"
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white bg-black/40 hover:bg-black/70 rounded-full transition-colors z-20"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Enlarged Image */}
          <div
            className="relative w-full h-full max-w-6xl max-h-[85vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={activeImage.url}
              alt={activeImage.alt || title}
              fill
              sizes="100vw"
              className="object-contain"
              priority
            />
          </div>

          {/* View Counter */}
          {images.length > 1 && (
            <div className="absolute bottom-5 inset-x-0 flex justify-center pointer-events-none">
              <span className="text-xs tracking-wider text-neutral-400 bg-black/60 px-3 py-1 rounded-full">
                {activeIndex + 1} / {images.length}
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );
}

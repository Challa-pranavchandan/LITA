"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

export type GalleryItem = {
  id: string;
  image_url: string;
  alt: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  position: number;
  col_span: number;
  row_span: number;
};

export function GalleryGrid({ items }: { items: GalleryItem[] }) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const selectedItem = selectedIdx !== null ? items[selectedIdx] : null;

  const handlePrev = useCallback(() => {
    setSelectedIdx((prev) => (prev !== null && prev > 0 ? prev - 1 : items.length - 1));
  }, [items.length]);

  const handleNext = useCallback(() => {
    setSelectedIdx((prev) => (prev !== null && prev < items.length - 1 ? prev + 1 : 0));
  }, [items.length]);

  const handleClose = useCallback(() => {
    setSelectedIdx(null);
  }, []);

  useEffect(() => {
    if (selectedIdx === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [selectedIdx, handleClose, handlePrev, handleNext]);

  return (
    <>
      <div className="gallery-grid">
        {items.map((item, idx) => (
          <div
            key={item.id}
            role="button"
            tabIndex={0}
            onClick={() => setSelectedIdx(idx)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setSelectedIdx(idx);
              }
            }}
            className="gallery-tile group cursor-pointer"
            style={{
              ["--cs" as string]: item.col_span,
              ["--rs" as string]: item.row_span,
            }}
          >
            <Image
              src={item.image_url}
              alt={item.alt || item.caption || "Gallery item"}
              fill
              sizes="(max-width: 600px) 100vw, (max-width: 960px) 50vw, 33vw"
              className="object-cover"
              priority={idx < 4}
            />

            {/* Gradient Overlay & Hover Details */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5 text-white">
              {item.caption && (
                <p className="text-sm font-medium leading-snug drop-shadow-sm font-sans">
                  {item.caption}
                </p>
              )}
              {item.alt && !item.caption && (
                <p className="text-xs text-white/90 drop-shadow-sm font-sans uppercase tracking-wider">
                  {item.alt}
                </p>
              )}
              <div className="mt-2 flex items-center gap-1.5 text-[11px] font-sans uppercase tracking-widest text-white/75">
                <span>View Fullscreen</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md transition-opacity duration-300 p-4 sm:p-8"
          onClick={handleClose}
        >
          {/* Top Bar with counter & close */}
          <div
            className="absolute top-4 left-4 right-4 flex items-center justify-between text-white/80 z-20"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-xs tracking-widest uppercase font-mono bg-black/40 px-3 py-1.5 rounded-full border border-white/10">
              {(selectedIdx ?? 0) + 1} / {items.length}
            </span>
            <button
              onClick={handleClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              aria-label="Close fullscreen view"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Left Arrow */}
          {items.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white bg-black/40 hover:bg-black/70 rounded-full border border-white/10 transition-all z-20 cursor-pointer"
              aria-label="Previous photo"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Right Arrow */}
          {items.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white bg-black/40 hover:bg-black/70 rounded-full border border-white/10 transition-all z-20 cursor-pointer"
              aria-label="Next photo"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Image & Caption Container */}
          <div
            className="relative max-w-5xl max-h-[85vh] w-full flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full h-[70vh] sm:h-[75vh]">
              <Image
                src={selectedItem.image_url}
                alt={selectedItem.alt || selectedItem.caption || "Gallery item fullscreen"}
                fill
                className="object-contain"
                sizes="(max-width: 1200px) 100vw, 1200px"
                priority
              />
            </div>
            {(selectedItem.caption || selectedItem.alt) && (
              <div className="mt-4 text-center max-w-2xl px-4">
                {selectedItem.caption && (
                  <p className="text-white text-base sm:text-lg font-light tracking-wide font-sans">
                    {selectedItem.caption}
                  </p>
                )}
                {selectedItem.alt && (
                  <p className="text-white/60 text-xs sm:text-sm mt-1 tracking-wider uppercase font-mono">
                    {selectedItem.alt}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

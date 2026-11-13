"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

export interface GalleryImage {
  id: string;
  url: string;
  alt?: string;
  label?: string;
}

export interface ArtworkGalleryProps {
  images: GalleryImage[];
  title: string;
  artist?: string;
  dimensionsIn?: string;
  className?: string;
}

export function ArtworkGallery({
  images,
  title,
  artist = "Studio Artist",
  dimensionsIn = "48 x 48 x 1.5 in",
  className = "",
}: ArtworkGalleryProps) {
  const shouldReduceMotion = useReducedMotion();

  // Ensure we have 3-4 labeled views for fine art collectors
  const defaultLabels = [
    "Full canvas",
    "Brushwork detail",
    "Profile view",
    "In room setting",
  ];

  const processedImages: GalleryImage[] = (
    images && images.length > 0
      ? images
      : [{ id: "placeholder", url: "/artworks/blue-room-front.jpg" }]
  ).map((img, idx) => ({
    ...img,
    label: img.label || defaultLabels[idx] || `View ${idx + 1}`,
  }));

  // Find room mockup view if present in images (e.g. filename contains 'room' or 4th image)
  const roomViewIndex = processedImages.findIndex(
    (img) =>
      img.url.toLowerCase().includes("room") ||
      img.label?.toLowerCase().includes("room")
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [isInRoomMode, setIsInRoomMode] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Lightbox Pan & Zoom State
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Toggle "View in a room"
  function handleToggleRoomMode() {
    if (!isInRoomMode) {
      setIsInRoomMode(true);
      if (roomViewIndex !== -1) {
        setActiveIndex(roomViewIndex);
      }
    } else {
      setIsInRoomMode(false);
      setActiveIndex(0);
    }
  }

  // Handle Thumbnail Selection
  function handleSelectThumbnail(index: number) {
    setActiveIndex(index);
    if (index === roomViewIndex && roomViewIndex !== -1) {
      setIsInRoomMode(true);
    } else {
      setIsInRoomMode(false);
    }
  }

  // Lightbox controls
  function handleZoomIn() {
    setZoomLevel((prev) => Math.min(prev + 0.75, 4));
  }

  function handleZoomOut() {
    setZoomLevel((prev) => {
      const next = Math.max(prev - 0.75, 1);
      if (next === 1) setPanPosition({ x: 0, y: 0 });
      return next;
    });
  }

  function handleResetZoom() {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  }

  // Close lightbox on Escape, arrows to cycle
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!isLightboxOpen) return;
      if (e.key === "Escape") setIsLightboxOpen(false);
      if (e.key === "ArrowRight") {
        setActiveIndex((prev) => (prev + 1) % processedImages.length);
        handleResetZoom();
      }
      if (e.key === "ArrowLeft") {
        setActiveIndex(
          (prev) => (prev - 1 + processedImages.length) % processedImages.length
        );
        handleResetZoom();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    if (isLightboxOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isLightboxOpen, processedImages.length]);

  const activeImage = processedImages[activeIndex] || processedImages[0];

  return (
    <div
      className={`w-full lg:sticky lg:top-6 lg:self-start select-none ${className}`}
    >
      {/* 1. Gallery Wall Panel (slightly darker tone than page) */}
      <div className="relative rounded-2xl bg-gallery-wall border border-gallery-hairline p-5 sm:p-8 lg:p-10 transition-colors shadow-[inset_0_1px_2px_rgba(255,255,255,0.7)]">
        {/* Top Floating Control: "View in a room" Toggle */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] uppercase tracking-[0.12em] font-medium text-gallery-muted">
            {isInRoomMode ? "Interior Context" : "Studio Presentation"}
          </span>

          <button
            type="button"
            onClick={handleToggleRoomMode}
            aria-pressed={isInRoomMode}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
              isInRoomMode
                ? "bg-gallery-charcoal text-gallery-page border-gallery-charcoal shadow-xs"
                : "bg-white/80 hover:bg-white text-gallery-charcoal border-gallery-hairline hover:border-gallery-charcoal/40"
            }`}
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M3 13h18M5 13V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v5M3 17h18M6 17v2M18 17v2" />
            </svg>
            <span>{isInRoomMode ? "View Artwork" : "View in a room"}</span>
          </button>
        </div>

        {/* Main Artwork Stage */}
        <div className="relative w-full aspect-[4/5] sm:aspect-[1/1] max-h-[640px] flex items-center justify-center overflow-hidden rounded-xl bg-gallery-wall/60 group">
          {/* If In Room Mode and no photo mockup, render procedural architectural mockup */}
          {isInRoomMode && roomViewIndex === -1 ? (
            <div className="relative w-full h-full flex flex-col justify-between p-6 bg-gradient-to-b from-[#E7E1D8] to-[#DDD6CB] overflow-hidden">
              {/* Moldings / Upper Wall */}
              <div className="w-full flex-1 flex items-center justify-center">
                <motion.div
                  initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.35 }}
                  className="relative w-[56%] aspect-square shadow-artwork rounded-xs overflow-hidden border border-black/10 bg-white"
                >
                  <Image
                    src={processedImages[0].url}
                    alt={`${title} hanging above sofa`}
                    fill
                    sizes="(min-width: 1024px) 30vw, 60vw"
                    className="object-cover"
                  />
                </motion.div>
              </div>

              {/* Minimalist modern sofa silhouette below artwork */}
              <div className="w-[84%] mx-auto mt-4 pt-3 border-t-2 border-[#BEB6A8] text-center">
                <div className="h-14 sm:h-20 bg-[#C8C1B5] rounded-t-xl border border-[#ADA495] flex items-center justify-center shadow-md">
                  <span className="text-[11px] font-medium text-gallery-charcoal/70 tracking-wide">
                    84″ Contemporary Linen Sofa
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Standard Artwork View with Layered Shadow */
            <motion.div
              key={activeImage.id || activeIndex}
              initial={shouldReduceMotion ? false : { opacity: 0.4 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative w-full h-full p-4 sm:p-8 flex items-center justify-center"
            >
              <div
                onClick={() => setIsLightboxOpen(true)}
                className="relative w-full h-full max-w-[540px] max-h-[540px] cursor-zoom-in transition-transform duration-300 ease-out group-hover:scale-[1.015]"
                style={{
                  /* Layered shadow from design specs */
                  filter:
                    "drop-shadow(0 30px 60px rgba(0,0,0,0.18)) drop-shadow(0 8px 16px rgba(0,0,0,0.12))",
                }}
              >
                <Image
                  src={activeImage.url}
                  alt={activeImage.alt || `${title} - ${activeImage.label}`}
                  fill
                  priority
                  sizes="(min-width: 1280px) 55vw, (min-width: 1024px) 50vw, 100vw"
                  className="object-contain rounded-xs"
                />
              </div>

              {/* Zoom hint overlay icon */}
              <button
                type="button"
                onClick={() => setIsLightboxOpen(true)}
                aria-label={`Enlarge high-resolution view of ${title}`}
                className="absolute bottom-5 right-5 bg-white/90 hover:bg-white text-gallery-charcoal p-2.5 rounded-full shadow-md border border-gallery-hairline transition-all duration-200 opacity-90 hover:opacity-100 hover:scale-105 cursor-pointer"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="11" y1="8" x2="11" y2="14" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
              </button>
            </motion.div>
          )}
        </div>

        {/* 2. Thumbnail Strip Below with 3-4 Views */}
        <div
          role="tablist"
          aria-label="Artwork perspectives"
          className="mt-4 grid grid-cols-4 gap-2.5 sm:gap-3"
        >
          {processedImages.slice(0, 4).map((img, idx) => {
            const isSelected = idx === activeIndex;
            return (
              <button
                key={img.id || idx}
                role="tab"
                aria-selected={isSelected}
                aria-label={`${img.label || `View ${idx + 1}`}: ${title}`}
                onClick={() => handleSelectThumbnail(idx)}
                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all duration-200 cursor-pointer bg-white group ${
                  isSelected
                    ? "border-gallery-accent ring-1 ring-gallery-accent/40 shadow-xs scale-[1.02]"
                    : "border-transparent opacity-75 hover:opacity-100 hover:border-gallery-hairline"
                }`}
              >
                <Image
                  src={img.url}
                  alt={img.alt || `${title} - thumbnail ${idx + 1}`}
                  fill
                  sizes="120px"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {/* View badge label on thumbnail */}
                <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-xs py-0.5 px-1 text-center">
                  <span className="text-[9px] font-medium text-white/95 truncate block">
                    {img.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Full-Screen Lightbox with Pan & Zoom */}
      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Enlarged view: ${title} by ${artist}`}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md"
            onClick={() => {
              if (zoomLevel === 1) setIsLightboxOpen(false);
            }}
          >
            {/* Top Bar with Title, Artist & Close Button */}
            <div className="absolute top-0 inset-x-0 p-4 sm:p-6 flex items-center justify-between text-white z-20 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
              <div className="pointer-events-auto">
                <h2 className="font-serif text-lg sm:text-xl font-normal leading-tight">
                  {title}
                </h2>
                <p className="text-xs text-white/70">
                  {artist} · {dimensionsIn}
                </p>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                aria-label="Close fullscreen lightbox"
                className="pointer-events-auto bg-white/10 hover:bg-white/20 text-white rounded-full p-2.5 transition-colors cursor-pointer"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Bottom Floating Control Bar: Zoom Controls & Image Carousel */}
            <div className="absolute bottom-6 inset-x-0 mx-auto w-fit z-20 flex items-center gap-2 bg-black/70 backdrop-blur-md border border-white/15 px-4 py-2 rounded-full text-white text-xs">
              {/* Prev image */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIndex(
                    (prev) =>
                      (prev - 1 + processedImages.length) %
                      processedImages.length
                  );
                  handleResetZoom();
                }}
                aria-label="Previous view"
                className="p-1.5 hover:text-white/80 cursor-pointer"
              >
                ←
              </button>

              <span className="text-[11px] font-mono px-2 text-white/70">
                {activeIndex + 1} / {processedImages.length}
              </span>

              {/* Next image */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIndex(
                    (prev) => (prev + 1) % processedImages.length
                  );
                  handleResetZoom();
                }}
                aria-label="Next view"
                className="p-1.5 hover:text-white/80 cursor-pointer"
              >
                →
              </button>

              <div className="w-px h-4 bg-white/20 mx-1" />

              {/* Zoom Out */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleZoomOut();
                }}
                disabled={zoomLevel <= 1}
                aria-label="Zoom out"
                className="p-1.5 hover:text-white/80 disabled:opacity-30 cursor-pointer"
              >
                −
              </button>

              {/* Zoom percentage */}
              <span className="text-[11px] font-mono px-1">
                {Math.round(zoomLevel * 100)}%
              </span>

              {/* Zoom In */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleZoomIn();
                }}
                disabled={zoomLevel >= 4}
                aria-label="Zoom in"
                className="p-1.5 hover:text-white/80 disabled:opacity-30 cursor-pointer"
              >
                +
              </button>

              {zoomLevel > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleResetZoom();
                  }}
                  className="ml-1 text-[11px] underline text-white/80 hover:text-white cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Interactive Zoom & Pan Canvas */}
            <div
              className={`relative w-full h-full flex items-center justify-center p-6 sm:p-12 overflow-hidden ${
                zoomLevel > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (zoomLevel === 1) {
                  setZoomLevel(2);
                } else {
                  handleResetZoom();
                }
              }}
              onMouseDown={(e) => {
                if (zoomLevel <= 1) return;
                setIsDragging(true);
                dragStartRef.current = {
                  x: e.clientX - panPosition.x,
                  y: e.clientY - panPosition.y,
                };
              }}
              onMouseMove={(e) => {
                if (!isDragging || zoomLevel <= 1) return;
                setPanPosition({
                  x: e.clientX - dragStartRef.current.x,
                  y: e.clientY - dragStartRef.current.y,
                });
              }}
              onMouseUp={() => setIsDragging(false)}
            >
              <div
                className="relative max-w-[85vw] max-h-[80vh] w-[900px] h-[720px] transition-transform duration-150 ease-out select-none"
                style={{
                  transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel})`,
                }}
              >
                <Image
                  src={activeImage.url}
                  alt={activeImage.alt || title}
                  fill
                  sizes="100vw"
                  className="object-contain pointer-events-none drop-shadow-2xl"
                  priority
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

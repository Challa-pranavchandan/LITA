"use client";

import React, { useState } from "react";

export interface SpecGridProps {
  medium: string;
  dimensionsIn: string;
  dimensionsCm: string;
  year?: string;
  framing?: string;
  className?: string;
}

export function SpecGrid({
  medium,
  dimensionsIn,
  dimensionsCm,
  year = "2024",
  framing = "Unframed, edge-painted (floater frame available)",
  className = "",
}: SpecGridProps) {
  const [unit, setUnit] = useState<"in" | "cm">("in");

  return (
    <div
      className={`grid grid-cols-2 gap-x-6 gap-y-4 py-5 border-y border-gallery-hairline text-left ${className}`}
    >
      {/* 1. Medium */}
      <div>
        <dt className="text-[10px] uppercase tracking-[0.14em] text-gallery-muted font-medium mb-1">
          Medium
        </dt>
        <dd className="text-sm font-medium text-gallery-charcoal line-clamp-2">
          {medium || "Acrylic on canvas"}
        </dd>
      </div>

      {/* 2. Size with Unit Toggle */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <dt className="text-[10px] uppercase tracking-[0.14em] text-gallery-muted font-medium">
            Size
          </dt>
          <div className="flex items-center gap-1 text-[11px] font-medium">
            <button
              type="button"
              onClick={() => setUnit("in")}
              aria-label="Display size in inches"
              className={`transition-colors cursor-pointer ${
                unit === "in"
                  ? "text-gallery-accent font-semibold underline underline-offset-2"
                  : "text-gallery-muted/70 hover:text-gallery-charcoal"
              }`}
            >
              in
            </button>
            <span className="text-gallery-hairline">|</span>
            <button
              type="button"
              onClick={() => setUnit("cm")}
              aria-label="Display size in centimeters"
              className={`transition-colors cursor-pointer ${
                unit === "cm"
                  ? "text-gallery-accent font-semibold underline underline-offset-2"
                  : "text-gallery-muted/70 hover:text-gallery-charcoal"
              }`}
            >
              cm
            </button>
          </div>
        </div>
        <dd className="text-sm font-medium text-gallery-charcoal">
          {unit === "in" ? dimensionsIn : dimensionsCm}
        </dd>
      </div>

      {/* 3. Year */}
      <div>
        <dt className="text-[10px] uppercase tracking-[0.14em] text-gallery-muted font-medium mb-1">
          Year
        </dt>
        <dd className="text-sm font-medium text-gallery-charcoal">
          {year}
        </dd>
      </div>

      {/* 4. Framing */}
      <div>
        <dt className="text-[10px] uppercase tracking-[0.14em] text-gallery-muted font-medium mb-1">
          Framing
        </dt>
        <dd className="text-sm font-medium text-gallery-charcoal line-clamp-2">
          {framing}
        </dd>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";

export interface ArtworkScaleVisualProps {
  dimensionsIn: string;
  className?: string;
}

export function ArtworkScaleVisual({
  dimensionsIn,
  className = "",
}: ArtworkScaleVisualProps) {
  const [scaleMode, setScaleMode] = useState<"sofa" | "person">("sofa");

  // Attempt to parse width and height in inches from string e.g. "48 x 48 x 1.5 in" or "36 x 24"
  const numbers = dimensionsIn.match(/(\d+(\.\d+)?)/g)?.map(Number) || [48, 48];
  const widthIn = numbers[0] || 48;
  const heightIn = numbers[1] || 48;

  // Real world reference sizes in inches
  // Standard 3-seater sofa: ~84 in wide x 34 in high. Wall height rendered ~96 in (8 ft).
  // Standard human figure: ~68 in high (5 ft 8 in) x 18 in wide.
  const wallWidthIn = 120; // 10 ft wall

  // SVG viewBox coordinates: 600 wide x 360 high
  const svgWidth = 500;
  const svgHeight = 280;
  const scale = svgWidth / wallWidthIn; // pixels per inch

  const artW = Math.max(widthIn * scale, 30);
  const artH = Math.max(heightIn * scale, 30);

  // Position artwork centered horizontally on wall, hanging ~58 in on center above floor
  const floorY = svgHeight - 24;
  const artCenterX = svgWidth / 2;
  const artBottomY = scaleMode === "sofa" ? floorY - 60 - 20 : floorY - 45 - 20;
  const artTopY = Math.max(artBottomY - artH, 20);
  const artLeftX = artCenterX - artW / 2;

  return (
    <div className={`mt-4 rounded-lg bg-gallery-page/70 border border-gallery-hairline p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3 text-xs">
        <span className="font-medium text-gallery-charcoal">Visual scale guide</span>
        <div className="flex items-center gap-1 bg-gallery-wall/60 p-0.5 rounded-full border border-gallery-hairline text-[11px]">
          <button
            type="button"
            onClick={() => setScaleMode("sofa")}
            className={`px-2.5 py-0.5 rounded-full font-medium transition-all ${
              scaleMode === "sofa"
                ? "bg-white text-gallery-charcoal shadow-xs"
                : "text-gallery-muted hover:text-gallery-charcoal"
            }`}
          >
            Above sofa (84″)
          </button>
          <button
            type="button"
            onClick={() => setScaleMode("person")}
            className={`px-2.5 py-0.5 rounded-full font-medium transition-all ${
              scaleMode === "person"
                ? "bg-white text-gallery-charcoal shadow-xs"
                : "text-gallery-muted hover:text-gallery-charcoal"
            }`}
          >
            Collector scale (5′8″)
          </button>
        </div>
      </div>

      {/* Proportional SVG Scene */}
      <div className="relative w-full aspect-[500/280] overflow-hidden rounded-md bg-[#ECE7DE]/50 border border-gallery-hairline/60">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full select-none"
          role="img"
          aria-label={`Scale illustration showing ${widthIn} by ${heightIn} inch artwork relative to a ${scaleMode}`}
        >
          {/* Baseboard / Floor line */}
          <line
            x1="0"
            y1={floorY}
            x2={svgWidth}
            y2={floorY}
            stroke="#C4BEB4"
            strokeWidth="1.5"
          />
          {/* Floor surface */}
          <rect
            x="0"
            y={floorY}
            width={svgWidth}
            height={svgHeight - floorY}
            fill="#E2DDD5"
          />

          {/* Reference Element: Sofa or Person */}
          {scaleMode === "sofa" ? (
            /* Modern 3-seater sofa: 84" wide x 34" high */
            <g
              transform={`translate(${artCenterX - (84 * scale) / 2}, ${floorY - 34 * scale})`}
              className="text-[#9E978D]"
            >
              {/* Sofa backrest */}
              <rect
                x="0"
                y="0"
                width={84 * scale}
                height={26 * scale}
                rx="6"
                fill="#BBB4A8"
                stroke="#8F877B"
                strokeWidth="1.2"
              />
              {/* Sofa seat cushions */}
              <rect
                x="3"
                y={14 * scale}
                width={84 * scale - 6}
                height={16 * scale}
                rx="4"
                fill="#C6BFB3"
                stroke="#8F877B"
                strokeWidth="1"
              />
              {/* 3 cushion lines */}
              <line
                x1={(84 * scale) / 3}
                y1={14 * scale}
                x2={(84 * scale) / 3}
                y2={30 * scale}
                stroke="#8F877B"
                strokeWidth="1"
              />
              <line
                x1={((84 * scale) * 2) / 3}
                y1={14 * scale}
                x2={((84 * scale) * 2) / 3}
                y2={30 * scale}
                stroke="#8F877B"
                strokeWidth="1"
              />
              {/* Sofa legs */}
              <rect x="8" y={30 * scale} width="3" height={4 * scale} fill="#5C5549" />
              <rect x={84 * scale - 11} y={30 * scale} width="3" height={4 * scale} fill="#5C5549" />
              <text
                x={(84 * scale) / 2}
                y={22 * scale}
                textAnchor="middle"
                fontSize="10"
                fill="#595349"
                fontFamily="sans-serif"
                fontWeight="500"
              >
                Standard Sofa (84″ wide)
              </text>
            </g>
          ) : (
            /* Human silhouette: ~68" tall standing beside artwork */
            <g
              transform={`translate(${artCenterX - artW / 2 - 50}, ${floorY - 68 * scale})`}
            >
              {/* Head */}
              <circle cx="14" cy="10" r="7" fill="#A8A196" />
              {/* Torso & Legs silhouette */}
              <path
                d="M7 20 C7 17 21 17 21 20 L23 48 C23 52 20 74 19 100 L16 100 L15 56 L13 56 L12 100 L9 100 C8 74 5 52 5 48 Z"
                fill="#A8A196"
              />
              <text
                x="14"
                y={115}
                textAnchor="middle"
                fontSize="9"
                fill="#6B645A"
                fontFamily="sans-serif"
              >
                5′8″
              </text>
            </g>
          )}

          {/* Hanging Artwork Rectangle */}
          <g>
            {/* Wall drop shadow */}
            <rect
              x={artLeftX + 3}
              y={artTopY + 4}
              width={artW}
              height={artH}
              fill="rgba(0,0,0,0.18)"
              rx="2"
            />
            {/* Canvas body */}
            <rect
              x={artLeftX}
              y={artTopY}
              width={artW}
              height={artH}
              fill="#F4EFE6"
              stroke="#2B2B2B"
              strokeWidth="1.5"
              rx="2"
            />
            {/* Artwork interior canvas texture accent */}
            <rect
              x={artLeftX + 4}
              y={artTopY + 4}
              width={artW - 8}
              height={artH - 8}
              fill="#D9D2C5"
              opacity="0.6"
            />
            {/* Artwork dimension labels inside canvas */}
            <text
              x={artCenterX}
              y={artTopY + artH / 2 - 2}
              textAnchor="middle"
              fontSize={Math.max(Math.min(artW / 6, 11), 9)}
              fill="#2B2B2B"
              fontFamily="sans-serif"
              fontWeight="600"
            >
              {widthIn}″ × {heightIn}″
            </text>
            <text
              x={artCenterX}
              y={artTopY + artH / 2 + 10}
              textAnchor="middle"
              fontSize="8"
              fill="#7A7368"
              fontFamily="sans-serif"
            >
              This work
            </text>
          </g>
        </svg>
      </div>
      <p className="mt-2 text-[11px] text-gallery-muted text-center">
        Proportions shown true to scale against an 8-foot ceiling wall.
      </p>
    </div>
  );
}

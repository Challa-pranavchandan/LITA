"use client";

import React from "react";
import type { Commission } from "./types";

interface OverviewPanelProps {
  commission: Commission;
}

export function OverviewPanel({ commission }: OverviewPanelProps) {
  const images = (commission.images || []).filter((img) => !!img.url);
  const hasImages = images.length > 0;

  return (
    <div
      role="tabpanel"
      id="panel-overview"
      aria-labelledby="tab-overview"
      className="space-y-8"
    >
      {/* ── Artwork Concept Card ── */}
      <div>
        <h2 className="text-xs uppercase tracking-[0.15em] font-semibold text-neutral-500 mb-3">
          Artwork Concept
        </h2>
        <div className="bg-[#faf8f5] p-6 sm:p-7 border border-[#eee7de] rounded-lg">
          <p className="text-sm text-neutral-800 leading-relaxed font-normal whitespace-pre-wrap">
            {commission.idea || "No specific concept notes provided."}
          </p>
        </div>
      </div>

      {/* ── Placement & Requirements (if present) ── */}
      {commission.requirements && (
        <div>
          <h2 className="text-xs uppercase tracking-[0.15em] font-semibold text-neutral-500 mb-3">
            Placement &amp; Details
          </h2>
          <div className="bg-[#faf8f5] p-6 sm:p-7 border border-[#eee7de] rounded-lg">
            <p className="text-sm text-neutral-800 leading-relaxed font-normal whitespace-pre-wrap">
              {commission.requirements}
            </p>
          </div>
        </div>
      )}

      {/* ── Two Spec Tiles: Medium & Target Dimensions ── */}
      <div>
        <h2 className="text-xs uppercase tracking-[0.15em] font-semibold text-neutral-500 mb-3">
          Specifications
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Tile 1: Medium */}
          <div className="bg-[#faf8f5] p-5 border border-[#eee7de] rounded-lg">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-500 block mb-1">
              Medium
            </span>
            <p className="text-base font-medium text-neutral-900">
              {commission.medium || "Bespoke Fine Art"}
            </p>
            <p className="text-[11px] text-neutral-500 mt-1">
              Archival studio grade materials
            </p>
          </div>

          {/* Tile 2: Target Dimensions */}
          <div className="bg-[#faf8f5] p-5 border border-[#eee7de] rounded-lg">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-500 block mb-1">
              Target Dimensions
            </span>
            <p className="text-base font-medium text-neutral-900">
              {commission.size || "Custom Atelier Dimensions"}
            </p>
            <p className="text-[11px] text-neutral-500 mt-1">
              Framing &amp; sizing to specifications
            </p>
          </div>
        </div>
      </div>

      {/* ── Reference Images (Hidden if none) ── */}
      {hasImages && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs uppercase tracking-[0.15em] font-semibold text-neutral-500">
              Reference Images
            </h2>
            <span className="text-[11px] text-neutral-400">
              {images.length} {images.length === 1 ? "reference" : "references"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            {images.map((img) => (
              <a
                key={img.key}
                href={img.url}
                target="_blank"
                rel="noreferrer"
                className="group relative block aspect-square overflow-hidden rounded-lg border border-[#eee7de] bg-[#faf8f5] transition-all hover:border-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5f2f3c]"
                title={img.filename || "View reference image"}
              >
                <img
                  src={img.url}
                  alt={img.filename || "Commission reference"}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end p-2 opacity-0 group-hover:opacity-100">
                  <span className="text-[10px] text-white bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm truncate max-w-full">
                    {img.filename || "View original"}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── Atelier Notes (if present) ── */}
      {commission.admin_notes && (
        <div className="border-t border-[#eee7de] pt-6">
          <span className="text-xs uppercase tracking-[0.15em] font-semibold text-neutral-500 block mb-2">
            Atelier Notes
          </span>
          <div className="bg-white p-5 border border-neutral-200 rounded-lg">
            <p className="text-xs text-neutral-700 italic leading-relaxed whitespace-pre-wrap">
              {commission.admin_notes}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default OverviewPanel;

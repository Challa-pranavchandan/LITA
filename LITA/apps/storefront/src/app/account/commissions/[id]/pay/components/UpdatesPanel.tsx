"use client";

import React from "react";
import type { CommissionUpdate } from "./types";

interface UpdatesPanelProps {
  updates?: CommissionUpdate[];
}

export function UpdatesPanel({ updates = [] }: UpdatesPanelProps) {
  const hasUpdates = updates.length > 0;

  return (
    <div
      role="tabpanel"
      id="panel-updates"
      aria-labelledby="tab-updates"
      className="space-y-6"
    >
      {!hasUpdates ? (
        <div className="border border-[#eee7de] rounded-lg bg-[#faf8f5] p-10 sm:p-14 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-white border border-[#eee7de] flex items-center justify-center text-neutral-400 mb-4 shadow-sm">
            <svg
              className="w-6 h-6 text-neutral-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>

          <h3 className="font-cormorant text-xl text-neutral-900 mb-2">
            Progress photos will appear here once work begins
          </h3>
          <p className="text-xs text-neutral-600 max-w-md mx-auto leading-relaxed">
            As your artist sketches, lays down tones, and refines the composition,
            work-in-progress snapshots and studio updates will be posted here directly
            from the atelier.
          </p>
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 border-l-2 border-[#eee7de] space-y-10 ml-2">
          {updates.map((update, idx) => (
            <article key={update.id || idx} className="relative group">
              {/* Timeline marker */}
              <div
                aria-hidden="true"
                className="absolute -left-[31px] sm:-left-[39px] top-1.5 w-4 h-4 rounded-full border-2 border-white bg-[#5f2f3c] shadow-sm"
              />

              <div className="bg-[#faf8f5] border border-[#eee7de] rounded-lg p-5 sm:p-6 space-y-4 shadow-sm transition-all hover:border-neutral-300">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold uppercase tracking-wider text-neutral-700">
                    {update.title || "Studio Progress"}
                  </span>
                  <time className="text-neutral-500 font-mono text-[11px]">
                    {update.date}
                  </time>
                </div>

                {update.image_url && (
                  <div className="relative aspect-video sm:aspect-[16/10] overflow-hidden rounded-md border border-[#eee7de] bg-white">
                    <img
                      src={update.image_url}
                      alt={update.note || "Work-in-progress update"}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                      loading="lazy"
                    />
                  </div>
                )}

                <p className="text-sm text-neutral-800 leading-relaxed font-normal whitespace-pre-wrap">
                  {update.note}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default UpdatesPanel;

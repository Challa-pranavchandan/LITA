import React from "react";

export default function OrderLoading() {
  return (
    <div className="bg-[#fbfaf8] min-h-[calc(100vh-var(--header-h)-120px)] py-10 md:py-16 px-4 sm:px-6 lg:px-12 animate-pulse">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb skeleton */}
        <div className="w-24 h-4 bg-neutral-200 rounded mb-6" />

        {/* Header skeleton */}
        <div className="border-b border-[#eee7de] pb-6 mb-8 space-y-3">
          <div className="w-32 h-3 bg-neutral-200 rounded" />
          <div className="w-72 sm:w-96 h-8 bg-neutral-200 rounded" />
          <div className="w-80 h-4 bg-neutral-200 rounded" />
        </div>

        {/* Two-column grid skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Left Column */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            <div className="h-16 bg-neutral-200/70 rounded-lg" />
            <div className="h-28 bg-neutral-200/70 rounded-lg" />
            <div className="space-y-4 pt-4">
              <div className="w-40 h-4 bg-neutral-200 rounded" />
              <div className="h-24 bg-neutral-200/70 rounded-lg" />
              <div className="h-24 bg-neutral-200/70 rounded-lg" />
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-5 xl:col-span-4">
            <div className="h-64 bg-neutral-200/70 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

import React from "react";

export default function AccountOrdersLoading() {
  return (
    <div className="bg-white min-h-[calc(100vh-var(--header-h)-120px)] py-12 md:py-16 px-6 md:px-12 animate-pulse">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="w-32 h-4 bg-neutral-200 rounded" />
        <div className="border-b border-[#e5e5e5] pb-5 space-y-2">
          <div className="w-48 h-8 bg-neutral-200 rounded" />
          <div className="w-64 h-3 bg-neutral-200 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="w-16 h-7 bg-neutral-200 rounded-full" />
          <div className="w-24 h-7 bg-neutral-200 rounded-full" />
          <div className="w-20 h-7 bg-neutral-200 rounded-full" />
          <div className="w-20 h-7 bg-neutral-200 rounded-full" />
        </div>
        <div className="space-y-4 pt-2">
          <div className="h-36 bg-neutral-100 rounded-lg border border-neutral-200" />
          <div className="h-36 bg-neutral-100 rounded-lg border border-neutral-200" />
          <div className="h-36 bg-neutral-100 rounded-lg border border-neutral-200" />
        </div>
      </div>
    </div>
  );
}

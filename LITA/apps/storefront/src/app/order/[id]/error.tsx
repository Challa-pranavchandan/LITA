"use client";

import React from "react";
import Link from "next/link";

export default function OrderError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="bg-[#fbfaf8] min-h-[calc(100vh-var(--header-h)-120px)] py-20 px-6 text-center">
      <div className="max-w-md mx-auto space-y-4">
        <span className="text-xs uppercase tracking-[0.25em] text-rose-700 block">
          Temporary Loading Error
        </span>
        <h1 className="font-cormorant text-3xl sm:text-4xl text-neutral-900 font-normal">
          Unable to display order details
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
          {error.message || "An unexpected error occurred while loading this order."}
        </p>
        <div className="pt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-ink text-wall text-xs uppercase tracking-wider font-medium hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Try again
          </button>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-full border border-neutral-300 text-neutral-800 text-xs uppercase tracking-wider font-medium hover:border-black transition-colors"
          >
            Contact studio support
          </Link>
        </div>
      </div>
    </div>
  );
}

import React from "react";
import Link from "next/link";

export default function OrderNotFound() {
  return (
    <div className="bg-[#fbfaf8] min-h-[calc(100vh-var(--header-h)-120px)] py-20 px-6 text-center">
      <div className="max-w-md mx-auto space-y-4">
        <span className="text-xs uppercase tracking-[0.25em] text-[#5C6168] block">
          Order Not Found
        </span>
        <h1 className="font-cormorant text-3xl sm:text-4xl text-neutral-900 font-normal">
          We couldn&apos;t find this order
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
          The order reference may be incorrect, or the acquisition belongs to a different collector account.
        </p>
        <div className="pt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/account"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-ink text-wall text-xs uppercase tracking-wider font-medium hover:bg-neutral-800 transition-colors"
          >
            ← Your account
          </Link>
          <Link
            href="/artworks"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-full border border-neutral-300 text-neutral-800 text-xs uppercase tracking-wider font-medium hover:border-black transition-colors"
          >
            Browse artworks
          </Link>
        </div>
      </div>
    </div>
  );
}

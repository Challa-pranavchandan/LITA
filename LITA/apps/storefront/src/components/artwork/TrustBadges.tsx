"use client";

import React from "react";

export interface TrustBadgesProps {
  shippingTimeline?: string;
  className?: string;
}

export function TrustBadges({
  shippingTimeline = "1-3 weeks",
  className = "",
}: TrustBadgesProps) {
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-gallery-hairline/80 ${className}`}
      aria-label="Collector Guarantees"
    >
      {/* 1. Hand-painted original */}
      <div className="flex items-center gap-2.5">
        <svg
          className="w-4 h-4 shrink-0 text-gallery-charcoal"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          {/* Artist palette with thumbhole & brush */}
          <path d="M12 2C6.477 2 2 6.477 2 12c0 2.21 1.79 4 4 4h1.5a1.5 1.5 0 0 1 1.5 1.5v.5c0 2.21 1.79 4 4 4 4.97 0 9-4.03 9-9 0-6.075-4.477-11-10-11z" />
          <circle cx="7.5" cy="9.5" r="1.2" fill="currentColor" />
          <circle cx="12" cy="7.5" r="1.2" fill="currentColor" />
          <circle cx="16.5" cy="10.5" r="1.2" fill="currentColor" />
        </svg>
        <span className="text-[12px] font-medium text-gallery-charcoal tracking-tight leading-tight">
          Hand-painted original
        </span>
      </div>

      {/* 2. Ships in 1-3 weeks */}
      <div className="flex items-center gap-2.5">
        <svg
          className="w-4 h-4 shrink-0 text-gallery-charcoal"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          {/* Delivery parcel / courier truck */}
          <rect x="1" y="4" width="15" height="13" rx="1" />
          <path d="M16 8h4l3 3v6h-7V8z" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
        <span className="text-[12px] font-medium text-gallery-charcoal tracking-tight leading-tight">
          Ships in {shippingTimeline}
        </span>
      </div>

      {/* 3. Secure checkout */}
      <div className="flex items-center gap-2.5">
        <svg
          className="w-4 h-4 shrink-0 text-gallery-charcoal"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          {/* Shield with checkmark */}
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        <span className="text-[12px] font-medium text-gallery-charcoal tracking-tight leading-tight">
          Secure checkout
        </span>
      </div>
    </div>
  );
}

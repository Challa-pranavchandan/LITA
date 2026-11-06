"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ActiveBroadcast {
  id: string;
  title: string;
  popup_title: string | null;
  popup_body: string | null;
  popup_image_url: string | null;
  popup_coupon_code: string | null;
  popup_cta_text: string | null;
  popup_cta_link: string | null;
  popup_frequency: "once_per_visitor" | "once_per_session" | "always";
}

export function StorefrontOfferModal() {
  const [broadcast, setBroadcast] = useState<ActiveBroadcast | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const backendUrl =
      process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";

    async function checkActivePopup() {
      try {
        const res = await fetch(`${backendUrl}/store/broadcasts/active`, {
          cache: "no-store",
        });
        if (!res.ok) return;

        const data = await res.json();
        const popup = data.popup as ActiveBroadcast | null;
        if (!popup || !isMounted) return;

        // Check frequency in storage
        const storageKey = `lita_popup_dismissed_${popup.id}`;
        if (popup.popup_frequency === "once_per_visitor") {
          if (typeof window !== "undefined" && localStorage.getItem(storageKey)) {
            return;
          }
        } else if (popup.popup_frequency === "once_per_session") {
          if (typeof window !== "undefined" && sessionStorage.getItem(storageKey)) {
            return;
          }
        }

        // Set broadcast and trigger delay so it opens smoothly after intro
        setBroadcast(popup);

        // Delay popup display by 3.5 seconds to avoid clashing with initial page load
        const timer = setTimeout(() => {
          if (isMounted) {
            setIsOpen(true);
            // Non-blocking impression tracker
            fetch(`${backendUrl}/store/broadcasts/${popup.id}/track`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ event: "impression" }),
            }).catch(() => {});
          }
        }, 3500);

        return () => clearTimeout(timer);
      } catch {
        // Silently catch network errors
      }
    }

    checkActivePopup();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleDismiss = () => {
    if (!broadcast) return;
    const storageKey = `lita_popup_dismissed_${broadcast.id}`;
    if (broadcast.popup_frequency === "once_per_session") {
      sessionStorage.setItem(storageKey, "1");
    } else {
      localStorage.setItem(storageKey, "1");
    }
    setIsOpen(false);
  };

  const handleCopyCode = async () => {
    if (!broadcast?.popup_coupon_code) return;
    try {
      await navigator.clipboard.writeText(broadcast.popup_coupon_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback
    }
  };

  const handleCtaClick = () => {
    if (!broadcast) return;
    const backendUrl =
      process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
    fetch(`${backendUrl}/store/broadcasts/${broadcast.id}/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "click" }),
    }).catch(() => {});
    handleDismiss();
  };

  if (!isOpen || !broadcast) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
    >
      <div className="relative w-full max-w-lg bg-[#ffffff] border border-[#e7dfd5] shadow-2xl rounded-sm overflow-hidden text-[#1a1a1a] animate-in zoom-in-95 duration-200">
        {/* Top close button */}
        <button
          onClick={handleDismiss}
          aria-label="Close offer popup"
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 text-[#333333] hover:text-black transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Hero Image if provided */}
        {broadcast.popup_image_url && (
          <div className="relative w-full h-48 sm:h-56 bg-[#faf8f5] overflow-hidden border-b border-[#f0eae1]">
            <img
              src={broadcast.popup_image_url}
              alt={broadcast.popup_title || broadcast.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Content body */}
        <div className="p-6 sm:p-8 text-center space-y-4">
          <span className="text-[11px] font-medium tracking-[0.2em] uppercase text-[#5f2f3c] block">
            Special Announcement
          </span>

          <h2 className="font-serif text-2xl sm:text-3xl text-[#1a1a1a] leading-tight font-normal">
            {broadcast.popup_title || broadcast.title}
          </h2>

          {broadcast.popup_body && (
            <p className="text-[13px] sm:text-[14px] text-[#555555] leading-relaxed max-w-md mx-auto">
              {broadcast.popup_body}
            </p>
          )}

          {/* Coupon Code Pill */}
          {broadcast.popup_coupon_code && (
            <div className="my-5 p-3.5 bg-[#faf6f2] border border-dashed border-[#d8c7b6] rounded-sm max-w-sm mx-auto flex items-center justify-between gap-3">
              <div className="text-left">
                <span className="text-[10px] tracking-wider uppercase text-[#887c72] block">
                  Offer Code
                </span>
                <span className="font-mono text-base font-bold tracking-widest text-[#5f2f3c]">
                  {broadcast.popup_coupon_code}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="text-[11px] uppercase tracking-wider px-3 py-1.5 bg-[#5f2f3c] text-white rounded-sm hover:bg-[#4a242e] transition-colors"
              >
                {copied ? "Copied!" : "Copy Code"}
              </button>
            </div>
          )}

          {/* CTA Button */}
          {broadcast.popup_cta_text && (
            <div className="pt-2">
              <Link
                href={broadcast.popup_cta_link || "/artworks"}
                onClick={handleCtaClick}
                className="inline-block w-full sm:w-auto min-w-[200px] px-8 py-3.5 bg-[#5f2f3c] text-white text-[12px] uppercase tracking-[0.14em] font-medium rounded-sm hover:bg-[#4a242e] transition-colors shadow-sm"
              >
                {broadcast.popup_cta_text}
              </Link>
            </div>
          )}

          {/* Dismiss link */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleDismiss}
              className="text-[11px] text-[#888888] hover:text-[#1a1a1a] underline underline-offset-4 tracking-wide transition-colors"
            >
              Continue browsing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

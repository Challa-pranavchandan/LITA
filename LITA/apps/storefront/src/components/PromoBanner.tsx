"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface PromoBannerProps {
  message?: string;
  linkText?: string;
  linkHref?: string;
}

export function PromoBanner({
  message: defaultMessage = "Five new artists, one-of-a-kind works. Discover our Fall",
  linkText: defaultLinkText = "Focus Collection",
  linkHref: defaultLinkHref = "/collections",
}: PromoBannerProps) {
  const [banner, setBanner] = useState<{
    message: string;
    linkText?: string;
    linkHref?: string;
  }>({
    message: defaultMessage,
    linkText: defaultLinkText,
    linkHref: defaultLinkHref,
  });

  useEffect(() => {
    let isMounted = true;
    const backendUrl =
      process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";

    async function fetchActiveBanner() {
      try {
        const res = await fetch(`${backendUrl}/store/broadcasts/active`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        const activeBanner = data.banner;

        if (activeBanner && isMounted) {
          setBanner({
            message:
              activeBanner.popup_body ||
              activeBanner.popup_title ||
              activeBanner.title,
            linkText:
              activeBanner.popup_cta_text ||
              (activeBanner.popup_coupon_code
                ? `Use code ${activeBanner.popup_coupon_code}`
                : "Explore"),
            linkHref: activeBanner.popup_cta_link || "/artworks",
          });
        }
      } catch {
        // Fallback to default
      }
    }

    fetchActiveBanner();
    return () => {
      isMounted = false;
    };
  }, [defaultMessage, defaultLinkText, defaultLinkHref]);

  return (
    <div
      role="banner"
      className="w-full bg-[#5f2f3c] text-white text-[12px] md:text-[13px] py-2 px-4 text-center tracking-wide font-light flex items-center justify-center transition-colors"
    >
      <p className="inline-flex flex-wrap items-center justify-center gap-1">
        <span>{banner.message}</span>
        {banner.linkText && (
          <Link
            href={banner.linkHref || "/artworks"}
            className="underline underline-offset-2 hover:opacity-85 transition-opacity font-normal"
          >
            {banner.linkText}
          </Link>
        )}
        <span>.</span>
      </p>
    </div>
  );
}

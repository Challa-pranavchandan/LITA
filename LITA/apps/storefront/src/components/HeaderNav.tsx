"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";

type CategoryItem = { name: string; handle: string };
type CollectionItem = { title: string; handle: string };

interface HeaderNavProps {
  categories?: CategoryItem[];
  collections?: CollectionItem[];
}

export function HeaderNav({
  categories = [],
  collections = [],
}: HeaderNavProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveMenu(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleMouseEnter = (menuName: string) => {
    if (menuTimeoutRef.current) clearTimeout(menuTimeoutRef.current);
    setActiveMenu(menuName);
  };

  const handleMouseLeave = () => {
    menuTimeoutRef.current = setTimeout(() => {
      setActiveMenu(null);
    }, 150);
  };

  // Fallback mediums if no categories from backend
  const displayMediums =
    categories.length > 0
      ? categories.slice(0, 8).map((c) => ({
        label: c.name,
        href: `/artworks?category=${c.handle}`,
      }))
      : [
        { label: "Painting", href: "/artworks?category=paintings" },
        { label: "Drawing", href: "/artworks?category=drawings" },
        { label: "Sculpture", href: "/artworks?category=sculptures" },
        { label: "Print", href: "/artworks?category=prints" },
        { label: "Photography", href: "/artworks?category=photography" },
        { label: "Installation", href: "/artworks?category=installations" },
        { label: "Mixed-Media", href: "/artworks?category=mixed-media" },
      ];

  // Fallback collections if no collections from backend
  const displayCollections =
    collections.length > 0
      ? collections.slice(0, 8).map((c) => ({
        label: c.title,
        href: `/collections/${c.handle}`,
      }))
      : [
        { label: "Focus", href: "/collections" },
        { label: "Collaborator's Picks", href: "/collections" },
        { label: "Realism", href: "/collections" },
        { label: "Color", href: "/collections" },
        { label: "Neutral", href: "/collections" },
        { label: "Large-Scale Statements", href: "/collections" },
        { label: "Diptychs & Triptychs", href: "/collections" },
        { label: "Unconventional Shapes", href: "/collections" },
      ];

  return (
    <div className="contents">
      {/* Center Main Nav Links (Desktop) */}
      <nav
        aria-label="Main navigation"
        className="hidden lg:flex items-center justify-center gap-7 xl:gap-9 text-[14px] text-[#222222]"
        onMouseLeave={handleMouseLeave}
      >
        {/* 1. Artwork Link */}
        <div
          className="relative py-6"
          onMouseEnter={() => handleMouseEnter("artwork")}
        >
          <button
            type="button"
            onClick={() => setActiveMenu(activeMenu === "artwork" ? null : "artwork")}
            className="hover:text-black transition-colors py-1 cursor-pointer font-normal"
            aria-expanded={activeMenu === "artwork"}
            aria-haspopup="true"
          >
            Artwork
          </button>
        </div>

        {/* 2. Exhibitions Link */}
        <div
          className="relative py-6"
          onMouseEnter={() => handleMouseEnter("exhibitions")}
        >
          <button
            type="button"
            onClick={() => setActiveMenu(activeMenu === "exhibitions" ? null : "exhibitions")}
            className="hover:text-black transition-colors py-1 cursor-pointer font-normal"
            aria-expanded={activeMenu === "exhibitions"}
            aria-haspopup="true"
          >
            Exhibitions
          </button>
        </div>

        {/* 3. Advisory Link */}
        <div
          className="relative py-6"
          onMouseEnter={() => handleMouseEnter("advisory")}
        >
          <button
            type="button"
            onClick={() => setActiveMenu(activeMenu === "advisory" ? null : "advisory")}
            className="hover:text-black transition-colors py-1 cursor-pointer font-normal"
            aria-expanded={activeMenu === "advisory"}
            aria-haspopup="true"
          >
            Advisory
          </button>
        </div>

        {/* 4. Artists Link */}
        <div
          className="relative py-6"
          onMouseEnter={() => handleMouseEnter("artists")}
        >
          <button
            type="button"
            onClick={() => setActiveMenu(activeMenu === "artists" ? null : "artists")}
            className="hover:text-black transition-colors py-1 cursor-pointer font-normal"
            aria-expanded={activeMenu === "artists"}
            aria-haspopup="true"
          >
            Artists
          </button>
        </div>
      </nav>

      {/* Mega Dropdowns Overlay */}
      {activeMenu && (
        <div
          className="absolute left-0 right-0 top-full bg-white border-b border-[#EAEAEA] shadow-[0_20px_35px_-12px_rgba(0,0,0,0.08)] z-40 transition-all duration-200"
          onMouseEnter={() => {
            if (menuTimeoutRef.current) clearTimeout(menuTimeoutRef.current);
          }}
          onMouseLeave={handleMouseLeave}
        >
          {/* Artwork Mega Menu */}
          {activeMenu === "artwork" && (
            <div className="mx-auto max-w-[1280px] px-8 py-10 grid grid-cols-3 gap-12">
              {/* Column 1: Browse By */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#888888] mb-4">
                  Browse By
                </p>
                <ul className="space-y-2.5 text-[14px]">
                  <li>
                    <Link
                      href="/artworks?sort=newest"
                      onClick={() => setActiveMenu(null)}
                      className="text-[#222222] hover:text-black transition-colors block"
                    >
                      New Arrivals
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/artworks"
                      onClick={() => setActiveMenu(null)}
                      className="text-[#222222] hover:text-black transition-colors block"
                    >
                      Featured
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/artworks?max=350"
                      onClick={() => setActiveMenu(null)}
                      className="text-[#222222] hover:text-black transition-colors block"
                    >
                      Art Under $350
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/artworks?max=800"
                      onClick={() => setActiveMenu(null)}
                      className="text-[#222222] hover:text-black transition-colors block"
                    >
                      Art Under $800
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/artworks"
                      onClick={() => setActiveMenu(null)}
                      className="text-[#222222] hover:text-black transition-colors block"
                    >
                      Ready for Pick-up
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/commissions"
                      onClick={() => setActiveMenu(null)}
                      className="text-[#222222] hover:text-black transition-colors block"
                    >
                      Custom Artwork
                    </Link>
                  </li>
                  <li className="pt-1">
                    <Link
                      href="/artworks"
                      onClick={() => setActiveMenu(null)}
                      className="text-[#111111] underline underline-offset-4 font-normal block hover:opacity-75"
                    >
                      All Artwork
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Column 2: Mediums */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#888888] mb-4">
                  Mediums
                </p>
                <ul className="space-y-2.5 text-[14px]">
                  {displayMediums.map((m) => (
                    <li key={m.label}>
                      <Link
                        href={m.href}
                        onClick={() => setActiveMenu(null)}
                        className="text-[#222222] hover:text-black transition-colors block"
                      >
                        {m.label}
                      </Link>
                    </li>
                  ))}
                  <li className="pt-1">
                    <Link
                      href="/artworks"
                      onClick={() => setActiveMenu(null)}
                      className="text-[#111111] underline underline-offset-4 font-normal block hover:opacity-75"
                    >
                      All Mediums
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Column 3: Collections */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#888888] mb-4">
                  Collections
                </p>
                <ul className="space-y-2.5 text-[14px]">
                  {displayCollections.map((col) => (
                    <li key={col.label}>
                      <Link
                        href={col.href}
                        onClick={() => setActiveMenu(null)}
                        className="text-[#222222] hover:text-black transition-colors block"
                      >
                        {col.label}
                      </Link>
                    </li>
                  ))}
                  <li className="pt-1">
                    <Link
                      href="/collections"
                      onClick={() => setActiveMenu(null)}
                      className="text-[#111111] underline underline-offset-4 font-normal block hover:opacity-75"
                    >
                      All Collections
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Exhibitions Menu */}
          {activeMenu === "exhibitions" && (
            <div className="mx-auto max-w-[420px] px-8 py-8">
              <ul className="space-y-3 text-[14px]">
                <li>
                  <Link
                    href="/artworks"
                    onClick={() => setActiveMenu(null)}
                    className="text-[#222222] hover:text-black transition-colors block"
                  >
                    On View
                  </Link>
                </li>
                <li>
                  <Link
                    href="/artworks"
                    onClick={() => setActiveMenu(null)}
                    className="text-[#222222] hover:text-black transition-colors block"
                  >
                    Upcoming
                  </Link>
                </li>
                <li>
                  <Link
                    href="/artworks"
                    onClick={() => setActiveMenu(null)}
                    className="text-[#222222] hover:text-black transition-colors block"
                  >
                    Past
                  </Link>
                </li>
                <li className="pt-2">
                  <Link
                    href="/artworks"
                    onClick={() => setActiveMenu(null)}
                    className="text-[#111111] underline underline-offset-4 font-normal block hover:opacity-75"
                  >
                    All Exhibitions
                  </Link>
                </li>
              </ul>
            </div>
          )}

          {/* Advisory Menu */}
          {activeMenu === "advisory" && (
            <div className="mx-auto max-w-[680px] px-8 py-8 grid grid-cols-2 gap-10">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#888888] mb-4">
                  Visit
                </p>
                <ul className="space-y-2.5 text-[14px]">
                  <li>
                    <Link
                      href="/about"
                      onClick={() => setActiveMenu(null)}
                      className="text-[#222222] hover:text-black transition-colors block"
                    >
                      The Gallery
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#888888] mb-4">
                  Advisory
                </p>
                <ul className="space-y-2.5 text-[14px]">
                  <li>
                    <Link
                      href="/commissions"
                      onClick={() => setActiveMenu(null)}
                      className="text-[#222222] hover:text-black transition-colors block"
                    >
                      For Individuals
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/commissions"
                      onClick={() => setActiveMenu(null)}
                      className="text-[#222222] hover:text-black transition-colors block"
                    >
                      For Companies
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/commissions"
                      onClick={() => setActiveMenu(null)}
                      className="text-[#222222] hover:text-black transition-colors block"
                    >
                      For Trade
                    </Link>
                  </li>
                  <li className="pt-1">
                    <Link
                      href="/commissions"
                      onClick={() => setActiveMenu(null)}
                      className="text-[#111111] underline underline-offset-4 font-normal block hover:opacity-75"
                    >
                      All Services
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Artists Menu */}
          {activeMenu === "artists" && (
            <div className="mx-auto max-w-[420px] px-8 py-8">
              <ul className="space-y-3 text-[14px]">
                <li>
                  <Link
                    href="/artworks?sort=newest"
                    onClick={() => setActiveMenu(null)}
                    className="text-[#222222] hover:text-black transition-colors block"
                  >
                    Recently Joined
                  </Link>
                </li>
                <li>
                  <Link
                    href="/about"
                    onClick={() => setActiveMenu(null)}
                    className="text-[#222222] hover:text-black transition-colors block"
                  >
                    Inside the Studio
                  </Link>
                </li>
                <li className="pt-2">
                  <Link
                    href="/artworks"
                    onClick={() => setActiveMenu(null)}
                    className="text-[#111111] underline underline-offset-4 font-normal block hover:opacity-75"
                  >
                    All Artists
                  </Link>
                </li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  MenuIcon,
  CloseIcon,
  UserIcon,
  HeartIcon,
  CartIcon,
  SearchIcon,
} from "@/components/livinIcons";

type CategoryItem = { name: string; handle: string };
type CollectionItem = { title: string; handle: string };

export function MobileMenu({
  categories = [],
  collections = [],
}: {
  categories?: CategoryItem[];
  collections?: CollectionItem[];
}) {
  const [open, setOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

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
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="p-2 text-[#222222] hover:opacity-60 transition-opacity"
      >
        <MenuIcon className="w-[18px] h-[12px]" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-white"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation Menu"
        >
          {/* Top header inside drawer */}
          <div className="flex h-[70px] items-center justify-between border-b border-[#EAEAEA] px-6">
            <span className="text-[16px] font-medium tracking-wide text-[#111111]">Menu</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-2 text-[#444444] hover:text-black transition-colors"
              aria-label="Close menu"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Search bar inside drawer */}
          <form action="/artworks" role="search" className="px-6 py-4 border-b border-[#EAEAEA]">
            <div className="relative flex items-center">
              <SearchIcon className="absolute left-3 w-4 h-4 text-[#888888]" />
              <input
                name="q"
                type="search"
                placeholder="Search artwork..."
                className="w-full bg-[#F5F6F4] pl-9 pr-4 py-2.5 text-[14px] text-[#111111] placeholder:text-[#888888] rounded-none focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>
          </form>

          {/* Nav Accordions */}
          <div className="divide-y divide-[#EAEAEA]">
            {/* Artwork Section */}
            <div>
              <button
                type="button"
                onClick={() => toggleSection("artwork")}
                className="w-full flex items-center justify-between px-6 py-4 text-[16px] text-[#111111] hover:bg-gray-50 transition-colors"
              >
                <span>Artwork</span>
                <span className={`transition-transform duration-200 text-sm ${expandedSection === "artwork" ? "rotate-180" : ""}`}>
                  ▼
                </span>
              </button>
              {expandedSection === "artwork" && (
                <div className="bg-[#FAF9F7] px-8 py-5 space-y-6 text-[14px]">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#888888] mb-2">
                      Browse By
                    </p>
                    <ul className="space-y-2">
                      <li><Link href="/artworks?sort=newest" className="text-[#333333] hover:text-black">New Arrivals</Link></li>
                      <li><Link href="/artworks" className="text-[#333333] hover:text-black">Featured</Link></li>
                      <li><Link href="/artworks?max=350" className="text-[#333333] hover:text-black">Art Under $350</Link></li>
                      <li><Link href="/artworks?max=800" className="text-[#333333] hover:text-black">Art Under $800</Link></li>
                      <li><Link href="/artworks" className="text-[#333333] hover:text-black">Ready for Pick-up</Link></li>
                      <li><Link href="/commissions" className="text-[#333333] hover:text-black">Custom Artwork</Link></li>
                      <li className="pt-1"><Link href="/artworks" className="text-black underline">All Artwork</Link></li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#888888] mb-2">
                      Mediums
                    </p>
                    <ul className="space-y-2">
                      {displayMediums.map((m) => (
                        <li key={m.label}>
                          <Link href={m.href} className="text-[#333333] hover:text-black">
                            {m.label}
                          </Link>
                        </li>
                      ))}
                      <li className="pt-1"><Link href="/artworks" className="text-black underline">All Mediums</Link></li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#888888] mb-2">
                      Collections
                    </p>
                    <ul className="space-y-2">
                      {displayCollections.map((col) => (
                        <li key={col.label}>
                          <Link href={col.href} className="text-[#333333] hover:text-black">
                            {col.label}
                          </Link>
                        </li>
                      ))}
                      <li className="pt-1"><Link href="/collections" className="text-black underline">All Collections</Link></li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Exhibitions Section */}
            <div>
              <button
                type="button"
                onClick={() => toggleSection("exhibitions")}
                className="w-full flex items-center justify-between px-6 py-4 text-[16px] text-[#111111] hover:bg-gray-50 transition-colors"
              >
                <span>Exhibitions</span>
                <span className={`transition-transform duration-200 text-sm ${expandedSection === "exhibitions" ? "rotate-180" : ""}`}>
                  ▼
                </span>
              </button>
              {expandedSection === "exhibitions" && (
                <div className="bg-[#FAF9F7] px-8 py-4 space-y-2.5 text-[14px]">
                  <p><Link href="/artworks" className="text-[#333333] hover:text-black">On View</Link></p>
                  <p><Link href="/artworks" className="text-[#333333] hover:text-black">Upcoming</Link></p>
                  <p><Link href="/artworks" className="text-[#333333] hover:text-black">Past</Link></p>
                  <p className="pt-1"><Link href="/artworks" className="text-black underline">All Exhibitions</Link></p>
                </div>
              )}
            </div>

            {/* Advisory Section */}
            <div>
              <button
                type="button"
                onClick={() => toggleSection("advisory")}
                className="w-full flex items-center justify-between px-6 py-4 text-[16px] text-[#111111] hover:bg-gray-50 transition-colors"
              >
                <span>Advisory</span>
                <span className={`transition-transform duration-200 text-sm ${expandedSection === "advisory" ? "rotate-180" : ""}`}>
                  ▼
                </span>
              </button>
              {expandedSection === "advisory" && (
                <div className="bg-[#FAF9F7] px-8 py-5 space-y-5 text-[14px]">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#888888] mb-2">Visit</p>
                    <p><Link href="/about" className="text-[#333333] hover:text-black">The Gallery</Link></p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#888888] mb-2">Advisory</p>
                    <ul className="space-y-2">
                      <li><Link href="/commissions" className="text-[#333333] hover:text-black">For Individuals</Link></li>
                      <li><Link href="/commissions" className="text-[#333333] hover:text-black">For Companies</Link></li>
                      <li><Link href="/commissions" className="text-[#333333] hover:text-black">For Trade</Link></li>
                      <li className="pt-1"><Link href="/commissions" className="text-black underline">All Services</Link></li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Artists Section */}
            <div>
              <button
                type="button"
                onClick={() => toggleSection("artists")}
                className="w-full flex items-center justify-between px-6 py-4 text-[16px] text-[#111111] hover:bg-gray-50 transition-colors"
              >
                <span>Artists</span>
                <span className={`transition-transform duration-200 text-sm ${expandedSection === "artists" ? "rotate-180" : ""}`}>
                  ▼
                </span>
              </button>
              {expandedSection === "artists" && (
                <div className="bg-[#FAF9F7] px-8 py-4 space-y-2.5 text-[14px]">
                  <p><Link href="/artworks?sort=newest" className="text-[#333333] hover:text-black">Recently Joined</Link></p>
                  <p><Link href="/about" className="text-[#333333] hover:text-black">Inside the Studio</Link></p>
                  <p className="pt-1"><Link href="/artworks" className="text-black underline">All Artists</Link></p>
                </div>
              )}
            </div>

            {/* Journal Direct Link */}
            <div>
              <Link
                href="/journal"
                className="w-full flex items-center justify-between px-6 py-4 text-[16px] text-[#111111] hover:bg-gray-50 transition-colors"
              >
                <span>Journal</span>
              </Link>
            </div>
          </div>

          {/* Account & Quick Links at bottom */}
          <div className="border-t border-[#EAEAEA] p-6 space-y-4 bg-white mt-4">
            <Link href="/account" className="flex items-center gap-3 text-[15px] text-[#222222] hover:text-black">
              <UserIcon className="w-5 h-5" />
              <span>Log In / Sign Up</span>
            </Link>
            <Link href="/saved" className="flex items-center gap-3 text-[15px] text-[#222222] hover:text-black">
              <HeartIcon className="w-5 h-5" />
              <span>Saved Artworks</span>
            </Link>
            <Link href="/cart" className="flex items-center gap-3 text-[15px] text-[#222222] hover:text-black">
              <CartIcon className="w-5 h-5" />
              <span>Your Cart</span>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

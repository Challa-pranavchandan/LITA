"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  SearchIcon,
  HeartIcon,
  UserIcon,
  CloseIcon,
} from "@/components/livinIcons";
import { CartDrawer } from "@/components/CartDrawer";
import { useSaved } from "@/lib/saved";

export function HeaderActions({
  cart,
  customer,
}: {
  cart: any;
  customer: any;
}) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const savedIds = useSaved();
  const savedCount = savedIds.length;

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/artworks?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  return (
    <>
      <div className="flex items-center gap-5 md:gap-6 text-[#222222]">
        {/* 1. Search Icon */}
        <button
          type="button"
          onClick={() => setSearchOpen(!searchOpen)}
          className="p-1 text-[#222222] hover:opacity-60 transition-opacity cursor-pointer"
          aria-label="Search"
          aria-expanded={searchOpen}
        >
          <SearchIcon className="w-[18px] h-[18px]" />
        </button>

        {/* 2. Heart (Saved) Icon */}
        <Link
          href="/saved"
          className="relative p-1 text-[#222222] hover:opacity-60 transition-opacity"
          aria-label={`Saved artworks (${savedCount})`}
        >
          <HeartIcon filled={savedCount > 0} className="w-[20px] h-[20px]" />
          {savedCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#111111] px-1 text-[10px] font-semibold text-white tabular-nums">
              {savedCount}
            </span>
          )}
        </Link>

        {/* 3. Cart Icon */}
        <CartDrawer cart={cart} />

        {/* 4. User / Account Icon */}
        <Link
          href="/account"
          className="p-1 text-[#222222] hover:opacity-60 transition-opacity"
          aria-label={customer ? "My Account" : "Sign in / Register"}
        >
          <UserIcon className="w-[20px] h-[20px]" />
        </Link>
      </div>

      {/* Expandable Search Overlay / Bar */}
      {searchOpen && (
        <div className="absolute left-0 right-0 top-full bg-white border-b border-[#EAEAEA] shadow-md z-50 animate-in fade-in duration-150">
          <div className="mx-auto max-w-[1280px] px-6 md:px-12 py-4 flex items-center gap-4">
            <SearchIcon className="w-5 h-5 text-[#888888] shrink-0" />
            <form onSubmit={handleSearchSubmit} className="flex-1">
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search artwork by artist, medium, style..."
                className="w-full bg-transparent text-[15px] md:text-[16px] text-[#111111] placeholder:text-[#888888] focus:outline-none py-1"
              />
            </form>
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="p-1 text-[#666666] hover:text-black transition-colors cursor-pointer"
              aria-label="Close search"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

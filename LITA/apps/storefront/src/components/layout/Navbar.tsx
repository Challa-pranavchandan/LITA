"use client";

import React from "react";
import Link from "next/link";
import { useIntro } from "../intro/IntroProvider";

export function NavLogo({ className = "" }: { className?: string }) {
  const { logoRef, introDone } = useIntro();

  return (
    <Link
      href="/"
      id="nav-logo"
      ref={logoRef as React.RefObject<HTMLAnchorElement>}
      aria-label="Livin In The Art Home"
      className={`font-display inline-flex items-center text-xl sm:text-2xl md:text-[23px] font-normal tracking-wide text-[#111111] transition-opacity hover:opacity-75 focus-visible:outline-none whitespace-nowrap ${className}`}
      style={{
        visibility: introDone ? "visible" : "hidden",
      }}
    >
      Livin In The Art
    </Link>
  );
}

export default function Navbar() {
  const { logoRef, introDone } = useIntro();

  return (
    <header className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 bg-white/80 backdrop-blur-md border-b border-[#EAEAEA]">
      <nav className="flex items-center gap-6">
        <Link
          href="/artworks"
          className="text-sm font-medium text-[#111111] hover:opacity-70 transition-opacity"
        >
          Artworks
        </Link>
        <Link
          href="/collections"
          className="text-sm font-medium text-[#111111] hover:opacity-70 transition-opacity"
        >
          Collections
        </Link>
      </nav>

      <Link
        href="/"
        id="nav-logo"
        ref={logoRef as React.RefObject<HTMLAnchorElement>}
        aria-label="Livin In The Art Home"
        className="font-display text-xl sm:text-2xl font-normal tracking-wide text-[#111111] transition-opacity hover:opacity-75 focus-visible:outline-none whitespace-nowrap"
        style={{
          visibility: introDone ? "visible" : "hidden",
        }}
      >
        Livin In The Art
      </Link>

      <div className="flex items-center gap-4">
        <Link
          href="/saved"
          className="text-sm font-medium text-[#111111] hover:opacity-70 transition-opacity"
        >
          Saved
        </Link>
      </div>
    </header>
  );
}

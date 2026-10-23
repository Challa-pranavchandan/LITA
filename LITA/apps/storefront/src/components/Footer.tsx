"use client";

import React, { useState } from "react";
import Link from "next/link";

export function Footer() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [showAccessibilityModal, setShowAccessibilityModal] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [largerText, setLargerText] = useState(false);

  async function handleNewsletterSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) return;

    setState("sending");
    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "newsletter", email: email.trim() }),
      });
      if (!res.ok) throw new Error();
      setEmail("");
      setState("done");
      setTimeout(() => setState("idle"), 4000);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 4000);
    }
  }

  return (
    <footer className="w-full border-t border-[#E5E5E5] bg-[#FAF9F7] text-[#222222] font-sans antialiased">
      {/* Main Container */}
      <div className="mx-auto w-full max-w-[1480px]">
        <div className="grid grid-cols-1 lg:grid-cols-[48%_52%] xl:grid-cols-[46%_54%]">
          {/* Left Column: Newsletter & Social */}
          <div className="pt-12 pb-14 px-6 sm:px-10 md:px-12 lg:pr-14 lg:border-r border-[#E5E5E5]">
            {/* Newsletter Sign Up */}
            <div>
              <h2 className="text-[15px] font-normal text-[#222222] tracking-tight mb-4">
                Newsletter Sign Up
              </h2>
              <form onSubmit={handleNewsletterSubmit} className="w-full max-w-[440px]">
                <div className="relative flex items-center bg-[#ECEBE8] border-b border-[#CCCCCC] px-4 py-3 transition-colors focus-within:border-[#222222]">
                  <input
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Email Address"
                    disabled={state === "sending"}
                    className="w-full bg-transparent text-[14px] text-[#222222] placeholder:text-[#7A7A7A] focus:outline-none font-normal pr-3 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={state === "sending"}
                    className="text-[14px] text-[#222222] font-normal hover:text-black whitespace-nowrap transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {state === "sending" ? "Signing Up..." : state === "done" ? "Signed Up ✓" : "Sign Up"}
                  </button>
                </div>
                {state === "done" && (
                  <p className="mt-2 text-xs text-emerald-700" role="status">
                    Thank you for subscribing to our newsletter.
                  </p>
                )}
                {state === "error" && (
                  <p className="mt-2 text-xs text-red-600" role="alert">
                    Please check your email address and try again.
                  </p>
                )}
              </form>
            </div>

            {/* Social Section */}
            <div className="mt-10 md:mt-12">
              <h3 className="text-[15px] font-normal text-[#222222] tracking-tight mb-4">
                Social
              </h3>
              <div className="flex items-center gap-5 text-[#222222]">
                {/* Facebook */}
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="transition-opacity hover:opacity-70"
                >
                  <svg
                    className="w-[21px] h-[21px] fill-current"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>

                {/* Instagram */}
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="transition-opacity hover:opacity-70"
                >
                  <svg
                    className="w-[21px] h-[21px]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="2.5" y="2.5" width="19" height="19" rx="5" ry="5" />
                    <circle cx="12" cy="12" r="4.2" />
                    <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
                  </svg>
                </a>

                {/* TikTok */}
                <a
                  href="https://tiktok.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                  className="transition-opacity hover:opacity-70"
                >
                  <svg
                    className="w-[20px] h-[20px] fill-current"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                  </svg>
                </a>

                {/* Pinterest */}
                <a
                  href="https://pinterest.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Pinterest"
                  className="transition-opacity hover:opacity-70"
                >
                  <svg
                    className="w-[21px] h-[21px] fill-current"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"
                    />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: Navigation Links */}
          <div className="pt-12 pb-14 px-6 sm:px-10 md:px-12 lg:pl-16 xl:pl-20">
            <div className="grid grid-cols-2 gap-8 sm:gap-12 lg:gap-16 xl:gap-24">
              {/* Left Sub-column: Company & Art Advisory */}
              <div>
                {/* Company */}
                <div>
                  <h3 className="text-[15px] font-normal text-[#222222] tracking-tight mb-3.5">
                    Company
                  </h3>
                  <ul className="space-y-2.5 text-[14px] text-[#333333]">
                    <li>
                      <Link href="/about" className="hover:text-black transition-colors">
                        About Us
                      </Link>
                    </li>
                    <li>
                      <Link href="/about#journal" className="hover:text-black transition-colors">
                        Journal
                      </Link>
                    </li>
                    <li>
                      <Link href="/contact" className="hover:text-black transition-colors">
                        Contact
                      </Link>
                    </li>
                    <li>
                      <Link href="/about#press" className="hover:text-black transition-colors">
                        Press
                      </Link>
                    </li>
                    <li>
                      <Link href="/shipping" className="hover:text-black transition-colors">
                        FAQs
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* Art Advisory */}
                <div className="mt-10 md:mt-12">
                  <h3 className="text-[15px] font-normal text-[#222222] tracking-tight mb-3.5">
                    Art Advisory
                  </h3>
                  <ul className="space-y-2.5 text-[14px] text-[#333333]">
                    <li>
                      <Link href="/commissions?type=individual" className="hover:text-black transition-colors">
                        For Individuals
                      </Link>
                    </li>
                    <li>
                      <Link href="/commissions?type=corporate" className="hover:text-black transition-colors">
                        For Companies
                      </Link>
                    </li>
                    <li>
                      <Link href="/commissions" className="hover:text-black transition-colors">
                        Custom Artwork
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Right Sub-column: Visit & Trade */}
              <div>
                {/* Visit */}
                <div>
                  <h3 className="text-[15px] font-normal text-[#222222] tracking-tight mb-3.5">
                    Visit
                  </h3>
                  <ul className="space-y-2.5 text-[14px] text-[#333333]">
                    <li>
                      <Link href="/about" className="hover:text-black transition-colors">
                        The Gallery
                      </Link>
                    </li>
                    <li>
                      <Link href="/collections" className="hover:text-black transition-colors">
                        Exhibitions
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* Trade */}
                <div className="mt-10 md:mt-12">
                  <h3 className="text-[15px] font-normal text-[#222222] tracking-tight mb-3.5">
                    Trade
                  </h3>
                  <ul className="space-y-2.5 text-[14px] text-[#333333]">
                    <li>
                      <Link href="/contact?topic=interior-designers" className="hover:text-black transition-colors">
                        Interior Designers
                      </Link>
                    </li>
                    <li>
                      <Link href="/contact?topic=architects" className="hover:text-black transition-colors">
                        Architects
                      </Link>
                    </li>
                    <li>
                      <Link href="/contact?topic=real-estate" className="hover:text-black transition-colors">
                        Real Estate Developers
                      </Link>
                    </li>
                    <li>
                      <Link href="/contact?topic=art-consultants" className="hover:text-black transition-colors">
                        Art Consultants
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright, Legal Links & Accessibility */}
        <div className="border-t border-[#E5E5E5] px-6 sm:px-10 md:px-12 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[13px] text-[#222222]">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <span>©2026, Uprise Art. All Right Reserved</span>
            <div className="flex items-center gap-2">
              <Link href="/privacy" className="hover:text-black transition-colors">
                Privacy Policy
              </Link>
              <span className="text-[#666666]">-</span>
              <Link href="/terms" className="hover:text-black transition-colors">
                Terms of Use
              </Link>
            </div>
          </div>

          {/* Accessibility Icon Button */}
          <div className="relative self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setShowAccessibilityModal((prev) => !prev)}
              aria-label="Accessibility options"
              title="Accessibility options"
              className="group flex items-center justify-center p-1 rounded-full text-[#222222] hover:opacity-75 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="w-7 h-7 text-[#222222]"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" strokeWidth="1.6" />
                <circle cx="12" cy="7.2" r="1.3" fill="currentColor" stroke="none" />
                <path
                  d="M6.5 10.2C8.3 9.8 10.2 9.5 12 9.5C13.8 9.5 15.7 9.8 17.5 10.2M12 9.5V14.5M12 14.5L9.6 18.5M12 14.5L14.4 18.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                />
              </svg>
            </button>

            {/* Accessibility Popup Menu */}
            {showAccessibilityModal && (
              <div
                role="dialog"
                aria-label="Accessibility settings"
                className="absolute right-0 bottom-10 z-50 w-64 bg-white border border-[#E5E5E5] shadow-lg p-4 rounded-sm text-xs text-[#222222]"
              >
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#E5E5E5]">
                  <span className="font-medium text-[13px]">Accessibility Options</span>
                  <button
                    onClick={() => setShowAccessibilityModal(false)}
                    className="text-[#666666] hover:text-black"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      setLargerText(!largerText);
                      document.documentElement.classList.toggle("text-lg", !largerText);
                    }}
                    className="w-full flex items-center justify-between py-1 px-2 border border-[#E5E5E5] hover:bg-[#FAF9F7] text-left transition-colors"
                  >
                    <span>Larger Text</span>
                    <span className="font-semibold">{largerText ? "ON" : "OFF"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHighContrast(!highContrast);
                      document.documentElement.classList.toggle("contrast-125", !highContrast);
                    }}
                    className="w-full flex items-center justify-between py-1 px-2 border border-[#E5E5E5] hover:bg-[#FAF9F7] text-left transition-colors"
                  >
                    <span>High Contrast</span>
                    <span className="font-semibold">{highContrast ? "ON" : "OFF"}</span>
                  </button>
                  <p className="text-[11px] text-[#666666] pt-1">
                    This site strives to ensure digital accessibility for people with disabilities.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}

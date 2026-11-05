import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Contact the Studio | Livin In The Art",
  description:
    "Reach out to Livin In The Art gallery for artwork acquisitions, bespoke commission inquiries, and private advisory sessions.",
};

export default function ContactPage() {
  return (
    <div className="w-full bg-white text-[#232629]">
      {/* ── Page Header ── */}
      <header className="border-b border-[#E5E7EB]">
        <div className="mx-auto max-w-4xl px-6 pt-16 pb-12 sm:pt-20 sm:pb-16 text-center">
          <span className="block pb-3 text-xs font-sans font-medium uppercase tracking-[0.25em] text-[#5C6168]">
            Studio &amp; Gallery Advisory
          </span>
          <h1
            className="font-cormorant text-4xl sm:text-5xl md:text-6xl font-normal text-[#232629] leading-[1.15]"
            style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
          >
            Connect with the Studio
          </h1>
          <p className="mt-4 text-sm sm:text-base text-[#5C6168] max-w-xl mx-auto leading-relaxed">
            Whether you are considering an original catalog piece, commissioning custom artwork, or seeking architectural advisory, we look forward to hearing from you.
          </p>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-14">
          {/* Direct Communication Channels */}
          <div className="space-y-8">
            <div>
              <span className="text-xs uppercase tracking-[0.2em] font-semibold text-[#5C6168]">
                Direct Inquiries
              </span>
              <h2
                className="text-2xl sm:text-3xl font-normal text-[#232629] mt-2 mb-3"
                style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
              >
                Reach Our Advisors
              </h2>
              <p className="text-sm sm:text-base text-[#5C6168] leading-relaxed">
                Have questions regarding artwork provenance, custom framing options, or domestic shipping timelines? Connect directly with our team.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <a
                href={`mailto:${siteConfig.email}`}
                className="flex items-center gap-4 p-4 border border-[#E5E5E5] bg-[#FAF9F7] transition-all hover:border-[#111111] hover:bg-white group"
              >
                <div className="w-10 h-10 rounded-full bg-white border border-[#E5E5E5] flex items-center justify-center text-[#232629] group-hover:bg-[#111111] group-hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <span className="block text-xs uppercase tracking-wider text-[#777777]">Email Studio</span>
                  <span className="text-sm sm:text-base font-medium text-[#232629]">{siteConfig.email}</span>
                </div>
              </a>

              <a
                href="https://wa.me/917799671321"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 border border-[#E5E5E5] bg-[#FAF9F7] transition-all hover:border-[#111111] hover:bg-white group"
              >
                <div className="w-10 h-10 rounded-full bg-white border border-[#E5E5E5] flex items-center justify-center text-[#232629] group-hover:bg-[#25D366] group-hover:text-white group-hover:border-[#25D366] transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.04 2a9.87 9.87 0 0 0-8.52 14.86L2 22l5.28-1.38A9.93 9.93 0 0 0 12.04 22h.01A10 10 0 0 0 12.04 2Zm0 18.18h-.01a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.13.82.84-3.05-.2-.31a8.18 8.18 0 1 1 6.98 3.86Zm4.49-6.13c-.25-.12-1.48-.73-1.71-.81-.23-.08-.4-.12-.56.12-.17.25-.64.81-.78.98-.15.16-.29.18-.54.06-.25-.12-1.05-.39-2-.1-.74-.67-1.24-1.49-1.39-1.74-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.16.04-.31-.02-.43-.07-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.08s.89 2.41 1.02 2.58c.12.16 1.75 2.67 4.24 3.74.59.25 1.05.4 1.41.51.59.19 1.13.16 1.56.1.48-.07 1.48-.61 1.69-1.2.21-.59.21-1.1.15-1.2-.06-.1-.23-.16-.48-.29Z" />
                  </svg>
                </div>
                <div>
                  <span className="block text-xs uppercase tracking-wider text-[#777777]">Direct WhatsApp</span>
                  <span className="text-sm sm:text-base font-medium text-[#232629]">+91 77996 71321</span>
                </div>
              </a>

              <a
                href="https://ig.me/m/livin_in_the_art"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 border border-[#E5E5E5] bg-[#FAF9F7] transition-all hover:border-[#111111] hover:bg-white group"
              >
                <div className="w-10 h-10 rounded-full bg-white border border-[#E5E5E5] flex items-center justify-center text-[#232629] group-hover:bg-[#E1306C] group-hover:text-white group-hover:border-[#E1306C] transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="5" strokeWidth="1.8" />
                    <circle cx="12" cy="12" r="4" strokeWidth="1.8" />
                    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                  </svg>
                </div>
                <div>
                  <span className="block text-xs uppercase tracking-wider text-[#777777]">Instagram Dispatch</span>
                  <span className="text-sm sm:text-base font-medium text-[#232629]">@livin_in_the_art</span>
                </div>
              </a>
            </div>
          </div>

          {/* Dedicated Program Navigation */}
          <div className="space-y-6">
            <div className="border border-[#E5E5E5] p-6 sm:p-8 bg-[#FAF9F7]">
              <span className="text-xs uppercase tracking-widest text-[#5f2f3c] font-semibold">
                Bespoke Commissions
              </span>
              <h3
                className="text-2xl font-normal text-[#232629] mt-2 mb-2"
                style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
              >
                Custom Artwork Creation
              </h3>
              <p className="text-sm text-[#5C6168] leading-relaxed mb-6">
                Looking for a bespoke piece tailored to a specific architectural wall or sacred space? Share your concept, dimensions, and reference imagery directly with the artist.
              </p>
              <Link
                href="/commissions"
                className="inline-flex items-center justify-center border border-[#232629] bg-[#232629] text-white px-6 py-2.5 text-xs uppercase tracking-wider font-medium hover:bg-black transition-colors"
              >
                Request Commission &rarr;
              </Link>
            </div>

            <div className="border border-[#E5E5E5] p-6 sm:p-8 bg-[#FAF9F7]">
              <span className="text-xs uppercase tracking-widest text-[#5C6168] font-semibold">
                Architectural &amp; Trade
              </span>
              <h3
                className="text-2xl font-normal text-[#232629] mt-2 mb-2"
                style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
              >
                Trade Program for Designers
              </h3>
              <p className="text-sm text-[#5C6168] leading-relaxed mb-6">
                Are you an interior designer, architect, or hospitality developer? Discover our curated trade pricing tiers, dedicated moodboard curations, and priority studio scheduling.
              </p>
              <Link
                href="/trade"
                className="inline-flex items-center justify-center border border-[#232629] bg-transparent text-[#232629] px-6 py-2.5 text-xs uppercase tracking-wider font-medium hover:bg-[#232629] hover:text-white transition-colors"
              >
                Explore Trade Program &rarr;
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

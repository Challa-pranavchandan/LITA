import type { Metadata } from "next";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <div className="page max-w-3xl py-12">
      <div>
        <h1 className="text-4xl">Contact</h1>
        <p className="prose-art mt-5">
          Questions about an order, shipping, or an artwork? Message us directly
          on Instagram or WhatsApp, or email{" "}
          <a href={`mailto:${siteConfig.email}`} className="link">{siteConfig.email}</a>.
        </p>
        <div className="mt-6">
          <div className="mt-3 flex flex-wrap gap-3">
            <a
              href="https://ig.me/m/livin_in_the_art"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[#222222] px-5 py-3 text-sm text-[#222222] transition-colors hover:bg-[#222222] hover:text-white"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5"
              >
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
              </svg>
              <span>@livin_in_the_art</span>
            </a>
            <a
              href="https://wa.me/917799671321"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#222222] px-5 py-3 text-sm text-white transition-colors hover:bg-[#444444]"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5"
              >
                <path d="M12.04 2a9.87 9.87 0 0 0-8.52 14.86L2 22l5.28-1.38A9.93 9.93 0 0 0 12.04 22h.01A10 10 0 0 0 12.04 2Zm0 18.18h-.01a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.13.82.84-3.05-.2-.31a8.18 8.18 0 1 1 6.98 3.86Zm4.49-6.13c-.25-.12-1.48-.73-1.71-.81-.23-.08-.4-.12-.56.12-.17.25-.64.81-.78.98-.15.16-.29.18-.54.06-.25-.12-1.05-.39-2-.1-.74-.67-1.24-1.49-1.39-1.74-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.16.04-.31-.02-.43-.07-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.08s.89 2.41 1.02 2.58c.12.16 1.75 2.67 4.24 3.74.59.25 1.05.4 1.41.51.59.19 1.13.16 1.56.1.48-.07 1.48-.61 1.69-1.2.21-.59.21-1.1.15-1.2-.06-.1-.23-.16-.48-.29Z" />
              </svg>
              <span>Contact us on WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

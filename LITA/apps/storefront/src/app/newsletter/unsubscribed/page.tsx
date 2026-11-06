import type { Metadata } from "next";
import Link from "next/link";
import { NewsletterUnsubscribedSync } from "@/components/NewsletterSync";

export const metadata: Metadata = {
  title: "Unsubscribed — Livin In The Art",
  description: "You have been unsubscribed from Livin In The Art releases.",
};

export default function NewsletterUnsubscribedPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6 py-20 bg-[#FAF9F7]">
      <NewsletterUnsubscribedSync />
      <div className="w-full max-w-lg bg-white border border-[#E5E5E5] p-8 sm:p-12 text-center shadow-sm">
        <h1
          className="font-cormorant text-3xl sm:text-4xl font-normal text-[#111111] tracking-tight mb-4"
          style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
        >
          You Have Been Unsubscribed
        </h1>
        <p className="text-[#555555] text-sm sm:text-base leading-relaxed mb-8">
          You will no longer receive monthly newsletter releases or studio updates from Livin In The Art. If this was a mistake, you can re-subscribe at any time from our homepage.
        </p>
        <div className="flex justify-center">
          <Link href="/" className="btn-solid">
            Return to Gallery &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

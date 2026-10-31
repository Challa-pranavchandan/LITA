import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Newsletter Subscription Confirmed — Livin In The Art",
  description: "Your newsletter subscription has been confirmed.",
};

export default async function NewsletterConfirmedPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await props.searchParams;

  const isInvalid = error === "invalid" || error === "missing_token";

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6 py-20 bg-[#FAF9F7]">
      <div className="w-full max-w-lg bg-white border border-[#E5E5E5] p-8 sm:p-12 text-center shadow-sm">
        {isInvalid ? (
          <>
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-50 text-amber-700 mb-6 text-xl">
              !
            </div>
            <h1 className="text-3xl font-serif text-[#111111] tracking-tight mb-4">
              Link Expired or Invalid
            </h1>
            <p className="text-[#555555] text-sm sm:text-base leading-relaxed mb-8">
              This confirmation link is either invalid or has already been used. If you have not yet confirmed, you can submit your email again below or explore our current exhibitions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/" className="btn-solid">
                Return to Gallery
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 mb-6 text-xl">
              ✓
            </div>
            <h1 className="text-3xl font-serif text-[#111111] tracking-tight mb-4">
              Subscription Confirmed
            </h1>
            <p className="text-[#555555] text-sm sm:text-base leading-relaxed mb-8">
              Thank you for subscribing to Livin In The Art. You will now receive our curated editorial releases, exhibition previews, and studio journal reflections.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/artworks" className="btn-solid">
                Explore Artworks
              </Link>
              <Link href="/journal" className="btn-ghost">
                Read Studio Journal
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

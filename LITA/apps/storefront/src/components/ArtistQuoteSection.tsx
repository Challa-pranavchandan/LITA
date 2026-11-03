import React from "react";

export function ArtistQuoteSection({
  quote,
  artist,
}: {
  quote: string;
  artist: string;
}) {
  if (!quote) return null;

  return (
    <section className="w-full border-t border-[#E5E5E5] mt-20 md:mt-28 pt-16 pb-20 md:pt-24 md:pb-28">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <blockquote className="font-serif text-2xl sm:text-3xl md:text-[38px] font-normal text-[#2A2E33] leading-snug tracking-tight">
          &ldquo;{quote}&rdquo;
        </blockquote>
        <cite className="block font-serif italic text-base sm:text-lg text-[#555A60] mt-8 tracking-wide not-italic-fallback">
          {artist}
        </cite>
      </div>
    </section>
  );
}

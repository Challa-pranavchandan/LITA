import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Us | Livinin The Art",
  description:
    "Livinin The Art is an art gallery and studio where you can discover original artwork and limited edition prints crafted with passion and purpose.",
};

const calloutSections = [
  {
    title: (
      <>
        Every <em className="italic font-normal">artist</em> has a story to tell. Our roster highlights artists with diverse perspectives and unique practices.
      </>
    ),
    ctaText: "Meet our artists",
    ctaHref: "/artworks",
    imageSrc: "/about/artist-dan-covert.jpg",
    imageAlt: "Artist standing next to sculptural artworks in the studio",
  },
  {
    title: (
      <>
        Our expert <em className="italic font-normal">art advisors</em> thoughtfully select artwork options for your project and personally coordinate your order, free of charge.
      </>
    ),
    ctaText: "Meet your advisor",
    ctaHref: "/commissions",
    imageSrc: "/about/advisor-white-gloves.jpg",
    imageAlt: "Art advisor in white gloves handling an abstract art piece",
  },
  {
    title: (
      <>
        We feature original <em className="italic font-normal">artwork</em> and limited edition prints so every piece is unique.
      </>
    ),
    ctaText: "Discover artwork",
    ctaHref: "/artworks",
    imageSrc: "/about/original-artwork-perrote.jpg",
    imageAlt: "Artist hand-painting an original botanical work on canvas",
  },
  {
    title: (
      <>
        Visit our <em className="italic font-normal">gallery</em> to experience our collections in person or meet with an art advisor for a private viewing.
      </>
    ),
    ctaText: "Visit Us",
    ctaHref: "/contact",
    imageSrc: "/about/gallery-space.jpg",
    imageAlt: "Contemporary art gallery and exhibition room",
  },
];

export default function AboutPage() {
  return (
    <div className="w-full bg-white text-[#232629]">
      {/* ── Top Hero Header ── */}
      <header className="w-full border-b border-[#E5E7EB]">
        {/* Title area */}
        <div className="mx-auto max-w-4xl px-6 pt-14 pb-8 sm:pt-20 sm:pb-12 text-center">
          <span className="block pb-3 sm:pb-4 text-[11px] sm:text-xs font-sans font-medium uppercase tracking-[0.25em] text-[#5C6168]">
            ABOUT US
          </span>
          <h1
            className="font-cormorant text-4xl sm:text-5xl md:text-6xl lg:text-[64px] font-normal text-[#232629] leading-[1.14] tracking-tight"
            style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
          >
            Expertly curated, entirely unique
          </h1>
        </div>

        {/* Hero Banner Image */}
        <div className="w-full px-4 sm:px-8 lg:px-12 pb-8 sm:pb-12 lg:pb-16 max-w-[1480px] mx-auto">
          <div className="relative w-full aspect-[16/9] sm:aspect-[16/9] md:aspect-[21/10] lg:aspect-[16/9] overflow-hidden bg-[#F4F4F4]">
            <Image
              src="/about/hero-curated.jpg"
              alt="Art gallery founder standing in the curated gallery space"
              fill
              priority
              quality={90}
              sizes="(max-width: 1480px) 100vw, 1480px"
              className="object-cover object-center"
            />
          </div>
        </div>
      </header>

      {/* ── Two-Column Editorial Callouts ── */}
      <section aria-label="About Livinin The Art Features" className="w-full">
        {calloutSections.map((section, idx) => (
          <div
            key={idx}
            className="w-full border-b border-[#E5E7EB]"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 w-full max-w-[1480px] mx-auto">
              {/* Text Column (Left on desktop) */}
              <div className="flex flex-col items-center justify-center text-center p-8 sm:p-14 md:p-16 lg:p-20 xl:p-24 border-b lg:border-b-0 lg:border-r border-[#E5E7EB]">
                <div className="max-w-[540px]">
                  <h2
                    className="font-cormorant text-2xl sm:text-3xl md:text-[34px] lg:text-[36px] font-normal leading-[1.32] text-[#232629]"
                    style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
                  >
                    {section.title}
                  </h2>
                </div>

                <div className="mt-7 sm:mt-9">
                  <Link
                    href={section.ctaHref}
                    className="inline-block text-xs sm:text-[13px] font-sans font-normal tracking-wide text-[#232629] underline underline-offset-[5px] decoration-1 decoration-[#232629] hover:opacity-65 transition-opacity"
                  >
                    {section.ctaText}
                  </Link>
                </div>
              </div>

              {/* Image Column (Right on desktop) */}
              <div className="flex items-center justify-center p-6 sm:p-10 md:p-12 lg:p-16 bg-white">
                <div className="relative w-full aspect-square max-w-[540px] overflow-hidden bg-[#F5F6F4]">
                  <Image
                    src={section.imageSrc}
                    alt={section.imageAlt}
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover object-center"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* ── Press & Philosophy Callout Banner ── */}
      <section className="w-full bg-[#FAF9F6] py-20 sm:py-24 px-6 sm:px-12 text-center border-b border-[#E5E7EB]">
        <div className="max-w-2xl mx-auto">
          <p
            className="font-cormorant text-2xl sm:text-3xl md:text-4xl font-normal italic text-[#232629] leading-relaxed"
            style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
          >
            &ldquo;The only thing that matters is that your artwork brings warmth, joy, and inspiration into your everyday space.&rdquo;
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/artworks"
              className="inline-flex items-center justify-center border border-[#232629] bg-[#232629] text-white px-7 py-3 text-xs sm:text-sm font-medium tracking-wide hover:bg-black transition-colors"
            >
              Explore Artworks
            </Link>
            <Link
              href="/commissions"
              className="inline-flex items-center justify-center border border-[#232629] bg-transparent text-[#232629] px-7 py-3 text-xs sm:text-sm font-medium tracking-wide hover:bg-[#232629] hover:text-white transition-colors"
            >
              Request Custom Work
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

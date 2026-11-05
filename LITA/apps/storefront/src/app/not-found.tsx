import Link from "next/link";

export default function NotFound() {
  return (
    <div className="w-full bg-white text-[#232629] min-h-[65vh] flex items-center justify-center py-20 px-6">
      <div className="max-w-xl mx-auto text-center">
        <span className="block pb-3 text-xs font-sans font-medium uppercase tracking-[0.25em] text-[#5C6168]">
          404 &middot; Gallery Directory
        </span>
        <h1
          className="font-cormorant text-4xl sm:text-5xl md:text-6xl font-normal text-[#232629] leading-tight"
          style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
        >
          Page Not Found
        </h1>
        <p className="mt-4 text-sm sm:text-base text-[#5C6168] leading-relaxed max-w-md mx-auto mb-8">
          The artwork or exhibition you are looking for may have concluded, or the piece may have joined a private collection.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/artworks" className="btn-solid">
            Explore All Artworks &rarr;
          </Link>
          <Link href="/" className="btn-line">
            Return to Gallery
          </Link>
        </div>
      </div>
    </div>
  );
}

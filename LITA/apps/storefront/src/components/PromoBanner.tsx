import Link from "next/link";

export function PromoBanner({
  message = "Five new artists, one-of-a-kind works. Discover our Fall",
  linkText = "Focus Collection",
  linkHref = "/collections",
}: {
  message?: string;
  linkText?: string;
  linkHref?: string;
}) {
  return (
    <div
      role="banner"
      className="w-full bg-[#5f2f3c] text-white text-[12px] md:text-[13px] py-2 px-4 text-center tracking-wide font-light flex items-center justify-center transition-colors"
    >
      <p className="inline-flex flex-wrap items-center justify-center gap-1">
        <span>{message}</span>
        {linkText && (
          <Link
            href={linkHref}
            className="underline underline-offset-2 hover:opacity-85 transition-opacity font-normal"
          >
            {linkText}
          </Link>
        )}
        <span>.</span>
      </p>
    </div>
  );
}

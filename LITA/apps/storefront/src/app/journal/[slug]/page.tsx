import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { getJournalPost } from "@/lib/data/journal";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getJournalPost(slug);

  if (!post) {
    return { title: "Post Not Found | Livinin The Art" };
  }

  return {
    title: `${post.title} | The Journal | Livinin The Art`,
    description: post.excerpt || undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt || undefined,
      images: post.cover_image_url ? [{ url: post.cover_image_url }] : [],
    },
  };
}

export const revalidate = 60;

export default async function JournalPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getJournalPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <article className="w-full bg-white text-[#232629]">
      {/* ── Breadcrumb / Header Bar ── */}
      <div className="border-b border-[#E5E7EB]">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between text-xs tracking-wider uppercase text-[#888888] font-sans">
          <Link
            href="/journal"
            className="hover:text-black transition-colors flex items-center gap-1.5"
          >
            <span>&larr;</span> Back to Journal
          </Link>
          {post.published_at && (
            <time dateTime={post.published_at}>
              {new Date(post.published_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </time>
          )}
        </div>
      </div>

      {/* ── Article Header ── */}
      <header className="max-w-3xl mx-auto px-6 pt-12 sm:pt-16 pb-8 text-center">
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-[11px] uppercase tracking-[0.2em] font-medium text-[#777777] bg-[#F5F6F4] px-3 py-1 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <h1
          className="font-cormorant text-3xl sm:text-5xl md:text-6xl font-normal text-[#232629] leading-[1.18] mb-6"
          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
        >
          {post.title}
        </h1>

        {post.excerpt && (
          <p className="text-lg sm:text-xl text-[#5C6168] leading-relaxed font-serif italic max-w-2xl mx-auto">
            {post.excerpt}
          </p>
        )}
      </header>

      {/* ── Cover Image (if present) ── */}
      {post.cover_image_url && (
        <div className="max-w-5xl mx-auto px-4 sm:px-8 mb-12 sm:mb-16">
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#F5F6F4]">
            <Image
              src={post.cover_image_url}
              alt={post.title}
              fill
              priority
              sizes="(min-width: 1280px) 1024px, 100vw"
              className="object-cover object-center"
            />
          </div>
        </div>
      )}

      {/* ── Article Body (Markdown) ── */}
      <section className="max-w-3xl mx-auto px-6 pb-20">
        <div className="prose-journal text-[#232629] text-[17px] leading-[1.8] font-serif space-y-6">
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h2
                  className="font-cormorant text-3xl sm:text-4xl font-normal text-[#232629] mt-10 mb-4 pt-4 border-t border-[#EAEAEA]"
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                >
                  {children}
                </h2>
              ),
              h2: ({ children }) => (
                <h2
                  className="font-cormorant text-2xl sm:text-3xl font-normal text-[#232629] mt-8 mb-4"
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                >
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3
                  className="font-cormorant text-xl sm:text-2xl font-medium text-[#232629] mt-6 mb-3"
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                >
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="text-[#333333] leading-[1.85] text-base sm:text-[17px]">
                  {children}
                </p>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-[#232629] pl-6 my-8 italic text-lg sm:text-xl text-[#444444] font-serif">
                  {children}
                </blockquote>
              ),
              ul: ({ children }) => (
                <ul className="list-disc pl-6 space-y-2 text-[#333333]">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-6 space-y-2 text-[#333333]">{children}</ol>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  className="text-[#232629] underline underline-offset-4 hover:text-indigo-ink transition-colors"
                >
                  {children}
                </a>
              ),
              img: ({ src, alt }) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  className="w-full my-8 object-cover rounded-sm"
                  alt={alt || "Article illustration"}
                />
              ),
            }}
          >
            {post.content}
          </ReactMarkdown>
        </div>

        {/* ── Footer Author / Studio Signoff ── */}
        <div className="mt-16 pt-8 border-t border-[#E5E7EB] flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#888888] font-sans">
              Published by
            </p>
            <p
              className="font-cormorant text-xl text-[#232629]"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Livin In The Art Gallery &amp; Studio
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/journal"
              className="border border-[#232629] px-5 py-2 text-xs font-sans uppercase tracking-wider text-[#232629] hover:bg-[#232629] hover:text-white transition-colors"
            >
              All Stories
            </Link>
            <Link
              href="/artworks"
              className="bg-[#232629] text-white px-5 py-2 text-xs font-sans uppercase tracking-wider hover:bg-black transition-colors"
            >
              View Artworks
            </Link>
          </div>
        </div>
      </section>
    </article>
  );
}

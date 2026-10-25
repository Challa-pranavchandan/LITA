import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { listJournalPosts } from "@/lib/data/journal";

export const metadata: Metadata = {
  title: "The Journal | Livinin The Art",
  description:
    "Stories from the studio, artist interviews, and insights into handcrafted contemporary art from Livin in the Art.",
};

export const revalidate = 60;

export default async function JournalPage() {
  const posts = await listJournalPosts();

  const featuredPost = posts[0];
  const gridPosts = posts.slice(1);

  return (
    <div className="w-full bg-white text-[#232629]">
      {/* ── Page Header ── */}
      <header className="border-b border-[#E5E7EB]">
        <div className="max-w-4xl mx-auto px-6 pt-16 pb-12 sm:pt-20 sm:pb-16 text-center">
          <span className="block pb-3 text-xs font-sans font-medium uppercase tracking-[0.25em] text-[#5C6168]">
            THE JOURNAL
          </span>
          <h1
            className="font-cormorant text-4xl sm:text-5xl md:text-6xl font-normal text-[#232629] leading-[1.15]"
            style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
          >
            Stories from the Studio &amp; Gallery
          </h1>
          <p className="mt-4 text-base sm:text-lg text-[#5C6168] max-w-xl mx-auto leading-relaxed">
            Conversations with artists, exhibition notes, and reflections on living with handcrafted art.
          </p>
        </div>
      </header>

      {/* ── Content Area ── */}
      <main className="max-w-[1480px] mx-auto px-6 sm:px-10 lg:px-12 py-12 sm:py-16">
        {posts.length === 0 ? (
          <div className="text-center py-24 max-w-md mx-auto">
            <h2
              className="font-cormorant text-3xl font-normal text-[#232629] mb-3"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Coming Soon
            </h2>
            <p className="text-sm text-[#5C6168] leading-relaxed mb-8">
              We are currently drafting new stories and artist dispatches. Check back soon or visit the Medusa Admin Dashboard to publish your first post.
            </p>
            <Link
              href="/artworks"
              className="inline-flex items-center justify-center border border-[#232629] bg-[#232629] text-white px-7 py-3 text-xs sm:text-sm font-medium tracking-wide hover:bg-black transition-colors"
            >
              Explore Artworks
            </Link>
          </div>
        ) : (
          <>
            {/* Featured Hero Story */}
            {featuredPost && (
              <section className="mb-16 border-b border-[#E5E7EB] pb-16">
                <Link
                  href={`/journal/${featuredPost.slug}`}
                  className="group grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center"
                >
                  <div className="lg:col-span-7 relative aspect-[16/10] sm:aspect-[16/9] w-full overflow-hidden bg-[#F5F6F4]">
                    {featuredPost.cover_image_url ? (
                      <Image
                        src={featuredPost.cover_image_url}
                        alt={featuredPost.title}
                        fill
                        priority
                        sizes="(min-width: 1024px) 60vw, 100vw"
                        className="object-cover object-center group-hover:scale-[1.02] transition-transform duration-500 ease-out"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-[#EFEFEF] flex items-center justify-center text-[#999999] text-sm uppercase tracking-widest font-sans">
                        Livinin The Art Journal
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-5 flex flex-col justify-center">
                    <div className="flex items-center gap-3 text-xs tracking-wider uppercase text-[#888888] mb-3 font-sans">
                      {featuredPost.tags && featuredPost.tags.length > 0 && (
                        <span>{featuredPost.tags[0]}</span>
                      )}
                      {featuredPost.tags && featuredPost.tags.length > 0 && featuredPost.published_at && (
                        <span>•</span>
                      )}
                      {featuredPost.published_at && (
                        <time dateTime={featuredPost.published_at}>
                          {new Date(featuredPost.published_at).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </time>
                      )}
                    </div>

                    <h2
                      className="font-cormorant text-3xl sm:text-4xl lg:text-[42px] font-normal text-[#232629] group-hover:text-indigo-ink transition-colors leading-[1.2] mb-4"
                      style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                    >
                      {featuredPost.title}
                    </h2>

                    {featuredPost.excerpt && (
                      <p className="text-sm sm:text-base text-[#5C6168] leading-relaxed mb-6 line-clamp-3">
                        {featuredPost.excerpt}
                      </p>
                    )}

                    <div>
                      <span className="inline-block text-xs uppercase tracking-[0.15em] font-medium text-[#232629] group-hover:text-indigo-ink border-b border-[#232629] pb-0.5 transition-colors">
                        Read Story &rarr;
                      </span>
                    </div>
                  </div>
                </Link>
              </section>
            )}

            {/* Grid Stories */}
            {gridPosts.length > 0 && (
              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
                {gridPosts.map((post) => (
                  <article key={post.id} className="group flex flex-col">
                    <Link
                      href={`/journal/${post.slug}`}
                      className="relative aspect-[16/10] w-full overflow-hidden bg-[#F5F6F4] mb-5 block"
                    >
                      {post.cover_image_url ? (
                        <Image
                          src={post.cover_image_url}
                          alt={post.title}
                          fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                          className="object-cover object-center group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-[#EFEFEF] flex items-center justify-center text-[#999999] text-xs uppercase tracking-widest font-sans">
                          Livin In The Art
                        </div>
                      )}
                    </Link>

                    <div className="flex items-center gap-2 text-xs tracking-wider uppercase text-[#888888] mb-2 font-sans">
                      {post.tags && post.tags.length > 0 && (
                        <span>{post.tags[0]}</span>
                      )}
                      {post.tags && post.tags.length > 0 && post.published_at && (
                        <span>•</span>
                      )}
                      {post.published_at && (
                        <time dateTime={post.published_at}>
                          {new Date(post.published_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </time>
                      )}
                    </div>

                    <h3
                      className="font-cormorant text-2xl font-normal text-[#232629] group-hover:text-indigo-ink transition-colors leading-snug mb-2"
                      style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                    >
                      <Link href={`/journal/${post.slug}`}>
                        {post.title}
                      </Link>
                    </h3>

                    {post.excerpt && (
                      <p className="text-sm text-[#5C6168] leading-relaxed line-clamp-2 mb-4">
                        {post.excerpt}
                      </p>
                    )}

                    <div className="mt-auto pt-2">
                      <Link
                        href={`/journal/${post.slug}`}
                        className="text-xs uppercase tracking-[0.15em] font-medium text-[#232629] hover:text-indigo-ink border-b border-[#232629] pb-0.5 inline-block transition-colors"
                      >
                        Read Story &rarr;
                      </Link>
                    </div>
                  </article>
                ))}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

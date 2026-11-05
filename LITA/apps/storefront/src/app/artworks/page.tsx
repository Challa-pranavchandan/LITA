import type { Metadata } from "next";
import { listArtworks, listCategories, listCollections, type SortKey } from "@/lib/data/catalog";
import { ArtworkGrid } from "@/components/ArtworkGrid";
import { BrowseFilters } from "@/components/BrowseFilters";
import { Pagination } from "@/components/Pagination";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Original Artwork Catalog | Livin In The Art",
  description: "Browse the curated collection of original contemporary paintings and fine artwork at Livin In The Art.",
};

type SearchParams = {
  q?: string;
  category?: string;
  collection?: string;
  min?: string;
  max?: string;
  sort?: string;
  page?: string;
};

export default async function ArtworksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const num = (v?: string) => (v && !Number.isNaN(Number(v)) ? Number(v) : undefined);

  const [result, categories, collections] = await Promise.all([
    listArtworks({
      q: sp.q,
      category: sp.category,
      collection: sp.collection,
      min: num(sp.min),
      max: num(sp.max),
      sort: sp.sort as SortKey | undefined,
      page: num(sp.page),
    }),
    listCategories(),
    listCollections(),
  ]);

  const { page: _page, ...filterParams } = sp;

  return (
    <div className="page py-10 md:py-14">
      <header className="mb-10 border-b border-[#E5E7EB] pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="block text-xs font-sans font-medium uppercase tracking-[0.25em] text-[#5C6168] mb-2">
              Curated Catalog
            </span>
            <h1
              className="font-cormorant text-4xl sm:text-5xl md:text-[52px] font-normal text-ink leading-none tracking-tight"
              style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
            >
              {sp.q ? `Results for "${sp.q}"` : "All Original Artwork"}
            </h1>
          </div>
          <p className="text-sm font-sans uppercase tracking-wider text-graphite tabular-nums pb-1">
            {result.total} {result.total === 1 ? "piece" : "pieces"} on view
          </p>
        </div>
      </header>
      <div className="grid gap-10 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-14">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <BrowseFilters params={filterParams} categories={categories} collections={collections} />
        </aside>
        <div>
          <ArtworkGrid products={result.products} />
          <Pagination base="/artworks" params={filterParams} page={result.page} pageCount={result.pageCount} />
        </div>
      </div>
    </div>
  );
}

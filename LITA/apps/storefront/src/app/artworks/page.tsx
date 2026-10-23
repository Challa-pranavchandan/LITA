import type { Metadata } from "next";
import { listArtworks, listCategories, listCollections, type SortKey } from "@/lib/data/catalog";
import { ArtworkGrid } from "@/components/ArtworkGrid";
import { BrowseFilters } from "@/components/BrowseFilters";
import { Pagination } from "@/components/Pagination";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "All artwork" };

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
    <div className="page py-10">
      <header className="mb-10 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-3xl">
          {sp.q ? `Results for "${sp.q}"` : "All artwork"}
        </h1>
        <p className="text-graphite tabular-nums">
          {result.total} {result.total === 1 ? "work" : "works"}
        </p>
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

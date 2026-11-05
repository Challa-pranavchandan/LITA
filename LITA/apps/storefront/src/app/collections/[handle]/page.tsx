import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCollection, listArtworks, listCategories, type SortKey } from "@/lib/data/catalog";
import { ArtworkGrid } from "@/components/ArtworkGrid";
import { BrowseFilters } from "@/components/BrowseFilters";
import { Pagination } from "@/components/Pagination";

export const revalidate = 60;

type Props = {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ category?: string; min?: string; max?: string; sort?: string; page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const c = await getCollection(handle);
  if (!c) return { title: "Collection | Livin In The Art" };
  return {
    title: `${c.title} — Curated Collection | Livin In The Art`,
    description: `Explore the ${c.title} fine art collection curated by Livin In The Art.`,
  };
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const { handle } = await params;
  const sp = await searchParams;
  const collection = await getCollection(handle);
  if (!collection) notFound();

  const num = (v?: string) => (v && !Number.isNaN(Number(v)) ? Number(v) : undefined);
  const [result, categories] = await Promise.all([
    listArtworks({
      collection: handle,
      category: sp.category,
      min: num(sp.min),
      max: num(sp.max),
      sort: sp.sort as SortKey | undefined,
      page: num(sp.page),
    }),
    listCategories(),
  ]);

  const { page: _p, ...filterParams } = sp;
  const base = `/collections/${handle}`;

  return (
    <div className="page py-10 md:py-14">
      <header className="mb-10 border-b border-[#E5E7EB] pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="block text-xs font-sans font-medium uppercase tracking-[0.25em] text-[#5C6168] mb-2">
              Curated Collection
            </span>
            <h1
              className="font-cormorant text-4xl sm:text-5xl md:text-[52px] font-normal text-ink leading-none tracking-tight"
              style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
            >
              {collection.title}
            </h1>
          </div>
          <p className="text-sm font-sans uppercase tracking-wider text-graphite tabular-nums pb-1">
            {result.total} {result.total === 1 ? "piece" : "pieces"} in series
          </p>
        </div>
      </header>
      <div className="grid gap-10 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-14">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <BrowseFilters base={base} params={filterParams} categories={categories} collections={[]} hideCollections />
        </aside>
        <div>
          <ArtworkGrid products={result.products} emptyMessage="This collection has no works that match the selected filter." />
          <Pagination base={base} params={filterParams} page={result.page} pageCount={result.pageCount} />
        </div>
      </div>
    </div>
  );
}

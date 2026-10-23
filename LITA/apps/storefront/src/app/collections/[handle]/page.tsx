import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCollection, listArtworks, listCategories, type SortKey } from "@/lib/data/catalog";
import { ArtworkGrid } from "@/components/ArtworkGrid";
import { BrowseFilters } from "@/components/BrowseFilters";
import { Pagination } from "@/components/Pagination";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ category?: string; min?: string; max?: string; sort?: string; page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const c = await getCollection(handle);
  return { title: c?.title ?? "Collection" };
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
    <div className="page py-10">
      <header className="mb-10">
        <h1 className="text-3xl">{collection.title}</h1>
        <p className="mt-1 text-graphite tabular-nums">
          {result.total} {result.total === 1 ? "work" : "works"}
        </p>
      </header>
      <div className="grid gap-10 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-14">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <BrowseFilters base={base} params={filterParams} categories={categories} collections={[]} hideCollections />
        </aside>
        <div>
          <ArtworkGrid products={result.products} emptyMessage="This collection has no works that match." />
          <Pagination base={base} params={filterParams} page={result.page} pageCount={result.pageCount} />
        </div>
      </div>
    </div>
  );
}

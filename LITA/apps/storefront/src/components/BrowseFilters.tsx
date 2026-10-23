import Link from "next/link";
import type { HttpTypes } from "@medusajs/types";
import type { SortKey } from "@/lib/data/catalog";

type Params = {
  q?: string;
  category?: string;
  collection?: string;
  min?: string;
  max?: string;
  sort?: string;
};

const PRICE_BANDS = [
  { label: "Under ₹2,000", max: "2000" },
  { label: "₹2,000 to ₹5,000", min: "2000", max: "5000" },
  { label: "₹5,000 to ₹15,000", min: "5000", max: "15000" },
  { label: "Over ₹15,000", min: "15000" },
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "price-asc", label: "Price, low to high" },
  { key: "price-desc", label: "Price, high to low" },
];

function href(base: string, current: Params, patch: Partial<Params>) {
  const next: Record<string, string | undefined> = { ...current, ...patch };
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(next)) if (v) qs.set(k, v);
  const s = qs.toString();
  return s ? `${base}?${s}` : base;
}

function Option({
  to,
  active,
  children,
}: {
  to: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={to}
        aria-current={active ? "true" : undefined}
        className={`block py-1 text-[15px] ${active ? "text-ink underline decoration-ink underline-offset-4" : "text-graphite hover:text-ink"}`}
      >
        {children}
      </Link>
    </li>
  );
}

export function BrowseFilters({
  base = "/artworks",
  params,
  categories,
  collections,
  hideCollections = false,
}: {
  base?: string;
  params: Params;
  categories: HttpTypes.StoreProductCategory[];
  collections: HttpTypes.StoreCollection[];
  hideCollections?: boolean;
}) {
  const sort = params.sort ?? "newest";
  const activeCount = [params.category, params.collection, params.min, params.max, params.q].filter(Boolean).length;

  return (
    <details className="group border-b border-mist pb-6 lg:border-0 lg:pb-0" open>
      <summary className="flex cursor-pointer list-none items-center justify-between py-2 text-[15px] lg:hidden">
        <span>Filter and sort{activeCount > 0 && ` (${activeCount})`}</span>
        <span className="text-graphite group-open:hidden">Show</span>
        <span className="hidden text-graphite group-open:inline">Hide</span>
      </summary>
      <div className="space-y-7 pt-4 lg:pt-0">
        {activeCount > 0 && (
          <Link href={base} className="link text-[15px]">Clear all filters</Link>
        )}
        {categories.length > 0 && (
          <fieldset>
            <legend className="mb-1.5 text-sm text-graphite">Medium</legend>
            <ul>
              <Option to={href(base, params, { category: undefined })} active={!params.category}>All</Option>
              {categories.map((c) => (
                <Option key={c.id} to={href(base, params, { category: c.handle })} active={params.category === c.handle}>
                  {c.name}
                </Option>
              ))}
            </ul>
          </fieldset>
        )}
        {!hideCollections && collections.length > 0 && (
          <fieldset>
            <legend className="mb-1.5 text-sm text-graphite">Collection</legend>
            <ul>
              <Option to={href(base, params, { collection: undefined })} active={!params.collection}>All</Option>
              {collections.map((c) => (
                <Option key={c.id} to={href(base, params, { collection: c.handle })} active={params.collection === c.handle}>
                  {c.title}
                </Option>
              ))}
            </ul>
          </fieldset>
        )}
        <fieldset>
          <legend className="mb-1.5 text-sm text-graphite">Price</legend>
          <ul>
            <Option to={href(base, params, { min: undefined, max: undefined })} active={!params.min && !params.max}>Any</Option>
            {PRICE_BANDS.map((b) => (
              <Option
                key={b.label}
                to={href(base, params, { min: b.min, max: b.max })}
                active={params.min === b.min && params.max === b.max}
              >
                {b.label}
              </Option>
            ))}
          </ul>
        </fieldset>
        <fieldset>
          <legend className="mb-1.5 text-sm text-graphite">Sort by</legend>
          <ul>
            {SORTS.map((s) => (
              <Option key={s.key} to={href(base, params, { sort: s.key })} active={sort === s.key}>
                {s.label}
              </Option>
            ))}
          </ul>
        </fieldset>
      </div>
    </details>
  );
}

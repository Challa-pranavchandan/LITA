import Link from "next/link";

export function Pagination({
  base,
  params,
  page,
  pageCount,
}: {
  base: string;
  params: Record<string, string | undefined>;
  page: number;
  pageCount: number;
}) {
  if (pageCount <= 1) return null;
  const to = (p: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...params, page: p > 1 ? String(p) : undefined })) {
      if (v) qs.set(k, v);
    }
    const s = qs.toString();
    return s ? `${base}?${s}` : base;
  };
  return (
    <nav aria-label="Pages" className="mt-12 flex items-center justify-center gap-6 text-[15px]">
      {page > 1 ? <Link href={to(page - 1)} className="link">Previous</Link> : <span className="text-dust">Previous</span>}
      <span className="tabular-nums text-graphite">Page {page} of {pageCount}</span>
      {page < pageCount ? <Link href={to(page + 1)} className="link">Next</Link> : <span className="text-dust">Next</span>}
    </nav>
  );
}

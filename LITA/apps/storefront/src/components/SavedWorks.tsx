"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { HttpTypes } from "@medusajs/types";
import { useSaved } from "@/lib/saved";
import { fetchSavedProducts } from "@/app/saved/actions";
import { ArtworkGrid } from "@/components/ArtworkGrid";

export function SavedWorks() {
  const ids = useSaved();
  const key = ids.join(",");
  const [products, setProducts] = useState<HttpTypes.StoreProduct[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!ids.length) {
      setProducts([]);
      return;
    }
    fetchSavedProducts(ids).then((p) => !cancelled && setProducts(p));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (products === null) return <p className="text-graphite">Loading your saved works…</p>;

  if (!ids.length) {
    return (
      <div className="py-16">
        <p className="text-lg">You haven't saved any works yet.</p>
        <p className="mt-1 text-graphite">Select the heart on an artwork to keep it here.</p>
        <Link href="/artworks" className="btn-line mt-6">Browse artwork</Link>
      </div>
    );
  }

  return <ArtworkGrid products={products.filter((p) => ids.includes(p.id))} emptyMessage="Those works are no longer available." />;
}

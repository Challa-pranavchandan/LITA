"use client";

import { useState, useTransition } from "react";
import { addToCart } from "@/lib/data/cart";
import { CART_OPEN_EVENT } from "@/components/CartDrawer";
import { formatMoney } from "@/lib/format";

export type VariantOption = {
  id: string;
  title: string;
  amount: number | null;
  currency: string | null;
  soldOut: boolean;
};

export function AddToCart({ variants }: { variants: VariantOption[] }) {
  const firstAvailable = variants.find((v) => !v.soldOut) ?? variants[0];
  const [selectedId, setSelectedId] = useState(firstAvailable?.id);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const selected = variants.find((v) => v.id === selectedId);
  const multiple = variants.length > 1;

  if (!selected) return null;

  function add() {
    setError(null);
    setAdded(false);
    startTransition(async () => {
      const res = await addToCart(selected!.id, 1);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setAdded(true);
      window.dispatchEvent(new Event(CART_OPEN_EVENT));
    });
  }

  return (
    <div>
      {multiple && (
        <fieldset className="mb-5">
          <legend className="mb-2 text-sm text-graphite">Choose an option</legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <label
                key={v.id}
                className={`cursor-pointer border px-4 py-2.5 text-[15px] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-indigo-ink ${
                  v.id === selectedId ? "border-ink bg-ink text-paper" : "border-dust hover:border-ink"
                } ${v.soldOut ? "opacity-50" : ""}`}
              >
                <input
                  type="radio"
                  name="variant"
                  value={v.id}
                  checked={v.id === selectedId}
                  onChange={() => setSelectedId(v.id)}
                  className="sr-only"
                />
                {v.title}
                {v.soldOut && " (sold out)"}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {selected.amount != null && (
        <p className="mb-4 text-2xl tabular-nums">
          {formatMoney(selected.amount, selected.currency)}
        </p>
      )}

      <button
        type="button"
        onClick={add}
        disabled={pending || selected.soldOut}
        className="btn-solid w-full"
      >
        {selected.soldOut ? "Sold out" : pending ? "Adding…" : "Add to bag"}
      </button>

      <p className="mt-3 min-h-5 text-sm" role="status" aria-live="polite">
        {error ? (
          <span role="alert" className="text-red-700">{error}</span>
        ) : added ? (
          <span className="text-graphite">Added to your bag.</span>
        ) : null}
      </p>
    </div>
  );
}

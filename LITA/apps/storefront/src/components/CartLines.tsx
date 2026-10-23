"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import type { HttpTypes } from "@medusajs/types";
import { formatMoney } from "@/lib/format";
import { applyPromoCode, removePromoCode, updateLineItem } from "@/lib/data/cart";

export function CartLines({
  cart,
  editable = true,
}: {
  cart: HttpTypes.StoreCart;
  editable?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const currency = cart.currency_code;

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Something went wrong.");
    });
  }

  return (
    <div>
      <ul className="divide-y divide-mist border-y border-mist">
        {(cart.items ?? []).map((item) => (
          <li key={item.id} className="flex gap-5 py-6">
            <Link href={`/artworks/${item.product_handle ?? ""}`} className="relative h-32 w-24 shrink-0 bg-mist">
              {item.thumbnail && <Image src={item.thumbnail} alt="" fill sizes="96px" className="object-cover" />}
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex justify-between gap-4">
                <Link href={`/artworks/${item.product_handle ?? ""}`} className="font-serif text-lg italic leading-snug hover:text-indigo-ink">
                  {item.product_title ?? item.title}
                </Link>
                <p className="tabular-nums">{formatMoney(item.total, currency)}</p>
              </div>
              {item.variant_title && item.variant_title !== "Default" && (
                <p className="text-sm text-graphite">{item.variant_title}</p>
              )}
              <p className="text-sm text-graphite tabular-nums">{formatMoney(item.unit_price, currency)} each</p>
              {editable && (
                <div className="mt-auto flex items-center gap-5 pt-4">
                  <div className="inline-flex items-center border border-dust">
                    <button type="button" disabled={pending} onClick={() => run(() => updateLineItem(item.id, item.quantity - 1))} className="h-9 w-9 hover:bg-mist" aria-label={`Decrease quantity of ${item.product_title}`}>−</button>
                    <span className="w-9 text-center tabular-nums" aria-live="polite">{item.quantity}</span>
                    <button type="button" disabled={pending} onClick={() => run(() => updateLineItem(item.id, item.quantity + 1))} className="h-9 w-9 hover:bg-mist" aria-label={`Increase quantity of ${item.product_title}`}>+</button>
                  </div>
                  <button type="button" disabled={pending} onClick={() => run(() => updateLineItem(item.id, 0))} className="link text-sm text-graphite">
                    Remove
                  </button>
                </div>
              )}
              {!editable && <p className="mt-auto pt-3 text-sm text-graphite">Quantity {item.quantity}</p>}
            </div>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}

export function PromoCode({ cart }: { cart: HttpTypes.StoreCart }) {
  const [code, setCode] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const applied = (cart.promotions ?? []).filter((p) => p.code);

  function apply(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await applyPromoCode(code);
      if (!res.ok) setError(res.error);
      else setCode("");
    });
  }

  return (
    <div>
      <form onSubmit={apply} className="flex gap-2">
        <label htmlFor="promo" className="sr-only">Discount code</label>
        <input id="promo" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Discount code" className="field" autoComplete="off" />
        <button type="submit" disabled={pending || !code.trim()} className="btn-line shrink-0">Apply</button>
      </form>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
      {applied.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {applied.map((p) => (
            <li key={p.id} className="flex items-center justify-between">
              <span>Code <strong className="font-medium">{p.code}</strong> applied</span>
              <button type="button" className="link text-graphite" onClick={() => startTransition(async () => { await removePromoCode(p.code!); })}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function OrderTotals({ cart }: { cart: HttpTypes.StoreCart | HttpTypes.StoreOrder }) {
  const c = cart.currency_code;
  const row = (label: string, value: number | null | undefined, strong = false) => (
    <div className={`flex justify-between ${strong ? "border-t border-mist pt-4 text-lg" : "text-[15px]"}`}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{value == null ? "—" : formatMoney(value, c)}</dd>
    </div>
  );
  const hasShipping = (cart.shipping_methods ?? []).length > 0;
  return (
    <dl className="space-y-2.5">
      {row("Subtotal", cart.item_subtotal ?? cart.subtotal)}
      {(cart.discount_total ?? 0) > 0 && row("Discount", -(cart.discount_total ?? 0))}
      <div className="flex justify-between text-[15px]">
        <dt>Shipping</dt>
        <dd className="tabular-nums">{hasShipping ? formatMoney(cart.shipping_total, c) : "Calculated next"}</dd>
      </div>
      {(cart.tax_total ?? 0) > 0 && row("Tax", cart.tax_total)}
      {row("Total", cart.total, true)}
    </dl>
  );
}

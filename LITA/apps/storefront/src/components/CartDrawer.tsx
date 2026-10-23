"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { HttpTypes } from "@medusajs/types";
import { formatMoney } from "@/lib/format";
import { updateLineItem } from "@/lib/data/cart";

import { CartIcon } from "@/components/livinIcons";

export const CART_OPEN_EVENT = "cart:open";

export function CartDrawer({
  cart,
  children,
  triggerClassName,
}: {
  cart: HttpTypes.StoreCart | null;
  children?: React.ReactNode;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const items = cart?.items ?? [];
  const count = items.reduce((n, i) => n + i.quantity, 0);
  const currency = cart?.currency_code;

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(CART_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(CART_OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close]);

  function change(lineId: string, qty: number) {
    setError(null);
    startTransition(async () => {
      const res = await updateLineItem(lineId, qty);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName || "relative inline-flex items-center justify-center p-1 text-[#222222] transition-opacity hover:opacity-60"}
        aria-label={`Open shopping cart, ${count} ${count === 1 ? "item" : "items"}`}
      >
        {children ? (
          children
        ) : (
          <>
            <CartIcon className="w-[21px] h-[20px]" />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#111111] px-1 text-[10px] font-semibold text-white tabular-nums">
                {count}
              </span>
            )}
          </>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Your bag">
          <div className="absolute inset-0 bg-ink/40" onClick={close} aria-hidden="true" />
          <div
            ref={panelRef}
            tabIndex={-1}
            className="absolute right-0 top-0 flex h-full w-full max-w-[440px] flex-col bg-paper shadow-2xl outline-none motion-safe:animate-[slidein_.22s_ease-out]"
          >
            <div className="flex items-center justify-between border-b border-mist px-6 py-5">
              <h2 className="text-lg">Your bag</h2>
              <button type="button" onClick={close} className="link text-[15px]">
                Close
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
                <p className="text-lg">Your bag is empty.</p>
                <Link href="/artworks" onClick={close} className="btn-line">
                  Browse artwork
                </Link>
              </div>
            ) : (
              <>
                <ul className="flex-1 divide-y divide-mist overflow-y-auto px-6">
                  {items.map((item) => (
                    <li key={item.id} className="flex gap-4 py-5">
                      <div className="relative h-24 w-20 shrink-0 bg-mist">
                        {item.thumbnail && (
                          <Image src={item.thumbnail} alt="" fill sizes="80px" className="object-cover" />
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <Link
                          href={`/artworks/${item.product_handle ?? ""}`}
                          onClick={close}
                          className="font-serif italic leading-snug hover:text-indigo-ink"
                        >
                          {item.product_title ?? item.title}
                        </Link>
                        {item.variant_title && item.variant_title !== "Default" && (
                          <p className="text-sm text-graphite">{item.variant_title}</p>
                        )}
                        <div className="mt-auto flex items-center justify-between pt-3">
                          <div className="inline-flex items-center border border-dust">
                            <button type="button" disabled={pending} onClick={() => change(item.id, item.quantity - 1)} className="h-8 w-8 hover:bg-mist" aria-label="Decrease quantity">
                              −
                            </button>
                            <span className="w-8 text-center text-[15px] tabular-nums" aria-live="polite">
                              {item.quantity}
                            </span>
                            <button type="button" disabled={pending} onClick={() => change(item.id, item.quantity + 1)} className="h-8 w-8 hover:bg-mist" aria-label="Increase quantity">
                              +
                            </button>
                          </div>
                          <p className="tabular-nums">{formatMoney(item.total, currency)}</p>
                        </div>
                        <button type="button" disabled={pending} onClick={() => change(item.id, 0)} className="link mt-2 self-start text-sm text-graphite">
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-mist px-6 py-5">
                  {error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}
                  <div className="flex justify-between text-[15px]">
                    <span>Subtotal</span>
                    <span className="tabular-nums">{formatMoney(cart?.item_subtotal ?? cart?.subtotal, currency)}</span>
                  </div>
                  <p className="mt-1 text-sm text-graphite">Shipping and taxes are calculated at checkout.</p>
                  <Link href="/checkout" onClick={close} className="btn-solid mt-4 w-full">
                    Go to checkout
                  </Link>
                  <Link href="/cart" onClick={close} className="link mt-3 block text-center text-sm">
                    View full bag
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

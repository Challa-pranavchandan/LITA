import type { HttpTypes } from "@medusajs/types";

export function formatMoney(
  amount: number | null | undefined,
  currency: string | null | undefined
): string {
  if (amount == null || !currency) return "";
  const code = currency.toUpperCase();
  return new Intl.NumberFormat(code === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency: code,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

/** Lowest calculated price across variants, in major currency units. */
export function lowestPrice(product: HttpTypes.StoreProduct): {
  amount: number;
  currency: string;
} | null {
  let best: { amount: number; currency: string } | null = null;
  for (const v of product.variants ?? []) {
    const p = v.calculated_price;
    if (p?.calculated_amount == null || !p.currency_code) continue;
    if (!best || p.calculated_amount < best.amount) {
      best = { amount: p.calculated_amount, currency: p.currency_code };
    }
  }
  return best;
}

export function isSoldOut(product: HttpTypes.StoreProduct): boolean {
  const variants = product.variants ?? [];
  if (!variants.length) return true;
  return variants.every(
    (v) =>
      v.manage_inventory &&
      !v.allow_backorder &&
      (v.inventory_quantity ?? 0) <= 0
  );
}

/** width / height ratio used to show each work at its true proportions. */
export function aspectOf(product: HttpTypes.StoreProduct): number {
  const w = Number(product.width);
  const h = Number(product.height);
  if (w > 0 && h > 0) return Math.min(Math.max(w / h, 0.5), 2);
  const meta = Number((product.metadata as Record<string, unknown> | null)?.aspect);
  if (meta > 0) return Math.min(Math.max(meta, 0.5), 2);
  return 4 / 5;
}

export function dimensionsOf(product: HttpTypes.StoreProduct): string | null {
  const meta = (product.metadata ?? {}) as Record<string, unknown>;
  if (typeof meta.dimensions === "string" && meta.dimensions) return meta.dimensions;
  const w = Number(product.width);
  const h = Number(product.height);
  if (w > 0 && h > 0) {
    const inch = (n: number) => (n / 2.54).toFixed(1).replace(/\.0$/, "");
    return `${w} × ${h} cm (${inch(w)} × ${inch(h)} in)`;
  }
  return null;
}

export function metaString(
  product: HttpTypes.StoreProduct,
  key: string
): string | null {
  const v = (product.metadata as Record<string, unknown> | null)?.[key];
  return typeof v === "string" && v ? v : null;
}

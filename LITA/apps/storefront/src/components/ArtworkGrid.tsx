import Image from "next/image";
import Link from "next/link";
import type { HttpTypes } from "@medusajs/types";
import {
  aspectOf,
  formatMoney,
  isSoldOut,
  lowestPrice,
  metaString,
} from "@/lib/format";
import { SaveButton } from "@/components/SaveButton";

export function ArtworkCard({
  product,
  priority = false,
}: {
  product: HttpTypes.StoreProduct;
  priority?: boolean;
}) {
  const price = lowestPrice(product);
  const sold = isSoldOut(product);
  const ratio = aspectOf(product);
  const medium = product.material || metaString(product, "medium");

  return (
    <article className="group relative mb-10 break-inside-avoid">
      <Link href={`/artworks/${product.handle}`} className="block">
        <div
          className="relative w-full overflow-hidden bg-mist"
          style={{ aspectRatio: String(ratio) }}
        >
          {product.thumbnail ? (
            <Image
              src={product.thumbnail}
              alt={product.title}
              fill
              sizes="(min-width:1024px) 25vw, (min-width:768px) 33vw, 50vw"
              priority={priority}
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.025]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-graphite">
              No image yet
            </div>
          )}
          {sold && (
            <span className="absolute left-3 top-3 bg-paper px-2.5 py-1 text-sm">
              Sold
            </span>
          )}
        </div>
        <h3 className="mt-3 font-serif text-[17px] font-normal italic leading-snug">
          {product.title}
        </h3>
        {medium && <p className="text-sm text-graphite">{medium}</p>}
        {price && !sold && (
          <p className="mt-0.5 text-[15px] tabular-nums">
            {formatMoney(price.amount, price.currency)}
          </p>
        )}
      </Link>
      <SaveButton
        productId={product.id}
        title={product.title}
        className="absolute right-3 top-3 bg-paper/90 p-2 backdrop-blur-sm"
      />
    </article>
  );
}

export function ArtworkGrid({
  products,
  emptyMessage = "No artworks match these filters yet.",
}: {
  products: HttpTypes.StoreProduct[];
  emptyMessage?: string;
}) {
  if (!products.length) {
    return (
      <div className="py-24 text-center">
        <p className="text-lg">{emptyMessage}</p>
        <Link href="/artworks" className="link mt-3 inline-block">
          See all artwork
        </Link>
      </div>
    );
  }
  return (
    <div className="columns-2 gap-x-5 md:columns-3 md:gap-x-7 lg:columns-4">
      {products.map((p, i) => (
        <ArtworkCard key={p.id} product={p} priority={i < 4} />
      ))}
    </div>
  );
}

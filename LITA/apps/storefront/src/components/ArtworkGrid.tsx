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
  const medium = product.material || metaString(product, "medium") || "Painting";
  const artist =
    metaString(product, "artist") ||
    metaString(product, "artist_name") ||
    product.subtitle ||
    "Studio Artist";

  return (
    <article className="group relative mb-10 break-inside-avoid">
      <Link href={`/artworks/${product.handle}`} className="block">
        <div
          className="relative w-full overflow-hidden bg-[#F7F7F6]"
          style={{ aspectRatio: String(ratio) }}
        >
          {product.thumbnail ? (
            <Image
              src={product.thumbnail}
              alt={product.title}
              fill
              sizes="(min-width:1024px) 25vw, (min-width:768px) 33vw, 50vw"
              priority={priority}
              className="object-contain p-4 transition-transform duration-500 ease-out group-hover:scale-[1.025] drop-shadow-[0_8px_16px_rgba(0,0,0,0.06)]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-graphite">
              No image yet
            </div>
          )}
          {sold && (
            <span className="absolute left-3 top-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 text-xs font-medium text-[#222222]">
              Sold
            </span>
          )}
        </div>

        {/* Card Metadata matching reference style */}
        <div className="pt-3 pb-1">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-sans text-[15px] font-normal text-[#222222] tracking-tight truncate group-hover:text-black">
              {product.title}
            </h3>
            {price && !sold && (
              <span className="font-sans text-[15px] font-normal text-[#222222] whitespace-nowrap tabular-nums">
                {formatMoney(price.amount, price.currency)}
              </span>
            )}
          </div>
          <p className="font-sans text-[13.5px] text-[#666666] font-normal mt-0.5 truncate">
            {artist}
          </p>
          {medium && (
            <p className="font-sans text-[13px] text-[#777777] font-normal mt-2.5">
              {medium}
            </p>
          )}
        </div>
      </Link>
      <SaveButton
        productId={product.id}
        title={product.title}
        className="absolute right-3 top-3 bg-white/80 p-2 backdrop-blur-sm hover:bg-white"
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

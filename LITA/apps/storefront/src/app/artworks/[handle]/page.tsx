import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, listRelated } from "@/lib/data/catalog";
import { dimensionsOf, isSoldOut, metaString } from "@/lib/format";
import { ProductGallery } from "@/components/ProductGallery";
import { AddToCart, type VariantOption } from "@/components/AddToCart";
import { SaveButton } from "@/components/SaveButton";
import { InquiryForm } from "@/components/InquiryForm";
import { ArtworkGrid } from "@/components/ArtworkGrid";

export const revalidate = 60;

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const product = await getProduct(handle);
  if (!product) return { title: "Artwork not found" };
  return {
    title: product.title,
    description: product.subtitle || product.description?.slice(0, 160) || undefined,
    openGraph: { images: product.thumbnail ? [product.thumbnail] : undefined },
  };
}

export default async function ArtworkPage({ params }: Props) {
  const { handle } = await params;
  const product = await getProduct(handle);
  if (!product) notFound();

  const related = await listRelated(product, 4);
  const sold = isSoldOut(product);

  const images = (product.images?.length
    ? product.images
    : product.thumbnail
      ? [{ id: "thumb", url: product.thumbnail }]
      : []
  ).map((i) => ({ id: i.id, url: i.url }));

  const variants: VariantOption[] = (product.variants ?? []).map((v) => ({
    id: v.id,
    title: v.title ?? "Default",
    amount: v.calculated_price?.calculated_amount ?? null,
    currency: v.calculated_price?.currency_code ?? null,
    soldOut:
      !!v.manage_inventory && !v.allow_backorder && (v.inventory_quantity ?? 0) <= 0,
  }));

  const medium = product.material || metaString(product, "medium");
  const year = metaString(product, "year");
  const edition = metaString(product, "edition");
  const framing = metaString(product, "framing");
  const dimensions = dimensionsOf(product);

  const facts: [string, string][] = [];
  if (medium) facts.push(["Medium", medium]);
  if (dimensions) facts.push(["Size", dimensions]);
  if (year) facts.push(["Year", year]);
  if (edition) facts.push(["Edition", edition]);
  if (framing) facts.push(["Framing", framing]);
  if (product.collection) facts.push(["Collection", product.collection.title]);

  return (
    <div className="page py-8 md:py-12">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-graphite">
        <Link href="/artworks" className="hover:text-ink">All artwork</Link>
        {product.categories?.[0] && (
          <>
            <span aria-hidden="true"> / </span>
            <Link href={`/artworks?category=${product.categories[0].handle}`} className="hover:text-ink">
              {product.categories[0].name}
            </Link>
          </>
        )}
      </nav>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-16">
        <ProductGallery images={images} title={product.title} />

        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="wall-label">
            <h1 className="font-serif text-3xl font-normal italic leading-tight md:text-4xl">
              {product.title}
            </h1>
            {product.subtitle && (
              <p className="mt-2 text-graphite">{product.subtitle}</p>
            )}
            {facts.length > 0 && (
              <dl className="mt-5 grid grid-cols-[88px_1fr] gap-y-1.5 text-[15px]">
                {facts.map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-graphite">{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <div className="mt-8">
            {variants.length > 0 ? (
              <AddToCart variants={variants} />
            ) : (
              <p className="text-graphite">This work isn&apos;t available to order right now.</p>
            )}
            <div className="mt-2 flex items-center gap-6">
              <SaveButton productId={product.id} title={product.title} withLabel />
              <a href="#inquire" className="link text-[15px]">
                {sold ? "Ask about similar work" : "Ask a question"}
              </a>
            </div>
          </div>

          {product.description && (
            <div className="prose-art mt-10 whitespace-pre-line">{product.description}</div>
          )}

          <p className="mt-10 border-t border-mist pt-6 text-[15px] text-graphite">
            Delivery times, packaging and returns are on the <Link href="/shipping" className="link">shipping and returns</Link> page.
          </p>
        </div>
      </div>

      <section id="inquire" className="mt-24 grid scroll-mt-24 gap-10 border-t border-mist pt-12 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 className="text-2xl">Ask about this work</h2>
          <p className="mt-2 max-w-sm text-graphite">
            Questions about size, framing, shipping to your country, or seeing it in a room? Send a message and the artist replies personally.
          </p>
        </div>
        <InquiryForm kind="artwork" artwork={product.title} placeholder={`Hello, I'm interested in "${product.title}"…`} />
      </section>

      {related.length > 0 && (
        <section className="mt-24">
          <h2 className="mb-8 text-2xl">More from the studio</h2>
          <ArtworkGrid products={related} />
        </section>
      )}
    </div>
  );
}

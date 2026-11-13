import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, listRelated } from "@/lib/data/catalog";
import { getCart } from "@/lib/data/cart";
import { dimensionsOf, metaString } from "@/lib/format";
import { ArtworkGallery } from "@/components/artwork/ArtworkGallery";
import { BuyBox } from "@/components/artwork/BuyBox";
import { ArtistQuoteSection } from "@/components/ArtistQuoteSection";
import type { VariantOption } from "@/components/AddToCart";
import { InquiryForm } from "@/components/InquiryForm";
import { ArtworkGrid } from "@/components/ArtworkGrid";

export const revalidate = 60;

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const product = await getProduct(handle);
  if (!product) return { title: "Artwork not found" };
  const artist =
    metaString(product, "artist") ||
    metaString(product, "artist_name") ||
    product.subtitle ||
    "LITA Gallery";
  return {
    title: `${product.title} by ${artist} | LITA`,
    description:
      product.description?.slice(0, 160) ||
      product.subtitle ||
      `Original fine art by ${artist}`,
    openGraph: {
      images: product.thumbnail ? [product.thumbnail] : undefined,
    },
  };
}

export default async function ArtworkPage({ params }: Props) {
  const { handle } = await params;
  const [product, cart] = await Promise.all([
    getProduct(handle),
    getCart().catch(() => null),
  ]);
  if (!product) notFound();

  const related = await listRelated(product, 4);

  const rawImages = (
    product.images?.length
      ? product.images
      : product.thumbnail
      ? [{ id: "thumb", url: product.thumbnail }]
      : []
  ).map((i) => ({ id: i.id, url: i.url }));

  // Labels for 4 collector views
  const viewLabels = [
    "Full canvas",
    "Brushwork detail",
    "Profile view",
    "In room setting",
  ];

  const images = rawImages.map((img, idx) => ({
    id: img.id,
    url: img.url,
    label: viewLabels[idx] || `View ${idx + 1}`,
  }));

  const variants: VariantOption[] = (product.variants ?? []).map((v) => ({
    id: v.id,
    title: v.title ?? "Original",
    amount: v.calculated_price?.calculated_amount ?? null,
    currency: v.calculated_price?.currency_code ?? null,
    soldOut:
      !!v.manage_inventory &&
      !v.allow_backorder &&
      (v.inventory_quantity ?? 0) <= 0,
  }));

  const cartVariantIds = new Set(
    (cart?.items ?? [])
      .map((i) => i.variant_id || i.variant?.id)
      .filter((id): id is string => Boolean(id))
  );
  const initialInCart = variants.some((v) => cartVariantIds.has(v.id));

  const artist =
    metaString(product, "artist") ||
    metaString(product, "artist_name") ||
    product.subtitle ||
    "Sarah Ingraham";

  const medium =
    product.material || metaString(product, "medium") || "Acrylic on canvas";
  const year = metaString(product, "year") || "2024";
  const framing =
    metaString(product, "framing") ||
    "Unframed, painted edges (custom gallery floater frame available upon request)";
  const rawDimensions = dimensionsOf(product);

  const dimensionsIn =
    metaString(product, "dimensions_in") ||
    (rawDimensions ? rawDimensions : "48 x 48 x 1.5 in");
  const dimensionsCm =
    metaString(product, "dimensions_cm") || "121.92 x 121.92 x 3.81 cm";
  const framedDimensionsIn =
    metaString(product, "framed_dimensions_in") || "48 in x 48 in x 1.5 in";
  const framedDimensionsCm =
    metaString(product, "framed_dimensions_cm") ||
    "121.92 cm x 121.92 cm x 3.81 cm";

  const showQuoteBanner = metaString(product, "show_quote_banner") !== "false";
  const artistQuote =
    metaString(product, "artist_quote") ||
    "My work is a blend of botanical illustration and textile design influenced by folk art and tradition still life painting.";
  const artistQuoteAuthor =
    metaString(product, "artist_quote_author") || artist;

  let artworkInfoParsed: Record<string, string> | null = null;
  const rawArtworkInfo = metaString(product, "artwork_info");
  if (rawArtworkInfo) {
    try {
      artworkInfoParsed = JSON.parse(rawArtworkInfo) as Record<string, string>;
    } catch {
      artworkInfoParsed = null;
    }
  }

  let shippingDetailsParsed: Record<string, string> | null = null;
  const rawShippingDetails = metaString(product, "shipping_details");
  if (rawShippingDetails) {
    try {
      shippingDetailsParsed = JSON.parse(rawShippingDetails) as Record<string, string>;
    } catch {
      shippingDetailsParsed = null;
    }
  }

  const shippingTimeline =
    metaString(product, "shipping_timeline") || "1-3 weeks";
  const extendedDescription =
    metaString(product, "extended_description") || undefined;
  const artistHandle = metaString(product, "artist_handle") || undefined;
  const framingNote = metaString(product, "framing_note") || undefined;

  const defaultPrice = variants[0]?.amount ?? 6450;
  const defaultCurrency = variants[0]?.currency ?? "usd";

  return (
    <div className="min-h-screen bg-gallery-page text-gallery-charcoal font-sans selection:bg-gallery-accent selection:text-white">
      {/* Hero Section Container (Responsive padding: 96-120px desktop, 56-64px mobile) */}
      <section className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-12 pt-6 sm:pt-8 pb-14 sm:pb-16 lg:pb-24">
        {/* Breadcrumb Navigation */}
        <nav
          aria-label="Breadcrumb"
          className="mb-6 sm:mb-8 text-xs sm:text-[13px] text-gallery-muted flex items-center gap-1.5 flex-wrap"
        >
          <Link
            href="/artworks"
            className="hover:text-gallery-charcoal hover:underline underline-offset-4 transition-colors"
          >
            All artwork
          </Link>
          <span aria-hidden="true" className="text-gallery-hairline">/</span>
          {product.categories?.[0] ? (
            <>
              <Link
                href={`/artworks?category=${product.categories[0].handle}`}
                className="hover:text-gallery-charcoal hover:underline underline-offset-4 transition-colors"
              >
                {product.categories[0].name}
              </Link>
              <span aria-hidden="true" className="text-gallery-hairline">/</span>
            </>
          ) : (
            <>
              <Link
                href="/artworks"
                className="hover:text-gallery-charcoal hover:underline underline-offset-4 transition-colors"
              >
                Paintings
              </Link>
              <span aria-hidden="true" className="text-gallery-hairline">/</span>
            </>
          )}
          <span className="text-gallery-charcoal font-medium truncate max-w-[280px] sm:max-w-md">
            {product.title}
          </span>
        </nav>

        {/* Hero Two-Column Grid: 60/40 on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_1fr] xl:grid-cols-[1.5fr_1fr] gap-8 lg:gap-12 xl:gap-16 items-start">
          {/* Left Column (60%): Sticky Gallery Wall Panel & Multi-View Lightbox */}
          <div className="w-full">
            <ArtworkGallery
              images={images}
              title={product.title}
              artist={artist}
              dimensionsIn={dimensionsIn}
            />
          </div>

          {/* Right Column (40%): Layered Buy Box Card */}
          <div className="w-full">
            <BuyBox
              productId={product.id}
              handle={product.handle || handle}
              title={product.title}
              artist={artist}
              artistHandle={artistHandle}
              price={defaultPrice}
              currency={defaultCurrency}
              material={medium}
              description={
                product.description ||
                "Sarah's colorful botanical tableaux embrace pattern and playful excess, exploring the emotional resonance of color through vibrational compositions that balance improvisation, rhythm, and visual harmony."
              }
              extendedDescription={extendedDescription}
              dimensionsIn={dimensionsIn}
              dimensionsCm={dimensionsCm}
              framedDimensionsIn={framedDimensionsIn}
              framedDimensionsCm={framedDimensionsCm}
              framingNote={framingNote}
              year={year}
              framing={framing}
              variants={variants}
              shippingTimeline={shippingTimeline}
              initialInCart={initialInCart}
              thumbnailUrl={images[0]?.url || "/artworks/blue-room-front.jpg"}
              artworkInfo={
                artworkInfoParsed || {
                  medium,
                  support:
                    "Heavyweight 100% Belgian linen on kiln-dried solid wood stretcher bars",
                  signature: `Hand-signed, titled, and dated on verso by ${artist}`,
                  certificate:
                    "Included, signed by artist & registered in the LITA Archive",
                  year,
                  provenance: "Direct from the artist's studio",
                  condition: "Pristine, original studio condition",
                }
              }
              shippingDetails={
                shippingDetailsParsed || {
                  transit:
                    "Insured transit via fine-art courier with dedicated tracking and white-glove delivery options.",
                  packaging:
                    "Custom-built timber crate with archival interior cushions and moisture protection.",
                  timeline: `Dispatched within ${shippingTimeline} following custom inspection.`,
                  returns:
                    "14-day collector trial policy with full return refund guarantee.",
                }
              }
            />
          </div>
        </div>
      </section>

      {/* Artist Quote Banner */}
      {showQuoteBanner && (
        <ArtistQuoteSection quote={artistQuote} artist={artistQuoteAuthor} />
      )}

      {/* Specialist Inquiry Section */}
      <section
        id="inquire"
        className="mx-auto w-full max-w-[1380px] px-5 sm:px-8 lg:px-12 py-16 sm:py-24 grid scroll-mt-28 gap-10 border-t border-gallery-hairline lg:grid-cols-[1fr_1.3fr]"
      >
        <div>
          <span className="text-xs uppercase tracking-widest text-gallery-muted font-semibold block mb-2">
            Art Advisory & Inquiries
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-normal text-gallery-charcoal">
            Ask about this work
          </h2>
          <p className="mt-3 max-w-md text-sm text-gallery-muted leading-relaxed">
            Questions regarding dimensions, bespoke framing, international courier shipping, or rendering this work into a room mockup? Send an inquiry and our art advisory team will reply within 24 hours.
          </p>
        </div>
        <InquiryForm
          kind="artwork"
          artwork={product.title}
          placeholder={`Hello, I'm interested in "${product.title}" by ${artist}…`}
        />
      </section>

      {/* More from the Studio / Related Artworks Grid */}
      {related.length > 0 && (
        <section className="mx-auto w-full max-w-[1380px] px-5 sm:px-8 lg:px-12 pb-24 border-t border-gallery-hairline pt-16">
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="font-serif text-2xl sm:text-3xl font-normal text-gallery-charcoal">
              More from the studio
            </h2>
            <Link
              href="/artworks"
              className="text-xs uppercase tracking-widest text-gallery-muted hover:text-gallery-accent transition-colors font-medium"
            >
              View all artworks →
            </Link>
          </div>
          <ArtworkGrid products={related} />
        </section>
      )}
    </div>
  );
}

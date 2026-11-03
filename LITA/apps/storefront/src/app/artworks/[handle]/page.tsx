import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, listRelated } from "@/lib/data/catalog";
import { dimensionsOf, metaString } from "@/lib/format";
import { ArtworkGallery } from "@/components/ArtworkGallery";
import { ArtworkDetails } from "@/components/ArtworkDetails";
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
  const product = await getProduct(handle);
  if (!product) notFound();

  const related = await listRelated(product, 4);

  const images = (
    product.images?.length
      ? product.images
      : product.thumbnail
      ? [{ id: "thumb", url: product.thumbnail }]
      : []
  ).map((i) => ({ id: i.id, url: i.url }));

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

  const artist =
    metaString(product, "artist") ||
    metaString(product, "artist_name") ||
    product.subtitle ||
    "Sarah Ingraham";

  const medium =
    product.material || metaString(product, "medium") || "Acrylic on canvas";
  const year = metaString(product, "year") || "2024";
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

  const defaultPrice = variants[0]?.amount ?? 6450;
  const defaultCurrency = variants[0]?.currency ?? "usd";

  return (
    <div className="mx-auto w-full max-w-[1380px] px-5 sm:px-8 lg:px-12 pt-6 sm:pt-8 pb-16">
      {/* Subtle Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="mb-6 text-xs sm:text-sm text-[#777C82]">
        <Link href="/artworks" className="hover:text-black transition-colors">
          All artwork
        </Link>
        <span aria-hidden="true" className="mx-2 text-[#CCCCCC]">/</span>
        {product.categories?.[0] ? (
          <>
            <Link
              href={`/artworks?category=${product.categories[0].handle}`}
              className="hover:text-black transition-colors"
            >
              {product.categories[0].name}
            </Link>
            <span aria-hidden="true" className="mx-2 text-[#CCCCCC]">/</span>
          </>
        ) : (
          <>
            <Link href="/artworks" className="hover:text-black transition-colors">
              Paintings
            </Link>
            <span aria-hidden="true" className="mx-2 text-[#CCCCCC]">/</span>
          </>
        )}
        <span className="text-[#1A1D20] font-normal truncate">
          {product.title}
        </span>
      </nav>

      {/* Main Two-Column Gallery & Details Section */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-10 xl:gap-16 items-start">
        {/* Left Column: Gallery with Left Vertical Thumbnails */}
        <div className="w-full">
          <ArtworkGallery
            images={images}
            title={product.title}
            artist={artist}
          />
        </div>

        {/* Right Column: Title, Artist, Price, Details, Accordions */}
        <div className="lg:sticky lg:top-28 lg:self-start w-full">
          <ArtworkDetails
            productId={product.id}
            handle={product.handle || handle}
            title={product.title}
            artist={artist}
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
            variants={variants}
            shippingTimeline={shippingTimeline}
            artworkInfo={
              artworkInfoParsed || {
                medium,
                support: "Heavyweight 100% Belgian linen on kiln-dried solid wood stretcher bars",
                signature: `Hand-signed, titled, and dated on verso by ${artist}`,
                certificate: "Included, signed by artist & registered in the LITA Archive",
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

      {/* Artist Quote Banner (Image 1) */}
      {showQuoteBanner && (
        <ArtistQuoteSection quote={artistQuote} artist={artistQuoteAuthor} />
      )}

      {/* Specialist Inquiry Section */}
      <section
        id="inquire"
        className="mt-16 sm:mt-24 grid scroll-mt-28 gap-10 border-t border-[#E5E5E5] pt-14 lg:grid-cols-[1fr_1.3fr]"
      >
        <div>
          <span className="text-xs uppercase tracking-widest text-[#888888] font-semibold block mb-2">
            Art Advisory & Inquiries
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#1A1D20]">
            Ask about this work
          </h2>
          <p className="mt-3 max-w-md text-sm text-[#5C6168] leading-relaxed">
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
        <section className="mt-24 border-t border-[#E5E5E5] pt-16">
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#1A1D20]">
              More from the studio
            </h2>
            <Link
              href="/artworks"
              className="text-xs uppercase tracking-widest text-[#555555] hover:text-black transition-colors font-medium"
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

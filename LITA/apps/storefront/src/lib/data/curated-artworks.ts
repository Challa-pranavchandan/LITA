import type { HttpTypes } from "@medusajs/types";

export interface CuratedArtworkData {
  id: string;
  handle: string;
  title: string;
  artist: string;
  artist_quote: string;
  price: number;
  currency: string;
  material: string;
  description: string;
  extendedDescription?: string;
  dimensions_in: string;
  dimensions_cm: string;
  framed_dimensions_in?: string;
  framed_dimensions_cm?: string;
  depth_in?: string;
  depth_cm?: string;
  year?: string;
  edition?: string;
  framing?: string;
  shipping_timeline?: string;
  artwork_info?: {
    medium: string;
    support: string;
    signature: string;
    certificate: string;
    year: string;
    provenance: string;
    condition: string;
  };
  shipping_details?: {
    transit: string;
    packaging: string;
    timeline: string;
    returns: string;
  };
  images: { id: string; url: string }[];
}

export const CURATED_ARTWORKS: Record<string, CuratedArtworkData> = {
  "blue-room-sunset-garden": {
    id: "prod_blue_room_sunset",
    handle: "blue-room-sunset-garden",
    title: "Blue Room with Sunset Garden",
    artist: "Sarah Ingraham",
    artist_quote:
      "My work is a blend of botanical illustration and textile design influenced by folk art and tradition still life painting.",
    price: 6450,
    currency: "USD",
    material: "Acrylic on canvas",
    description:
      "Sarah's colorful botanical tableaux embrace pattern and playful excess, exploring the emotional resonance of color through vibrational compositions that balance improvisation, rhythm, and visual harmony.",
    extendedDescription:
      "Rooted in the visual vocabularies of historical folk art and European still-life painting traditions, this piece reimagines the domestic window as a threshold between interior contemplation and vibrant botanical life. Layers of saturated acrylic pigment build a luminous, resonant surface that shifts dynamically with natural light.\n\nCreated in Ingraham's studio, each floral vignette is observed and stylized from life, blending botanical precision with ornamental decorative flourishes inspired by vintage wallpapers and heirloom textiles.",
    dimensions_in: "48 x 48 x 1.5 in",
    dimensions_cm: "121.92 x 121.92 x 3.81 cm",
    framed_dimensions_in: "48 in x 48 in x 1.5 in",
    framed_dimensions_cm: "121.92 cm x 121.92 cm x 3.81 cm",
    depth_in: "1.5 in",
    depth_cm: "3.81 cm",
    year: "2024",
    edition: "Original 1 of 1",
    framing: "Unframed, painted edges (custom gallery floater frame available upon request)",
    shipping_timeline: "1-3 weeks",
    artwork_info: {
      medium: "Acrylic on canvas",
      support: "Heavyweight 100% Belgian linen on kiln-dried solid wood stretcher bars",
      signature: "Hand-signed, titled, and dated on verso by Sarah Ingraham",
      certificate: "Included, signed by artist & registered in the LITA Studio Archive",
      year: "2024",
      provenance: "Direct from the artist's studio",
      condition: "Pristine, original studio condition",
    },
    shipping_details: {
      transit: "Insured transit via fine-art courier with dedicated tracking and white-glove delivery options.",
      packaging: "Custom-crafted timber crate lined with archival moisture barrier and shock-absorbing foam.",
      timeline: "Expected dispatch within 1–3 weeks following custom inspection and packing.",
      returns: "14-day collector preview policy with full return guarantee if not completely satisfied.",
    },
    images: [
      { id: "img-1", url: "/artworks/blue-room-front.jpg" },
      { id: "img-2", url: "/artworks/blue-room-detail.jpg" },
      { id: "img-3", url: "/artworks/blue-room-side.jpg" },
      { id: "img-4", url: "/artworks/blue-room-room.jpg" },
    ],
  },
  "garden-geometries-no-2": {
    id: "prod_garden_geometries",
    handle: "garden-geometries-no-2",
    title: "Garden Geometries No. 2",
    artist: "Anna Koeferl",
    artist_quote:
      "Geometry offers the structural skeleton while living nature provides the breath and organic spontaneity of my work.",
    price: 1325,
    currency: "USD",
    material: "Oil and tempera on canvas",
    description:
      "Anna Koeferl's intricate compositions explore the structural rhythms of flora, balancing geometric precision against organic softness.",
    extendedDescription:
      "Balancing grid structures with botanical forms, Garden Geometries No. 2 investigates the interplay between human order and organic growth. Soft, layered glazes of tempera and oil paint produce a delicate tactile surface.",
    dimensions_in: "30 x 30 x 1.5 in",
    dimensions_cm: "76.2 x 76.2 x 3.81 cm",
    framed_dimensions_in: "30 in x 30 in x 1.5 in",
    framed_dimensions_cm: "76.2 cm x 76.2 cm x 3.81 cm",
    depth_in: "1.5 in",
    depth_cm: "3.81 cm",
    year: "2024",
    edition: "Original 1 of 1",
    framing: "Unframed, edge-finished",
    shipping_timeline: "1-2 weeks",
    artwork_info: {
      medium: "Oil and tempera on canvas",
      support: "Archival cotton duck stretched over solid pine",
      signature: "Hand-signed and dated by Anna Koeferl on verso",
      certificate: "Included, signed Certificate of Authenticity",
      year: "2024",
      provenance: "Artist's studio collection",
      condition: "Pristine",
    },
    shipping_details: {
      transit: "Fully insured door-to-door courier shipping with signature required.",
      packaging: "Reinforced fine art packaging box with corner protectors.",
      timeline: "Dispatches in 1–2 weeks.",
      returns: "14-day collector satisfaction trial.",
    },
    images: [
      { id: "gg-1", url: "/artworks/garden-geometries.jpg" },
      { id: "gg-2", url: "/artworks/blue-current-wall.jpg" },
    ],
  },
  "wave-of-forgiveness": {
    id: "prod_wave_forgiveness",
    handle: "wave-of-forgiveness",
    title: "Wave of Forgiveness",
    artist: "Tony Sjöman",
    artist_quote:
      "Through strict geometry and atmospheric gradients, I search for the stillness hidden within modern movement.",
    price: 2400,
    currency: "USD",
    material: "Acrylic and archival pigment on linen",
    description:
      "Tony Sjöman's meditative gradient canvases channel Nordic abstraction, blending architectural tension with tranquil emotional clarity.",
    extendedDescription:
      "Wave of Forgiveness is an exploration of gradient transitions and hard-edge geometric composition. Sjöman's signature palette fuses urban minimalism with quiet Nordic landscapes.",
    dimensions_in: "36 x 36 x 1.5 in",
    dimensions_cm: "91.44 x 91.44 x 3.81 cm",
    framed_dimensions_in: "36 in x 36 in x 1.5 in",
    framed_dimensions_cm: "91.44 cm x 91.44 cm x 3.81 cm",
    depth_in: "1.5 in",
    depth_cm: "3.81 cm",
    year: "2024",
    edition: "Original 1 of 1",
    framing: "Natural ash floater frame included",
    shipping_timeline: "1-2 weeks",
    artwork_info: {
      medium: "Acrylic and archival pigment on linen",
      support: "Pure Belgian linen stretched on custom bevelled bars",
      signature: "Hand-signed on front and verso",
      certificate: "Included, verified by artist studio",
      year: "2024",
      provenance: "Direct from the artist's studio",
      condition: "Pristine studio condition",
    },
    shipping_details: {
      transit: "Fine art courier delivery, insured at declared value.",
      packaging: "Custom padded art container.",
      timeline: "Dispatched in 1–2 weeks.",
      returns: "14-day return privilege.",
    },
    images: [
      { id: "wf-1", url: "/artworks/wave-forgiveness.jpg" },
      { id: "wf-2", url: "/artworks/blue-current-detail.jpg" },
    ],
  },
};

/**
 * Converts CuratedArtworkData into Medusa HttpTypes.StoreProduct format
 * so that all storefront components work transparently with either data source.
 */
export function curatedToStoreProduct(item: CuratedArtworkData): HttpTypes.StoreProduct {
  return {
    id: item.id,
    handle: item.handle,
    title: item.title,
    subtitle: item.artist,
    material: item.material,
    description: item.description,
    thumbnail: item.images[0]?.url,
    images: item.images.map((img, idx) => ({
      id: img.id,
      url: img.url,
      rank: idx,
      product_id: item.id,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
      metadata: null,
    })),
    variants: [
      {
        id: `variant_${item.id}`,
        title: "Original",
        product_id: item.id,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        deleted_at: null,
        sku: item.handle,
        barcode: null,
        ean: null,
        upc: null,
        allow_backorder: true,
        manage_inventory: false,
        hs_code: null,
        origin_country: "US",
        mid_code: null,
        material: item.material,
        weight: null,
        length: null,
        height: 48,
        width: 48,
        metadata: null,
        variant_rank: 0,
        thumbnail: item.images[0]?.url,
        options: [],
        calculated_price: {
          id: `price_${item.id}`,
          calculated_amount: item.price,
          original_amount: item.price,
          currency_code: item.currency.toLowerCase(),
          money_amount_id: null,
          price_list_id: null,
          price_list_type: null,
          min_quantity: null,
          max_quantity: null,
          rules_count: 0,
        },
      },
    ],
    metadata: {
      artist: item.artist,
      artist_quote: item.artist_quote,
      extended_description: item.extendedDescription,
      dimensions: `${item.dimensions_in} / ${item.dimensions_cm}`,
      dimensions_in: item.dimensions_in,
      dimensions_cm: item.dimensions_cm,
      framed_dimensions_in: item.framed_dimensions_in,
      framed_dimensions_cm: item.framed_dimensions_cm,
      depth_in: item.depth_in,
      depth_cm: item.depth_cm,
      year: item.year,
      edition: item.edition,
      framing: item.framing,
      shipping_timeline: item.shipping_timeline,
      artwork_info: JSON.stringify(item.artwork_info),
      shipping_details: JSON.stringify(item.shipping_details),
      affirm_eligible: "true",
    },
    collection: {
      id: "col_curated",
      title: "Featured Works",
      handle: "featured-works",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
      metadata: null,
    },
    categories: [
      {
        id: "cat_paintings",
        name: "Paintings",
        handle: "paintings",
        description: "Original contemporary paintings",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        deleted_at: null,
        parent_category_id: null,
        rank: 0,
        category_children: [],
        metadata: null,
      },
    ],
    status: "published",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    deleted_at: null,
  } as unknown as HttpTypes.StoreProduct;
}

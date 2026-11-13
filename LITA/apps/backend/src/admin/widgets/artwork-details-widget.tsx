import React, { useState } from "react"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Input, Label, Switch, Text, Textarea, toast } from "@medusajs/ui"
import { sdk } from "../lib/sdk"

type ProductWidgetProps = {
  data: {
    id: string
    title: string
    subtitle?: string
    metadata?: Record<string, unknown> | null
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function parseMeta(metadata: Record<string, string>, key: string, fallback = ""): string {
  return (metadata[key] as string) || fallback
}

function parseJsonMeta<T extends Record<string, string>>(
  metadata: Record<string, string>,
  key: string,
  defaults: T
): T {
  try {
    const raw = metadata[key]
    if (raw) return { ...defaults, ...(JSON.parse(raw) as T) }
  } catch {
    // ignore malformed JSON
  }
  return defaults
}

// ---------------------------------------------------------------------------
// Widget
// ---------------------------------------------------------------------------
const ArtworkDetailsWidget = ({ data }: ProductWidgetProps) => {
  const metadata = (data.metadata || {}) as Record<string, string>

  // ── Section 1: Artist & Banner ──────────────────────────────────────────
  const [artist, setArtist] = useState(parseMeta(metadata, "artist") || parseMeta(metadata, "artist_name") || data.subtitle || "")
  const [artistHandle, setArtistHandle] = useState(parseMeta(metadata, "artist_handle"))
  const [showQuoteBanner, setShowQuoteBanner] = useState(metadata.show_quote_banner !== "false")
  const [artistQuote, setArtistQuote] = useState(parseMeta(metadata, "artist_quote"))
  const [artistQuoteAuthor, setArtistQuoteAuthor] = useState(
    parseMeta(metadata, "artist_quote_author") || parseMeta(metadata, "artist") || data.subtitle || ""
  )

  // ── Section 2: Core Specs (SpecGrid) ────────────────────────────────────
  const [medium, setMedium] = useState(parseMeta(metadata, "medium"))
  const [year, setYear] = useState(parseMeta(metadata, "year", "2024"))
  const [framing, setFraming] = useState(parseMeta(metadata, "framing"))
  const [dimensionsIn, setDimensionsIn] = useState(parseMeta(metadata, "dimensions_in"))
  const [dimensionsCm, setDimensionsCm] = useState(parseMeta(metadata, "dimensions_cm"))
  const [framedDimensionsIn, setFramedDimensionsIn] = useState(parseMeta(metadata, "framed_dimensions_in"))
  const [framedDimensionsCm, setFramedDimensionsCm] = useState(parseMeta(metadata, "framed_dimensions_cm"))
  const [framingNote, setFramingNote] = useState(parseMeta(metadata, "framing_note"))
  const [extendedDescription, setExtendedDescription] = useState(parseMeta(metadata, "extended_description"))

  // ── Section 3: Artwork Information accordion ─────────────────────────────
  const defaultArtworkInfo = { medium: "", support: "", signature: "", certificate: "", year: "", provenance: "", condition: "" }
  const initAI = parseJsonMeta(metadata, "artwork_info", defaultArtworkInfo)
  const [aiSupport, setAiSupport] = useState(initAI.support)
  const [aiSignature, setAiSignature] = useState(initAI.signature)
  const [aiCertificate, setAiCertificate] = useState(initAI.certificate)
  const [aiProvenance, setAiProvenance] = useState(initAI.provenance)
  const [aiCondition, setAiCondition] = useState(initAI.condition)

  // ── Section 4: Shipping & Guarantee accordion ────────────────────────────
  const defaultShipping = { transit: "", packaging: "", timeline: "", returns: "" }
  const initSD = parseJsonMeta(metadata, "shipping_details", defaultShipping)
  const [shipTransit, setShipTransit] = useState(initSD.transit)
  const [shipPackaging, setShipPackaging] = useState(initSD.packaging)
  const [shipTimeline, setShipTimeline] = useState(initSD.timeline || parseMeta(metadata, "shipping_timeline", "1-3 weeks"))
  const [shipReturns, setShipReturns] = useState(initSD.returns)

  const [loading, setLoading] = useState(false)

  // ── Auto-sync quote author with artist name ──────────────────────────────
  function handleArtistChange(val: string) {
    setArtist(val)
    if (!artistQuoteAuthor || artistQuoteAuthor === artist) {
      setArtistQuoteAuthor(val)
    }
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  async function handleSave() {
    setLoading(true)
    try {
      const artworkInfo = JSON.stringify({
        medium,
        support: aiSupport,
        signature: aiSignature,
        certificate: aiCertificate,
        year,
        provenance: aiProvenance,
        condition: aiCondition,
      })

      const shippingDetails = JSON.stringify({
        transit: shipTransit,
        packaging: shipPackaging,
        timeline: shipTimeline,
        returns: shipReturns,
      })

      const updatedMetadata = {
        ...(data.metadata || {}),
        // Artist
        artist,
        artist_handle: artistHandle,
        // Quote banner
        show_quote_banner: showQuoteBanner ? "true" : "false",
        artist_quote: artistQuote,
        artist_quote_author: artistQuoteAuthor || artist,
        // Specs
        medium,
        year,
        framing,
        dimensions_in: dimensionsIn,
        dimensions_cm: dimensionsCm,
        framed_dimensions_in: framedDimensionsIn,
        framed_dimensions_cm: framedDimensionsCm,
        framing_note: framingNote,
        shipping_timeline: shipTimeline,
        extended_description: extendedDescription,
        // JSON blobs
        artwork_info: artworkInfo,
        shipping_details: shippingDetails,
      }

      await sdk.admin.product.update(data.id, {
        subtitle: artist || data.subtitle,
        metadata: updatedMetadata,
      })

      toast.success("Artwork details saved", {
        description: "All PDP fields updated successfully.",
      })
    } catch (err) {
      toast.error("Failed to save", {
        description: (err as Error).message || "Please check your network and try again.",
      })
    } finally {
      setLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Container className="divide-y p-0">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Artwork &amp; Curatorial Details</Heading>
          <Text className="text-ui-fg-subtle text-xs mt-1">
            All fields below are reflected live on the product detail page.
          </Text>
        </div>
        <Button size="small" variant="primary" isLoading={loading} onClick={handleSave}>
          Save Artwork Details
        </Button>
      </div>

      <div className="px-6 py-5 space-y-8">

        {/* ── SECTION 1: Artist ── */}
        <Section title="Artist" hint="Displayed in the buy-box header and artist block section.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field id="artist_name" label="Artist Name" hint='Shows under the title as "by [name]"'>
              <Input
                id="artist_name"
                placeholder="e.g. Sarah Ingraham"
                value={artist}
                onChange={(e) => handleArtistChange(e.target.value)}
              />
            </Field>
            <Field id="artist_handle" label="Artist Handle / Slug" hint='Used for the "View more works →" link (e.g. sarah-ingraham)'>
              <Input
                id="artist_handle"
                placeholder="e.g. sarah-ingraham"
                value={artistHandle}
                onChange={(e) => setArtistHandle(e.target.value)}
              />
            </Field>
          </div>
        </Section>

        {/* ── SECTION 2: Quote Banner ── */}
        <div className="border border-ui-border-base rounded-lg p-5 bg-ui-bg-subtle/40 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Heading level="h3" className="text-sm font-semibold">Artist Quote Banner</Heading>
              <Text className="text-ui-fg-subtle text-xs mt-0.5">
                Full-width charcoal band with editorial quote shown beneath the hero.
              </Text>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="toggle-quote" className="text-xs text-ui-fg-subtle">Enabled</Label>
              <Switch id="toggle-quote" checked={showQuoteBanner} onCheckedChange={setShowQuoteBanner} />
            </div>
          </div>

          {showQuoteBanner && (
            <>
              <Field id="artist_quote" label="Quote / Statement Text">
                <Textarea
                  id="artist_quote"
                  placeholder='e.g. "My work is a blend of botanical illustration and textile design…"'
                  value={artistQuote}
                  onChange={(e) => setArtistQuote(e.target.value)}
                  rows={3}
                />
              </Field>
              <Field id="quote_author" label="Attribution Name" hint="Defaults to artist name if left blank">
                <Input
                  id="quote_author"
                  placeholder="e.g. Sarah Ingraham"
                  value={artistQuoteAuthor}
                  onChange={(e) => setArtistQuoteAuthor(e.target.value)}
                />
              </Field>

              {/* Live Preview */}
              <div className="mt-4 pt-4 border-t border-ui-border-base">
                <Text className="text-xs uppercase font-semibold text-ui-fg-muted tracking-wider mb-2">
                  Live Preview
                </Text>
                <div className="bg-[#2B2B2B] rounded-md p-6 text-center">
                  <blockquote className="font-serif text-lg text-white italic leading-relaxed max-w-2xl mx-auto">
                    &ldquo;{artistQuote || "My work is a blend of botanical illustration and textile design…"}&rdquo;
                  </blockquote>
                  <cite className="block text-sm text-neutral-400 mt-3">
                    — {artistQuoteAuthor || artist || "Artist Name"}
                  </cite>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── SECTION 3: Core Specs (SpecGrid + BuyBox) ── */}
        <Section title="Artwork Specifications" hint="Populates the SpecGrid (Medium, Size, Year, Framing) and buy-box eyebrow.">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field id="medium" label="Medium" hint='Eyebrow label (e.g. "ACRYLIC ON CANVAS") + SpecGrid "Medium" cell'>
              <Input
                id="medium"
                placeholder="e.g. Acrylic on canvas"
                value={medium}
                onChange={(e) => setMedium(e.target.value)}
              />
            </Field>
            <Field id="year" label="Year Created">
              <Input
                id="year"
                placeholder="e.g. 2024"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </Field>
            <Field id="framing" label="Framing" hint='SpecGrid "Framing" cell (truncated with "…" if long)'>
              <Input
                id="framing"
                placeholder="e.g. Unframed, painted edges (custom gallery floater frame available upon request)"
                value={framing}
                onChange={(e) => setFraming(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Field id="dim_in" label="Size — Inches (in)" hint="Shown in SpecGrid when toggled to in">
              <Input
                id="dim_in"
                placeholder="e.g. 48 x 48 x 1.5 in"
                value={dimensionsIn}
                onChange={(e) => setDimensionsIn(e.target.value)}
              />
            </Field>
            <Field id="dim_cm" label="Size — Centimetres (cm)" hint="Shown in SpecGrid when toggled to cm">
              <Input
                id="dim_cm"
                placeholder="e.g. 121.92 x 121.92 x 3.81 cm"
                value={dimensionsCm}
                onChange={(e) => setDimensionsCm(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Field id="framed_in" label="Framed Dimensions — Inches" hint="Shown in Dimensions &amp; Framing accordion">
              <Input
                id="framed_in"
                placeholder="e.g. 48 in x 48 in x 1.5 in"
                value={framedDimensionsIn}
                onChange={(e) => setFramedDimensionsIn(e.target.value)}
              />
            </Field>
            <Field id="framed_cm" label="Framed Dimensions — Centimetres">
              <Input
                id="framed_cm"
                placeholder="e.g. 121.92 cm x 121.92 cm x 3.81 cm"
                value={framedDimensionsCm}
                onChange={(e) => setFramedDimensionsCm(e.target.value)}
              />
            </Field>
          </div>

          <div className="mt-4">
            <Field id="framing_note" label="Framing Note" hint="Shown below framed dimensions in accordion (bespoke frame description)">
              <Textarea
                id="framing_note"
                placeholder="e.g. Bespoke museum floater framing is hand-crafted from solid FSC-certified hardwood (natural maple, walnut, or satin black)."
                value={framingNote}
                onChange={(e) => setFramingNote(e.target.value)}
                rows={2}
              />
            </Field>
          </div>

          <div className="mt-4">
            <Field id="ext_desc" label='Extended Description ("Read more" toggle)' hint="Shown after collector clicks Read more in the buy-box summary">
              <Textarea
                id="ext_desc"
                placeholder="In-depth studio statement, provenance, or curatorial notes…"
                value={extendedDescription}
                onChange={(e) => setExtendedDescription(e.target.value)}
                rows={3}
              />
            </Field>
          </div>
        </Section>

        {/* ── SECTION 4: Artwork Information accordion ── */}
        <Section title="Artwork Information" hint="Populates rows in the Artwork Information accordion on the PDP.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field id="ai_support" label="Support / Ground">
              <Input
                id="ai_support"
                placeholder="e.g. Heavyweight 100% Belgian linen on kiln-dried solid wood stretcher bars"
                value={aiSupport}
                onChange={(e) => setAiSupport(e.target.value)}
              />
            </Field>
            <Field id="ai_signature" label="Signature">
              <Input
                id="ai_signature"
                placeholder="e.g. Hand-signed, titled, and dated on verso by {artist}"
                value={aiSignature}
                onChange={(e) => setAiSignature(e.target.value)}
              />
            </Field>
            <Field id="ai_certificate" label="Authenticity / Certificate">
              <Input
                id="ai_certificate"
                placeholder="e.g. Included, signed by artist & registered in the LITA Archive"
                value={aiCertificate}
                onChange={(e) => setAiCertificate(e.target.value)}
              />
            </Field>
            <Field id="ai_provenance" label="Provenance">
              <Input
                id="ai_provenance"
                placeholder="e.g. Direct from the artist's studio"
                value={aiProvenance}
                onChange={(e) => setAiProvenance(e.target.value)}
              />
            </Field>
            <Field id="ai_condition" label="Condition">
              <Input
                id="ai_condition"
                placeholder="e.g. Pristine, original studio condition"
                value={aiCondition}
                onChange={(e) => setAiCondition(e.target.value)}
              />
            </Field>
          </div>
          <Text className="text-ui-fg-muted text-[11px] mt-3">
            Note: Medium and Year are shared with the Specifications section above and are saved there.
          </Text>
        </Section>

        {/* ── SECTION 5: Shipping & Guarantee accordion ── */}
        <Section title="Shipping &amp; Guarantee" hint="Populates the Shipping & Guarantee accordion on the PDP.">
          <div className="space-y-4">
            <Field id="ship_transit" label="Transit / Courier" hint="e.g. courier type, tracking, white-glove options">
              <Textarea
                id="ship_transit"
                placeholder="e.g. Insured transit via fine-art courier with dedicated tracking and white-glove delivery options."
                value={shipTransit}
                onChange={(e) => setShipTransit(e.target.value)}
                rows={2}
              />
            </Field>
            <Field id="ship_packaging" label="Packaging">
              <Textarea
                id="ship_packaging"
                placeholder="e.g. Custom-built timber crate with archival interior cushions and moisture protection."
                value={shipPackaging}
                onChange={(e) => setShipPackaging(e.target.value)}
                rows={2}
              />
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field id="ship_timeline" label="Dispatch Timeline" hint='Also used by "Ships in X weeks" trust badge'>
                <Input
                  id="ship_timeline"
                  placeholder="e.g. 1-3 weeks"
                  value={shipTimeline}
                  onChange={(e) => setShipTimeline(e.target.value)}
                />
              </Field>
            </div>
            <Field id="ship_returns" label="Returns Policy">
              <Textarea
                id="ship_returns"
                placeholder="e.g. 14-day collector trial policy with full return refund guarantee."
                value={shipReturns}
                onChange={(e) => setShipReturns(e.target.value)}
                rows={2}
              />
            </Field>
          </div>
        </Section>

      </div>
    </Container>
  )
}

// ---------------------------------------------------------------------------
// Local layout helpers (keep widget self-contained, no external imports)
// ---------------------------------------------------------------------------
function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <div>
        <Heading level="h3" className="text-sm font-semibold">
          {title}
        </Heading>
        {hint && (
          <Text className="text-ui-fg-subtle text-xs mt-0.5">{hint}</Text>
        )}
      </div>
      {children}
    </div>
  )
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="mt-1.5">{children}</div>
      {hint && (
        <Text className="text-ui-fg-muted text-[11px] mt-1">{hint}</Text>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ArtworkDetailsWidget

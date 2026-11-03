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

const ArtworkDetailsWidget = ({ data }: ProductWidgetProps) => {
  const metadata = (data.metadata || {}) as Record<string, string>

  const [artist, setArtist] = useState<string>(
    metadata.artist || metadata.artist_name || data.subtitle || ""
  )
  const [showQuoteBanner, setShowQuoteBanner] = useState<boolean>(
    metadata.show_quote_banner !== "false"
  )
  const [artistQuote, setArtistQuote] = useState<string>(
    metadata.artist_quote || ""
  )
  const [artistQuoteAuthor, setArtistQuoteAuthor] = useState<string>(
    metadata.artist_quote_author || metadata.artist || metadata.artist_name || data.subtitle || ""
  )
  const [medium, setMedium] = useState<string>(metadata.medium || "")
  const [dimensionsIn, setDimensionsIn] = useState<string>(metadata.dimensions_in || "")
  const [dimensionsCm, setDimensionsCm] = useState<string>(metadata.dimensions_cm || "")
  const [framedDimensionsIn, setFramedDimensionsIn] = useState<string>(
    metadata.framed_dimensions_in || ""
  )
  const [shippingTimeline, setShippingTimeline] = useState<string>(
    metadata.shipping_timeline || "1-3 weeks"
  )
  const [year, setYear] = useState<string>(metadata.year || "2024")
  const [extendedDescription, setExtendedDescription] = useState<string>(
    metadata.extended_description || ""
  )
  const [loading, setLoading] = useState(false)

  // Sync author with artist name if author was not separately customized
  function handleArtistChange(val: string) {
    setArtist(val)
    if (!artistQuoteAuthor || artistQuoteAuthor === artist) {
      setArtistQuoteAuthor(val)
    }
  }

  async function handleSave() {
    setLoading(true)
    try {
      const updatedMetadata = {
        ...(data.metadata || {}),
        artist,
        show_quote_banner: showQuoteBanner ? "true" : "false",
        artist_quote: artistQuote,
        artist_quote_author: artistQuoteAuthor || artist,
        medium,
        dimensions_in: dimensionsIn,
        dimensions_cm: dimensionsCm,
        framed_dimensions_in: framedDimensionsIn,
        shipping_timeline: shippingTimeline,
        year,
        extended_description: extendedDescription,
      }

      await sdk.admin.product.update(data.id, {
        subtitle: artist || data.subtitle,
        metadata: updatedMetadata,
      })

      toast.success("Saved artwork details", {
        description: "Artist quote banner and gallery metadata updated successfully.",
      })
    } catch (err) {
      toast.error("Failed to update artwork details", {
        description: (err as Error).message || "Please check your network and try again.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      {/* Header with Save Button */}
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Artwork &amp; Curatorial Details</Heading>
          <Text className="text-ui-fg-subtle text-xs mt-1">
            Configure artist statement banner, quote attribution, dimensions switcher, and curatorial metadata.
          </Text>
        </div>
        <Button
          size="small"
          variant="primary"
          isLoading={loading}
          onClick={handleSave}
        >
          Save Artwork Details
        </Button>
      </div>

      <div className="px-6 py-5 space-y-6">
        {/* SECTION 1: Artist Quote & Statement Banner */}
        <div className="border border-ui-border-base rounded-lg p-5 bg-ui-bg-subtle/40 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Heading level="h3" className="text-sm font-semibold">
                Artist Quote Banner
              </Heading>
              <Text className="text-ui-fg-subtle text-xs mt-0.5">
                Displays the full-width editorial statement and italicized artist attribution beneath the product view.
              </Text>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="toggle-quote-banner" className="text-xs text-ui-fg-subtle">
                Enabled
              </Label>
              <Switch
                id="toggle-quote-banner"
                checked={showQuoteBanner}
                onCheckedChange={setShowQuoteBanner}
              />
            </div>
          </div>

          {showQuoteBanner && (
            <>
              <div>
                <Label htmlFor="artist_quote">Quote / Statement Text</Label>
                <Textarea
                  id="artist_quote"
                  placeholder="e.g. My work is a blend of botanical illustration and textile design influenced by folk art and tradition still life painting."
                  value={artistQuote}
                  onChange={(e) => setArtistQuote(e.target.value)}
                  rows={3}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="artist_quote_author">Quote Attribution / Author Name</Label>
                <Input
                  id="artist_quote_author"
                  placeholder="e.g. Sarah Ingraham"
                  value={artistQuoteAuthor}
                  onChange={(e) => setArtistQuoteAuthor(e.target.value)}
                  className="mt-1.5"
                />
                <Text className="text-ui-fg-muted text-[11px] mt-1">
                  Appears in elegant italics below the statement (defaults to artist name if left blank).
                </Text>
              </div>

              {/* Real-time Live Preview */}
              <div className="mt-4 pt-4 border-t border-ui-border-base">
                <Text className="text-xs uppercase font-semibold text-ui-fg-muted tracking-wider mb-2">
                  Live Storefront Preview
                </Text>
                <div className="bg-white border border-ui-border-base rounded-md p-6 text-center shadow-sm">
                  <blockquote className="font-serif text-lg md:text-xl text-neutral-800 italic leading-relaxed max-w-2xl mx-auto">
                    &ldquo;{artistQuote || "My work is a blend of botanical illustration and textile design influenced by folk art and tradition still life painting."}&rdquo;
                  </blockquote>
                  <cite className="block font-serif italic text-sm text-neutral-500 mt-3 not-italic-fallback">
                    {artistQuoteAuthor || artist || "Sarah Ingraham"}
                  </cite>
                </div>
              </div>
            </>
          )}
        </div>

        {/* SECTION 2: Core Specifications & Details */}
        <div className="space-y-4">
          <Heading level="h3" className="text-sm font-semibold">
            Artwork Specifications
          </Heading>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="artist_name">Artist Name</Label>
              <Input
                id="artist_name"
                placeholder="e.g. Sarah Ingraham"
                value={artist}
                onChange={(e) => handleArtistChange(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="artwork_year">Year Created</Label>
              <Input
                id="artwork_year"
                placeholder="e.g. 2024"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="medium_material">Medium / Material</Label>
              <Input
                id="medium_material"
                placeholder="e.g. Acrylic on canvas"
                value={medium}
                onChange={(e) => setMedium(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="dim_in">Size in Inches (in)</Label>
              <Input
                id="dim_in"
                placeholder="e.g. 48 x 48 x 1.5 in"
                value={dimensionsIn}
                onChange={(e) => setDimensionsIn(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="dim_cm">Size in Centimeters (cm)</Label>
              <Input
                id="dim_cm"
                placeholder="e.g. 121.92 x 121.92 x 3.81 cm"
                value={dimensionsCm}
                onChange={(e) => setDimensionsCm(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="framed_dim">Framed Dimensions</Label>
              <Input
                id="framed_dim"
                placeholder="e.g. 48 in x 48 in x 1.5 in"
                value={framedDimensionsIn}
                onChange={(e) => setFramedDimensionsIn(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="ship_timeline">Shipping Timeline</Label>
              <Input
                id="ship_timeline"
                placeholder="e.g. 1-3 weeks"
                value={shippingTimeline}
                onChange={(e) => setShippingTimeline(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="ext_desc">Extended Curatorial Essay (Read More)</Label>
            <Textarea
              id="ext_desc"
              placeholder="In-depth studio statement, provenance, or curatorial notes revealed when collectors click 'Read more.'"
              value={extendedDescription}
              onChange={(e) => setExtendedDescription(e.target.value)}
              rows={3}
              className="mt-1.5"
            />
          </div>
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ArtworkDetailsWidget

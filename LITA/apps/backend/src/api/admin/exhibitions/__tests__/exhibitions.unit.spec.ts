import { ExhibitionSchema, UpdateExhibitionSchema } from "../../../middlewares"

describe("Exhibition API schemas & multiple images support", () => {
  const baseValidExhibition = {
    title: "Visions in Light & Form",
    description: "A solo exhibition showcasing contemporary impressionist works.",
    start_date: "2026-12-01",
    end_date: "2026-12-15",
    location: "LITA Gallery, Bangalore",
  }

  it("validates exhibition with single image (backwards compatibility)", () => {
    const result = ExhibitionSchema.safeParse({
      ...baseValidExhibition,
      image_url: "https://example.com/exh-cover.jpg",
      image_alt: "Exhibition Main Hall",
    })
    expect(result.success).toBe(true)
  })

  it("validates exhibition with multiple image objects", () => {
    const result = ExhibitionSchema.safeParse({
      ...baseValidExhibition,
      images: [
        { url: "https://example.com/img1.jpg", alt: "Gallery Entrance" },
        { url: "https://example.com/img2.jpg", alt: "Main Wall" },
        { url: "https://example.com/img3.jpg", alt: "Sculpture Area" },
      ],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.images).toHaveLength(3)
    }
  })

  it("validates exhibition with array of image URLs (string format)", () => {
    const result = ExhibitionSchema.safeParse({
      ...baseValidExhibition,
      images: [
        "https://example.com/photo-1.jpg",
        "https://example.com/photo-2.jpg",
      ],
    })
    expect(result.success).toBe(true)
  })

  it("accepts both primary cover image and multiple images gallery", () => {
    const result = ExhibitionSchema.safeParse({
      ...baseValidExhibition,
      image_url: "https://example.com/cover.jpg",
      image_alt: "Cover image",
      images: [
        { url: "https://example.com/cover.jpg", alt: "Cover image" },
        { url: "https://example.com/side.jpg", alt: "Side view" },
      ],
    })
    expect(result.success).toBe(true)
  })

  it("converts empty string image_url to null safely", () => {
    const result = ExhibitionSchema.safeParse({
      ...baseValidExhibition,
      image_url: "",
      images: [],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.image_url).toBeNull()
    }
  })

  it("allows updating images array partially via UpdateExhibitionSchema", () => {
    const result = UpdateExhibitionSchema.safeParse({
      images: [
        { url: "https://example.com/new1.jpg", alt: "Updated image" },
      ],
    })
    expect(result.success).toBe(true)
  })

  it("rejects end_date before start_date", () => {
    const result = ExhibitionSchema.safeParse({
      ...baseValidExhibition,
      start_date: "2026-12-10",
      end_date: "2026-12-05",
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid image URLs inside images array", () => {
    const result = ExhibitionSchema.safeParse({
      ...baseValidExhibition,
      images: [
        { url: "not-a-valid-url", alt: "Bad URL" },
      ],
    })
    expect(result.success).toBe(false)
  })
})

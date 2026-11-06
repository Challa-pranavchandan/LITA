const { test, describe } = require("node:test")
const assert = require("node:assert")
const fs = require("node:fs")
const path = require("node:path")

describe("Storefront Exhibition Multiple Images Support", () => {
  test("ExhibitionImageGallery component exists and exports ExhibitionImageGallery", () => {
    const galleryPath = path.resolve(
      __dirname,
      "../app/exhibitions/ExhibitionImageGallery.tsx"
    )
    assert.strictEqual(
      fs.existsSync(galleryPath),
      true,
      "Expected ExhibitionImageGallery.tsx to exist"
    )

    const gallerySource = fs.readFileSync(galleryPath, "utf8")
    assert.strictEqual(
      gallerySource.includes("export function ExhibitionImageGallery"),
      true,
      "Expected ExhibitionImageGallery component to be exported"
    )
    assert.strictEqual(
      gallerySource.includes('"use client"'),
      true,
      "Expected ExhibitionImageGallery to be a client component"
    )
  })

  test("Exhibitions page imports ExhibitionImageGallery and supports exhibition.images", () => {
    const pagePath = path.resolve(__dirname, "../app/exhibitions/page.tsx")
    const pageSource = fs.readFileSync(pagePath, "utf8")

    assert.strictEqual(
      pageSource.includes("ExhibitionImageGallery"),
      true,
      "Expected Exhibitions page to import and use ExhibitionImageGallery"
    )
    assert.strictEqual(
      pageSource.includes("images?: Array<ExhibitionImage | string> | null"),
      true,
      "Expected Exhibition type to include images array"
    )
    assert.strictEqual(
      pageSource.includes("images={exhibition.images}"),
      true,
      "Expected ExhibitionCard to pass exhibition.images to ExhibitionImageGallery"
    )
  })

  test("Admin Exhibitions page supports multiple image upload and manager", () => {
    const adminPagePath = path.resolve(
      __dirname,
      "../../../backend/src/admin/routes/exhibitions/page.tsx"
    )
    const adminSource = fs.readFileSync(adminPagePath, "utf8")

    assert.strictEqual(
      adminSource.includes("multiple"),
      true,
      "Expected file input to support multiple attribute"
    )
    assert.strictEqual(
      adminSource.includes("uploadImages"),
      true,
      "Expected uploadImages function to handle multiple file uploads"
    )
    assert.strictEqual(
      adminSource.includes("setCoverImage"),
      true,
      "Expected cover image selector function"
    )
    assert.strictEqual(
      adminSource.includes("images: ExhibitionImage[]"),
      true,
      "Expected form state to maintain images array"
    )
  })
})

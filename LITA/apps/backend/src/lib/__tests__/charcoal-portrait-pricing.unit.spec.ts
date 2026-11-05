import { getCharcoalPortraitPrice } from "../charcoal-portrait-pricing"

describe("getCharcoalPortraitPrice", () => {
  it.each([
    ["A4", 1, 999],
    ["A4", 2, 1499],
    ["A4", 3, 1999],
    ["A3", 1, 1500],
    ["A3", 2, 2100],
  ] as const)("prices %s for %i person(s) at %i rupees", (size, people, expected) => {
    expect(getCharcoalPortraitPrice(size, people)).toBe(expected)
  })

  it.each([
    ["A2", 1],
    ["A4", 0],
    ["A3", 1.5],
    ["A4", Number.MAX_SAFE_INTEGER],
  ])("rejects invalid selection %s with %i person(s)", (size, people) => {
    expect(getCharcoalPortraitPrice(size, people)).toBeNull()
  })
})

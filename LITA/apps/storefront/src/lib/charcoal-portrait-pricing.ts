export type CharcoalPortraitSize = "A4" | "A3"

export function getCharcoalPortraitPrice(
  size: CharcoalPortraitSize,
  personCount: number
): number | null {
  if (!Number.isSafeInteger(personCount) || personCount < 1) {
    return null
  }

  const price =
    size === "A4"
      ? personCount === 1
        ? 999
        : 1499 + (personCount - 2) * 500
      : 1500 + (personCount - 1) * 600

  return Number.isSafeInteger(price) ? price : null
}

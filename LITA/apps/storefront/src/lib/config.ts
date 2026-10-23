export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || "Your Studio",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hello@example.com",
  defaultCountry: (process.env.NEXT_PUBLIC_DEFAULT_COUNTRY || "in").toLowerCase(),
  description:
    "Original artworks and handmade gifts, made in the studio and shipped to your door.",
  pageSize: 24,
};

/** Header navigation. Edit labels and handles to match your Medusa categories and collections. */
export const navigation = {
  browse: [
    { label: "New arrivals", href: "/artworks?sort=newest" },
    { label: "Under ₹5,000", href: "/artworks?max=5000" },
    { label: "Saved", href: "/saved" },
    { label: "All artwork", href: "/artworks" },
  ],
};

export { sdk } from "./medusa";

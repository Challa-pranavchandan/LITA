import Link from "next/link";
import { siteConfig } from "@/lib/config";
import { NewsletterForm } from "@/components/NewsletterForm";

export function Footer() {
  return (
    <footer className="mt-32 border-t border-mist bg-wall">
      <div className="page grid gap-12 py-16 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div>
          <h2 className="text-lg">New work, once a month</h2>
          <p className="mt-1 max-w-sm text-graphite">
            Get a note when new artworks and gifts are released. No other emails.
          </p>
          <NewsletterForm />
        </div>
        <nav aria-label="Shop">
          <h2 className="mb-3 text-sm text-graphite">Shop</h2>
          <ul className="space-y-2">
            <li><Link href="/artworks" className="hover:text-indigo-ink">All artwork</Link></li>
            <li><Link href="/collections" className="hover:text-indigo-ink">Collections</Link></li>
            <li><Link href="/commissions" className="hover:text-indigo-ink">Commissions</Link></li>
            <li><Link href="/saved" className="hover:text-indigo-ink">Saved</Link></li>
          </ul>
        </nav>
        <nav aria-label="Studio">
          <h2 className="mb-3 text-sm text-graphite">Studio</h2>
          <ul className="space-y-2">
            <li><Link href="/about" className="hover:text-indigo-ink">About</Link></li>
            <li><Link href="/contact" className="hover:text-indigo-ink">Contact</Link></li>
            <li><Link href="/shipping" className="hover:text-indigo-ink">Shipping and returns</Link></li>
          </ul>
        </nav>
        <nav aria-label="Account">
          <h2 className="mb-3 text-sm text-graphite">Account</h2>
          <ul className="space-y-2">
            <li><Link href="/account" className="hover:text-indigo-ink">Sign in or register</Link></li>
            <li><Link href="/cart" className="hover:text-indigo-ink">Your bag</Link></li>
          </ul>
        </nav>
      </div>
      <div className="page flex flex-col justify-between gap-2 border-t border-mist py-6 text-sm text-graphite sm:flex-row">
        <p>© {new Date().getFullYear()} {siteConfig.name}. All artwork is original and remains the artist's copyright.</p>
        <p>
          <Link href="/shipping" className="link">Shipping and returns</Link>
        </p>
      </div>
    </footer>
  );
}

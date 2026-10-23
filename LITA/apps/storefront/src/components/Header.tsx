import Link from "next/link";
import { listCategories, listCollections } from "@/lib/data/catalog";
import { getCart } from "@/lib/data/cart";
import { getCustomer } from "@/lib/data/customer";
import { MobileMenu } from "@/components/MobileMenu";
import { PromoBanner } from "@/components/PromoBanner";
import { HeaderNav } from "@/components/HeaderNav";
import { HeaderActions } from "@/components/HeaderActions";
import { UpriseArtLogo } from "@/components/livinIcons";

export async function Header() {
  const [categories, collections, cart, customer] = await Promise.all([
    listCategories().catch(() => []),
    listCollections().catch(() => []),
    getCart().catch(() => null),
    getCustomer().catch(() => null),
  ]);

  return (
    <div className="w-full">
      {/* Top Burgundy Promo Banner */}
      <PromoBanner />

      {/* Main Sticky Header */}
      <header className="sticky top-0 z-40 w-full border-b border-[#EAEAEA] bg-white">
        <div className="relative mx-auto flex h-[72px] lg:h-[80px] w-full items-center justify-between px-6 md:px-10 lg:px-12">
          {/* Left: Mobile menu toggle (if mobile) + LIVININ THE ART Logo */}
          <div className="flex flex-1 items-center justify-start gap-3">
            <div className="lg:hidden">
              <MobileMenu categories={categories} collections={collections} />
            </div>
            <Link
              href="/"
              aria-label="LIVININ THE ART Home"
              className="inline-flex items-center text-[#111111] transition-opacity hover:opacity-75 focus-visible:outline-none"
            >
              <UpriseArtLogo className="text-[11px] md:text-[12px] tracking-[0.25em] font-light text-[#111111]" />
            </Link>
          </div>

          {/* Center: Main Navigation (Desktop) */}
          <div className="hidden lg:flex items-center justify-center">
            <HeaderNav
              categories={categories}
              collections={collections}
            />
          </div>

          {/* Right: Action Icons (Search, Heart/Saved, Cart, User/Account) */}
          <div className="flex flex-1 items-center justify-end">
            <HeaderActions cart={cart} customer={customer} />
          </div>
        </div>
      </header>
    </div>
  );
}

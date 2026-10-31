import { cookies } from "next/headers";
import { listCategories, listCollections } from "@/lib/data/catalog";
import { getCart } from "@/lib/data/cart";
import { getCustomer } from "@/lib/data/customer";
import { MobileMenu } from "@/components/MobileMenu";
import { PromoBanner } from "@/components/PromoBanner";
import { HeaderNav } from "@/components/HeaderNav";
import { HeaderActions } from "@/components/HeaderActions";
import { NavLogo } from "@/components/layout/Navbar";
import { SavedAuthSync } from "@/components/SavedAuthSync";

export async function Header() {
  const cookieStore = await cookies();
  const rawCartId =
    cookieStore.get("_cart_id")?.value ||
    cookieStore.get("_medusa_cart_id")?.value;

  const [categories, collections, cart, customer] = await Promise.all([
    listCategories().catch(() => []),
    listCollections().catch(() => []),
    getCart().catch(() => null),
    getCustomer().catch(() => null),
  ]);

  const hasStaleCart = Boolean(rawCartId && !cart);

  return (
    <div className="w-full">
      <SavedAuthSync isLoggedIn={Boolean(customer)} />
      {/* Top Burgundy Promo Banner */}
      <PromoBanner />

      {/* Main Sticky Header */}
      <header className="sticky top-0 z-40 w-full border-b border-[#EAEAEA] bg-white">
        <div className="relative mx-auto flex h-[72px] lg:h-[80px] w-full items-center justify-between px-6 md:px-10 lg:px-12">
          {/* Left: Mobile menu toggle (if mobile) + LIVININ THE ART Logo */}
          <div className="flex flex-1 items-center justify-start gap-3">
            <div className="lg:hidden">
              <MobileMenu
                categories={categories}
                collections={collections}
                customer={customer}
              />
            </div>
            <NavLogo />
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
            <HeaderActions
              cart={cart}
              customer={customer}
              hasStaleCart={hasStaleCart}
            />
          </div>
        </div>
      </header>
    </div>
  );
}

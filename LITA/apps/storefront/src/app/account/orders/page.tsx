import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomer, listOrders } from "@/lib/data/customer";
import { OrdersList } from "@/components/orders/OrdersList";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your Orders | Livin In The Art",
  description: "View and track your art acquisitions, orders, and delivery statuses.",
};

export default async function AccountOrdersPage() {
  const customer = await getCustomer();
  if (!customer) {
    redirect("/login?next=/account/orders");
  }

  const orders = await listOrders();

  return (
    <div className="bg-white min-h-[calc(100vh-var(--header-h)-120px)] py-12 md:py-16 px-6 md:px-12">
      <div className="max-w-4xl mx-auto">
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/account"
            className="text-xs uppercase tracking-wider text-neutral-500 hover:text-black transition-colors inline-flex items-center gap-1"
          >
            ← Back to Account Dashboard
          </Link>
        </div>

        {/* Page Title */}
        <header className="mb-8 border-b border-[#e5e5e5] pb-5">
          <h1 className="font-cormorant text-3xl sm:text-4xl text-neutral-900 font-normal">
            Your Orders
          </h1>
          <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wider">
            Curated acquisitions and fine art shipments
          </p>
        </header>

        {/* Orders List Component */}
        <OrdersList orders={orders} />
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { getCustomer, listOrders } from "@/lib/data/customer";
import { AuthForms } from "@/components/AuthForms";
import { LogoutButton } from "@/components/LogoutButton";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const customer = await getCustomer();

  if (!customer) {
    return (
      <div className="page py-12">
        <h1 className="mb-8 text-3xl">Account</h1>
        <AuthForms />
        <p className="mt-8 max-w-md text-sm text-graphite">
          You don't need an account to buy. Create one to see past orders in one place.
        </p>
      </div>
    );
  }

  const orders = await listOrders();

  return (
    <div className="page py-12">
      <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl">Hello{customer.first_name ? `, ${customer.first_name}` : ""}</h1>
          <p className="text-graphite">{customer.email}</p>
        </div>
        <LogoutButton />
      </div>

      <h2 className="mb-4 text-xl">Orders</h2>
      {orders.length === 0 ? (
        <div className="border border-mist bg-wall p-8">
          <p className="text-lg">No orders yet.</p>
          <Link href="/artworks" className="btn-line mt-4">Browse artwork</Link>
        </div>
      ) : (
        <ul className="divide-y divide-mist border-y border-mist">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/order/${o.id}`} className="flex flex-wrap items-center justify-between gap-3 py-5 hover:bg-wall sm:px-3">
                <div>
                  <p>Order #{o.display_id}</p>
                  <p className="text-sm text-graphite">
                    {new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} · {(o.items ?? []).reduce((n, i) => n + i.quantity, 0)} items
                  </p>
                </div>
                <p className="tabular-nums">{formatMoney(o.total, o.currency_code)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

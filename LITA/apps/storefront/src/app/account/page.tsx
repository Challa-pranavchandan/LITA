import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomer, listOrders } from "@/lib/data/customer";
import { getCustomerTradeApplication } from "@/lib/data/trade";
import { getCustomerCommissions } from "@/lib/data/commission";
import { AccountDashboard } from "@/components/auth/AccountDashboard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Your Account",
  description: "View your account details, addresses, orders, and followed artists.",
};

export default async function AccountPage() {
  const customer = await getCustomer();

  if (!customer) {
    redirect("/login?next=/account");
  }

  const [orders, tradeApplication, commissions] = await Promise.all([
    listOrders(),
    getCustomerTradeApplication(),
    getCustomerCommissions(),
  ]);

  return (
    <div className="bg-white min-h-[calc(100vh-var(--header-h)-120px)] py-12 md:py-16 px-6 md:px-12">
      <AccountDashboard
        customer={customer}
        orders={orders}
        tradeApplication={tradeApplication}
        commissions={commissions}
      />
    </div>
  );
}

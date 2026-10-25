import { Metadata } from "next"

import ProfilePhone from "@modules/account//components/profile-phone"
import ProfileBillingAddress from "@modules/account/components/profile-billing-address"
import ProfileEmail from "@modules/account/components/profile-email"
import ProfileName from "@modules/account/components/profile-name"
import { notFound } from "next/navigation"
import { listRegions } from "@lib/data/regions"
import { retrieveCustomer } from "@lib/data/customer"
import { getCustomerTradeApplication } from "@/lib/data/trade"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Profile",
  description: "View and edit your Medusa Store profile.",
}

export default async function Profile() {
  const customer = await retrieveCustomer()
  const regions = await listRegions()

  if (!customer || !regions) {
    notFound()
  }

  const tradeApplication = await getCustomerTradeApplication(customer.email)

  return (
    <div className="w-full" data-testid="profile-page-wrapper">
      <div className="mb-8 flex flex-col gap-y-4">
        <h1 className="text-2xl-semi">Profile</h1>
        <p className="text-base-regular">
          View and update your profile information, including your name, email,
          and phone number. You can also update your billing address, or change
          your password.
        </p>
      </div>
      <div className="flex flex-col gap-y-8 w-full">
        <ProfileName customer={customer} />
        <Divider />
        <ProfileEmail customer={customer} />
        <Divider />
        <ProfilePhone customer={customer} />
        <Divider />
        {/* <ProfilePassword customer={customer} />
        <Divider /> */}
        <ProfileBillingAddress customer={customer} regions={regions} />
        <Divider />
        <div className="flex flex-col gap-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl-semi">Trade Program</h2>
            {tradeApplication ? (
              <span
                className={`px-2.5 py-0.5 text-xs font-semibold rounded-full uppercase tracking-wider ${
                  tradeApplication.status === "approved"
                    ? "bg-green-100 text-green-800"
                    : tradeApplication.status === "rejected"
                    ? "bg-red-100 text-red-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {tradeApplication.status}
              </span>
            ) : (
              <span className="text-xs text-ui-fg-muted">Not applied</span>
            )}
          </div>
          <p className="text-base-regular text-ui-fg-subtle">
            {tradeApplication?.status === "approved"
              ? "Your trade application is approved. You have full access to designer pricing and trade advisory benefits."
              : tradeApplication?.status === "pending"
              ? `Your application for ${tradeApplication.company || "Trade Membership"} is currently under review by our Art Advisory desk.`
              : tradeApplication?.status === "rejected"
              ? "Your trade application could not be approved at this time."
              : "Interior designers, architects, and art consultants enjoy exclusive trade pricing and dedicated curation."}
          </p>
          <div className="mt-2">
            <Link
              href="/account"
              className="text-sm underline underline-offset-4 text-ui-fg-base hover:opacity-75"
            >
              Manage in Account Dashboard →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

const Divider = () => {
  return <div className="w-full h-px bg-gray-200" />
}

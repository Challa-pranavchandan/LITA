"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { HttpTypes } from "@medusajs/types";
import { logout, changePassword, updateProfile } from "@/lib/data/customer";
import type { TradeApplication } from "@/lib/data/trade";
import type { Commission } from "@/lib/data/commission";
import { TradeApplicationModal } from "@/components/TradeApplicationModal";
import { CommissionsAccountTab } from "@/components/auth/CommissionsAccountTab";

export function AccountDashboard({
  customer,
  orders,
  tradeApplication,
  commissions = [],
}: {
  customer: HttpTypes.StoreCustomer;
  orders: HttpTypes.StoreOrder[];
  tradeApplication?: TradeApplication | null;
  commissions?: Commission[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"orders" | "commissions" | "trade" | "profile" | "password">("orders");
  const [tradeApp, setTradeApp] = useState<TradeApplication | null>(tradeApplication || null);
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const commissionsList = commissions;
  const quotedCount = commissionsList.filter((c) => c.status === "quoted").length;

  // Profile update state
  const [firstName, setFirstName] = useState(customer.first_name || "");
  const [lastName, setLastName] = useState(customer.last_name || "");
  const [marketingOptIn, setMarketingOptIn] = useState(
    Boolean(customer.metadata?.marketing_opt_in)
  );
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profilePending, startProfileTransition] = useTransition();

  // Password update state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<{ text: string; error: boolean } | null>(
    null
  );
  const [passwordPending, startPasswordTransition] = useTransition();

  // Logout state
  const [logoutPending, startLogoutTransition] = useTransition();

  function handleLogout() {
    startLogoutTransition(async () => {
      await logout();
      router.push("/login");
      router.refresh();
    });
  }

  function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileMessage(null);
    startProfileTransition(async () => {
      const res = await updateProfile({
        first_name: firstName,
        last_name: lastName,
        marketing_opt_in: marketingOptIn,
      });
      if (res.ok) {
        setProfileMessage("Your details have been saved.");
      } else {
        setProfileMessage(res.error || "Failed to update details.");
      }
    });
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword.length < 8) {
      setPasswordMessage({ text: "New password must be at least 8 characters.", error: true });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ text: "New passwords do not match.", error: true });
      return;
    }

    startPasswordTransition(async () => {
      const res = await changePassword(currentPassword, newPassword);
      if (res.ok) {
        setPasswordMessage({ text: "Password updated successfully.", error: false });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordMessage({ text: res.error || "Could not update password.", error: true });
      }
    });
  }

  return (
    <div className="w-full max-w-[800px] mx-auto">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-8 mb-8 border-b border-[#EAEAEA]">
        <div>
          <h1 className="font-cormorant text-[40px] md:text-[56px] font-normal leading-[1.05] tracking-tight text-[#3a3a3a]">
            {customer.first_name ? `Welcome, ${customer.first_name}` : "My Account"}
          </h1>
          <p className="text-[14px] text-[#6b6b6b] mt-1">{customer.email}</p>
        </div>

        <button
          onClick={handleLogout}
          disabled={logoutPending}
          className="self-start sm:self-auto inline-flex items-center justify-center px-6 h-[40px] rounded-full border border-[#3a3a3a] bg-transparent text-[#3a3a3a] text-[13px] hover:bg-[#3a3a3a] hover:text-white transition-colors duration-150 disabled:opacity-50 cursor-pointer"
        >
          {logoutPending ? "Signing out…" : "Sign Out"}
        </button>
      </div>

      {/* Editorial Navigation Tabs */}
      <div className="flex flex-wrap gap-x-8 gap-y-4 border-b border-[#EAEAEA] mb-8 pb-3">
        {(
          [
            { id: "orders", label: `Order History (${orders.length})` },
            {
              id: "commissions",
              label: `Commissions (${commissionsList.length})`,
              badge: quotedCount > 0 ? (
                <span className="ml-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-amber-50 text-amber-900 border border-amber-300 animate-pulse">
                  Quote Ready
                </span>
              ) : null,
            },
            {
              id: "trade",
              label: "Trade Program",
              badge: tradeApp ? (
                <span
                  className={`ml-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full ${
                    tradeApp.status === "approved"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : tradeApp.status === "rejected"
                      ? "bg-red-50 text-red-800 border border-red-200"
                      : "bg-amber-50 text-amber-800 border border-amber-200"
                  }`}
                >
                  {tradeApp.status === "approved" ? "Active" : tradeApp.status}
                </span>
              ) : null,
            },
            { id: "profile", label: "Profile & Preferences" },
            { id: "password", label: "Change Password" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`text-[14px] font-semibold font-hanken transition-colors cursor-pointer relative pb-3 -mb-3 flex items-center ${
              activeTab === tab.id
                ? "text-[#3a3a3a] border-b-2 border-[#3a3a3a]"
                : "text-[#888888] hover:text-[#3a3a3a]"
            }`}
          >
            <span>{tab.label}</span>
            {"badge" in tab && tab.badge}
          </button>
        ))}
      </div>

      {/* Tab: Orders */}
      {activeTab === "orders" && (
        <div>
          {orders.length === 0 ? (
            <div className="py-12 px-6 bg-[#f9f9f9] border border-[#eeeeee] text-left">
              <p className="text-[16px] text-[#3a3a3a] mb-2 font-medium">No orders yet</p>
              <p className="text-[14px] text-[#6b6b6b] mb-6">
                When you acquire artworks from our collection, your acquisitions and tracking
                history will be displayed here.
              </p>
              <Link
                href="/artworks"
                className="inline-flex items-center justify-center px-6 h-[44px] rounded-full border border-[#3a3a3a] bg-transparent text-[#3a3a3a] text-[14px] hover:bg-[#3a3a3a] hover:text-white transition-colors duration-150"
              >
                Explore Artworks
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#eeeeee] border-y border-[#eeeeee]">
              {orders.map((o) => {
                const totalItems = (o.items ?? []).reduce((n, i) => n + i.quantity, 0);
                return (
                  <div
                    key={o.id}
                    className="py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-[16px] font-semibold text-[#3a3a3a]">
                          Order #{o.display_id}
                        </span>
                        {o.status && (
                          <span className="text-[11px] uppercase tracking-wider px-2 py-0.5 bg-[#f4f4f4] text-[#6b6b6b]">
                            {o.status}
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] text-[#6b6b6b] mt-1">
                        {new Date(o.created_at).toLocaleDateString("en-US", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}{" "}
                        · {totalItems} {totalItems === 1 ? "piece" : "pieces"}
                      </p>
                    </div>

                    <div className="flex items-center gap-6">
                      <span className="text-[15px] font-medium text-[#3a3a3a] tabular-nums">
                        {formatMoney(o.total, o.currency_code)}
                      </span>
                      <Link
                        href={`/order/${o.id}`}
                        className="text-[13px] text-[#3a3a3a] underline underline-offset-4 decoration-[#3a3a3a] hover:opacity-75 transition-opacity"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Commissions */}
      {activeTab === "commissions" && (
        <div className="space-y-6">
          <CommissionsAccountTab initialCommissions={commissionsList} />
        </div>
      )}

      {/* Tab: Trade Program */}
      {activeTab === "trade" && (
        <div className="space-y-6">
          {tradeApp ? (
            <div className="border border-[#E5E5E5] bg-[#FAF9F7] p-7 sm:p-10 text-left space-y-6">
              {/* Header Status Row */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-[#E5E5E5]">
                <div>
                  <div className="inline-flex items-center gap-2 mb-3">
                    {tradeApp.status === "approved" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-900 text-[11px] font-semibold tracking-wider uppercase rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        Approved • Active Trade Member
                      </span>
                    )}
                    {tradeApp.status === "pending" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-900 text-[11px] font-semibold tracking-wider uppercase rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                        Application Pending Review
                      </span>
                    )}
                    {tradeApp.status === "rejected" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-900 text-[11px] font-semibold tracking-wider uppercase rounded-full">
                        Application Not Approved
                      </span>
                    )}
                  </div>
                  <h2
                    className="font-cormorant text-3xl sm:text-4xl text-[#111111] font-normal leading-tight"
                    style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
                  >
                    {tradeApp.status === "approved"
                      ? "Trade Program Membership"
                      : tradeApp.status === "pending"
                      ? "Application Under Review"
                      : "Trade Application Status"}
                  </h2>
                  <p className="text-[14px] text-[#555555] mt-1.5 leading-relaxed">
                    {tradeApp.status === "approved"
                      ? "Welcome to the LITA Trade Program. Your exclusive design partner privileges are active."
                      : tradeApp.status === "pending"
                      ? "Your application has been received and is being verified by our Art Advisory desk."
                      : "Your previous application was not approved. You can submit an updated application below."}
                  </p>
                </div>

                {tradeApp.status === "approved" && (
                  <Link
                    href="/artworks"
                    className="self-start sm:self-auto inline-flex items-center justify-center px-6 py-2.5 rounded-full border border-[#111111] bg-[#111111] text-white text-[13px] font-medium hover:bg-neutral-800 transition-colors shrink-0 shadow-sm"
                  >
                    Browse Collection
                  </Link>
                )}

                {tradeApp.status === "rejected" && (
                  <button
                    type="button"
                    onClick={() => setTradeModalOpen(true)}
                    className="self-start sm:self-auto inline-flex items-center justify-center px-6 py-2.5 rounded-full border border-[#111111] bg-[#111111] text-white text-[13px] font-medium hover:bg-neutral-800 transition-colors shrink-0 cursor-pointer shadow-sm"
                  >
                    Re-apply
                  </button>
                )}
              </div>

              {/* Application Details Summary */}
              <div>
                <h3 className="text-xs uppercase tracking-wider font-semibold text-[#777777] mb-3">
                  Application Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
                  <div className="bg-white p-4 border border-[#EBEBEB]">
                    <span className="text-[11px] uppercase tracking-wider text-[#888888] block mb-1">
                      Applicant Name
                    </span>
                    <span className="text-[#111111] font-medium text-[15px] block">{tradeApp.name}</span>
                    <span className="text-[#777777] text-xs font-mono">{tradeApp.email}</span>
                  </div>

                  <div className="bg-white p-4 border border-[#EBEBEB]">
                    <span className="text-[11px] uppercase tracking-wider text-[#888888] block mb-1">
                      Studio / Firm
                    </span>
                    <span className="text-[#111111] font-medium text-[15px] block">
                      {tradeApp.company || "Independent Professional"}
                    </span>
                    <span className="text-[#777777] text-xs">{tradeApp.role || "Design Discipline"}</span>
                  </div>

                  <div className="bg-white p-4 border border-[#EBEBEB]">
                    <span className="text-[11px] uppercase tracking-wider text-[#888888] block mb-1">
                      Application Date
                    </span>
                    <span className="text-[#111111] font-medium text-[14px] block">
                      {new Date(tradeApp.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                    <span className="text-[#777777] text-xs">
                      {tradeApp.status === "approved" ? "Status: Verified" : "Status: In Queue"}
                    </span>
                  </div>

                  <div className="bg-white p-4 border border-[#EBEBEB]">
                    <span className="text-[11px] uppercase tracking-wider text-[#888888] block mb-1">
                      Phone & Portfolio
                    </span>
                    <span className="text-[#111111] font-medium text-[14px] block">
                      {tradeApp.phone || "No phone provided"}
                    </span>
                    {tradeApp.website ? (
                      <a
                        href={tradeApp.website.startsWith("http") ? tradeApp.website : `https://${tradeApp.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#111111] text-xs underline underline-offset-2 hover:opacity-75 truncate block mt-0.5"
                      >
                        {tradeApp.website}
                      </a>
                    ) : (
                      <span className="text-[#777777] text-xs">No website provided</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Message / Project Scope Preview */}
              {tradeApp.message && (
                <div className="bg-white p-5 border border-[#EBEBEB] text-[13px]">
                  <span className="text-[11px] uppercase tracking-wider text-[#888888] block mb-1.5 font-medium">
                    Project Scope / Notes
                  </span>
                  <p className="text-[#444444] text-[14px] leading-relaxed whitespace-pre-wrap">
                    {tradeApp.message}
                  </p>
                </div>
              )}

              {/* Privileges or Expedite Banner */}
              {tradeApp.status === "approved" ? (
                <div className="bg-white p-6 border border-[#EAEAEA] space-y-3">
                  <h3 className="text-xs uppercase tracking-wider font-semibold text-[#111111]">
                    Your Active Trade Privileges
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px] text-[#444444]">
                    <div className="flex items-start gap-2.5">
                      <span className="text-emerald-700 font-bold">✓</span>
                      <span>Exclusive trade discount applied across all works</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="text-emerald-700 font-bold">✓</span>
                      <span>Dedicated art advisor moodboards & approvals</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="text-emerald-700 font-bold">✓</span>
                      <span>Custom sizing, frame mockups & commissions</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="text-emerald-700 font-bold">✓</span>
                      <span>White-glove courier & scheduled site delivery</span>
                    </div>
                  </div>
                </div>
              ) : tradeApp.status === "pending" ? (
                <div className="bg-[#F0EFEB] p-5 border border-[#E0DED7] text-[13px] text-[#555555] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="font-semibold text-[#111111] block mb-0.5">
                      Need trade pricing for an immediate proposal?
                    </span>
                    <span>
                      Our advisory desk can expedite verification for imminent presentation decks and project proposals.
                    </span>
                  </div>
                  <Link
                    href="/trade"
                    className="shrink-0 text-xs font-semibold text-[#111111] underline underline-offset-4 hover:opacity-75"
                  >
                    Learn More
                  </Link>
                </div>
              ) : null}
            </div>
          ) : (
            /* Not Applied Yet */
            <div className="border border-[#E5E5E5] bg-[#FAF9F7] p-8 sm:p-12 text-left space-y-8">
              <div>
                <span className="text-[11px] font-sans font-medium uppercase tracking-[0.2em] text-[#888888] block mb-2">
                  Trade & Advisory
                </span>
                <h2
                  className="font-cormorant text-3xl sm:text-4xl text-[#111111] font-normal leading-tight"
                  style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
                >
                  Join the LITA Trade Program
                </h2>
                <p className="text-[15px] text-[#555555] mt-2 max-w-xl leading-relaxed">
                  Tailored for interior designers, architects, commercial developers, and art consultants. Members receive tier pricing, dedicated art advisory, custom commissions, and white-glove logistics.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-[13px]">
                <div className="bg-white p-5 border border-[#EBEBEB]">
                  <span className="font-semibold text-[#111111] block mb-1.5 text-[14px]">
                    Exclusive Trade Pricing
                  </span>
                  <p className="text-[#666666] leading-relaxed">
                    Tiered designer pricing across original fine art, sculptures, and limited releases.
                  </p>
                </div>
                <div className="bg-white p-5 border border-[#EBEBEB]">
                  <span className="font-semibold text-[#111111] block mb-1.5 text-[14px]">
                    Dedicated Art Advisor
                  </span>
                  <p className="text-[#666666] leading-relaxed">
                    Personal curation based on your project moodboards, renderings, and floor plans.
                  </p>
                </div>
                <div className="bg-white p-5 border border-[#EBEBEB]">
                  <span className="font-semibold text-[#111111] block mb-1.5 text-[14px]">
                    Logistics Concierge
                  </span>
                  <p className="text-[#666666] leading-relaxed">
                    Seamless custom framing, insured crating, and white-glove installation coordination.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setTradeModalOpen(true)}
                  className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-[#111111] bg-[#111111] text-white text-[14px] font-medium hover:bg-neutral-800 transition-colors cursor-pointer shadow-sm"
                >
                  Apply for Trade Program
                </button>
                <Link
                  href="/trade"
                  className="text-[13px] text-[#555555] hover:text-[#111111] underline underline-offset-4"
                >
                  Explore program details & case studies
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Profile */}
      {activeTab === "profile" && (
        <form onSubmit={handleProfileSubmit} className="space-y-6 max-w-[480px] text-left">
          <div>
            <label className="block text-[14px] font-semibold text-[#3a3a3a] mb-2 font-hanken">
              First Name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="w-full h-[62px] bg-[#f4f4f4] border-0 border-b border-[#3a3a3a] rounded-none px-[18px] text-[15px] text-[#3a3a3a] focus:outline-none focus:border-b-2 focus:border-black focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-[14px] font-semibold text-[#3a3a3a] mb-2 font-hanken">
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="w-full h-[62px] bg-[#f4f4f4] border-0 border-b border-[#3a3a3a] rounded-none px-[18px] text-[15px] text-[#3a3a3a] focus:outline-none focus:border-b-2 focus:border-black focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-[14px] font-semibold text-[#3a3a3a] mb-2 font-hanken">
              Email
            </label>
            <input
              type="email"
              value={customer.email}
              disabled
              className="w-full h-[62px] bg-[#ebebeb] border-0 border-b border-[#3a3a3a] rounded-none px-[18px] text-[15px] text-[#777777] cursor-not-allowed"
            />
            <p className="mt-1 text-[12px] text-[#888888]">
              To change your primary email address, please contact gallery support.
            </p>
          </div>

          <div className="flex items-start gap-3 pt-2">
            <input
              id="account-marketing-opt"
              type="checkbox"
              checked={marketingOptIn}
              onChange={(e) => setMarketingOptIn(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded-none border border-[#3a3a3a] text-[#3a3a3a] focus:ring-0 cursor-pointer accent-[#3a3a3a]"
            />
            <label
              htmlFor="account-marketing-opt"
              className="text-[13px] leading-snug text-[#6b6b6b] cursor-pointer"
            >
              Email me about new releases, exhibitions, and exclusive offers.
            </label>
          </div>

          {/* Trade Membership Status Summary */}
          <div className="pt-6 border-t border-[#EAEAEA]">
            <div className="flex items-center justify-between">
              <div>
                <span className="block text-[14px] font-semibold text-[#3a3a3a] font-hanken">
                  Trade Program Membership
                </span>
                <span className="text-[13px] text-[#777777] mt-0.5 block">
                  {tradeApp?.status === "approved"
                    ? "Status: Active Trade Member"
                    : tradeApp?.status === "pending"
                    ? "Status: Application Under Review"
                    : tradeApp?.status === "rejected"
                    ? "Status: Application Not Approved"
                    : "Status: Not enrolled"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("trade")}
                className="text-[13px] font-medium text-[#111111] underline underline-offset-4 hover:opacity-75 cursor-pointer"
              >
                {tradeApp ? "View Details" : "Apply"}
              </button>
            </div>
          </div>

          {profileMessage && (
            <p
              role="alert"
              className={`text-[13px] ${
                profileMessage.includes("saved") ? "text-green-700" : "text-[#b3261e]"
              }`}
            >
              {profileMessage}
            </p>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={profilePending}
              className="inline-flex items-center justify-center w-[130px] h-[46px] rounded-full border border-[#3a3a3a] bg-transparent text-[#3a3a3a] text-[15px] hover:bg-[#3a3a3a] hover:text-white transition-colors duration-150 disabled:opacity-50 cursor-pointer"
            >
              {profilePending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      )}

      {/* Tab: Password */}
      {activeTab === "password" && (
        <form onSubmit={handlePasswordSubmit} className="space-y-6 max-w-[480px] text-left">
          <div>
            <label className="block text-[14px] font-semibold text-[#3a3a3a] mb-2 font-hanken">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              placeholder="Enter your current password"
              className="w-full h-[62px] bg-[#f4f4f4] border-0 border-b border-[#3a3a3a] rounded-none px-[18px] text-[15px] text-[#3a3a3a] placeholder:text-[#6b6b6b] focus:outline-none focus:border-b-2 focus:border-black focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-[14px] font-semibold text-[#3a3a3a] mb-2 font-hanken">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Enter new password (min. 8 characters)"
              className="w-full h-[62px] bg-[#f4f4f4] border-0 border-b border-[#3a3a3a] rounded-none px-[18px] text-[15px] text-[#3a3a3a] placeholder:text-[#6b6b6b] focus:outline-none focus:border-b-2 focus:border-black focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-[14px] font-semibold text-[#3a3a3a] mb-2 font-hanken">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Confirm new password"
              className="w-full h-[62px] bg-[#f4f4f4] border-0 border-b border-[#3a3a3a] rounded-none px-[18px] text-[15px] text-[#3a3a3a] placeholder:text-[#6b6b6b] focus:outline-none focus:border-b-2 focus:border-black focus:ring-1 focus:ring-black"
            />
          </div>

          {passwordMessage && (
            <p
              role="alert"
              className={`text-[13px] ${
                passwordMessage.error ? "text-[#b3261e]" : "text-green-700"
              }`}
            >
              {passwordMessage.text}
            </p>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={passwordPending}
              className="inline-flex items-center justify-center w-[130px] h-[46px] rounded-full border border-[#3a3a3a] bg-transparent text-[#3a3a3a] text-[15px] hover:bg-[#3a3a3a] hover:text-white transition-colors duration-150 disabled:opacity-50 cursor-pointer"
            >
              {passwordPending ? "Updating…" : "Update"}
            </button>
          </div>
        </form>
      )}

      {/* Trade Application Modal */}
      <TradeApplicationModal
        isOpen={tradeModalOpen}
        onClose={() => {
          setTradeModalOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}

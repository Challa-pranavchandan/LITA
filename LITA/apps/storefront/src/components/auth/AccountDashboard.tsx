"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { HttpTypes } from "@medusajs/types";
import { logout, changePassword, updateProfile } from "@/lib/data/customer";
import { formatMoney } from "@/lib/format";

export function AccountDashboard({
  customer,
  orders,
}: {
  customer: HttpTypes.StoreCustomer;
  orders: HttpTypes.StoreOrder[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"orders" | "profile" | "password">("orders");

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
      <div className="flex gap-8 border-b border-[#EAEAEA] mb-8 pb-3">
        {(
          [
            { id: "orders", label: `Order History (${orders.length})` },
            { id: "profile", label: "Profile & Preferences" },
            { id: "password", label: "Change Password" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`text-[14px] font-semibold font-hanken transition-colors cursor-pointer relative pb-3 -mb-3 ${
              activeTab === tab.id
                ? "text-[#3a3a3a] border-b-2 border-[#3a3a3a]"
                : "text-[#888888] hover:text-[#3a3a3a]"
            }`}
          >
            {tab.label}
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
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { HttpTypes } from "@medusajs/types";
import {
  logout,
  changePassword,
  updateProfile,
  addCustomerAddress,
  deleteCustomerAddress,
  updateCustomerAddress,
} from "@/lib/data/customer";
import type { TradeApplication } from "@/lib/data/trade";
import type { Commission } from "@/lib/data/commission";
import { TradeApplicationModal } from "@/components/TradeApplicationModal";
import { formatMoney } from "@/lib/format";
import {
  useFollowedArtists,
  toggleFollowArtist,
} from "@/lib/followed-artists";

interface AccountDashboardProps {
  customer: HttpTypes.StoreCustomer;
  orders: HttpTypes.StoreOrder[];
  tradeApplication?: TradeApplication | null;
  commissions?: Commission[];
}

export function AccountDashboard({
  customer,
  orders,
  tradeApplication,
  commissions = [],
}: AccountDashboardProps) {
  const router = useRouter();
  const followedArtists = useFollowedArtists();

  // Modals & form state
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<HttpTypes.StoreCustomerAddress | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [commissionsModalOpen, setCommissionsModalOpen] = useState(false);

  // Profile update state
  const [firstName, setFirstName] = useState(customer.first_name || "");
  const [lastName, setLastName] = useState(customer.last_name || "");
  const [marketingOptIn, setMarketingOptIn] = useState(
    Boolean(customer.metadata?.marketing_opt_in)
  );
  const [profileMessage, setProfileMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [profilePending, startProfileTransition] = useTransition();

  // Password update state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [passwordPending, startPasswordTransition] = useTransition();

  // Address form state
  const [addrFirstName, setAddrFirstName] = useState("");
  const [addrLastName, setAddrLastName] = useState("");
  const [addrCompany, setAddrCompany] = useState("");
  const [addrAddress1, setAddrAddress1] = useState("");
  const [addrAddress2, setAddrAddress2] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrProvince, setAddrProvince] = useState("");
  const [addrPostalCode, setAddrPostalCode] = useState("");
  const [addrCountryCode, setAddrCountryCode] = useState("us");
  const [addrPhone, setAddrPhone] = useState("");
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressPending, startAddressTransition] = useTransition();

  // Logout state
  const [logoutPending, startLogoutTransition] = useTransition();

  const displayName =
    customer.first_name || customer.last_name
      ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim()
      : "Amber Hearn";

  function handleLogout() {
    startLogoutTransition(async () => {
      await logout();
      router.push("/login");
      router.refresh();
    });
  }

  function scrollToSection(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function openNewAddressModal() {
    setEditingAddress(null);
    setAddrFirstName(customer.first_name || "");
    setAddrLastName(customer.last_name || "");
    setAddrCompany("");
    setAddrAddress1("");
    setAddrAddress2("");
    setAddrCity("");
    setAddrProvince("");
    setAddrPostalCode("");
    setAddrCountryCode("us");
    setAddrPhone(customer.phone || "");
    setAddressError(null);
    setAddressModalOpen(true);
  }

  function openEditAddressModal(addr: HttpTypes.StoreCustomerAddress) {
    setEditingAddress(addr);
    setAddrFirstName(addr.first_name || "");
    setAddrLastName(addr.last_name || "");
    setAddrCompany(addr.company || "");
    setAddrAddress1(addr.address_1 || "");
    setAddrAddress2(addr.address_2 || "");
    setAddrCity(addr.city || "");
    setAddrProvince(addr.province || "");
    setAddrPostalCode(addr.postal_code || "");
    setAddrCountryCode(addr.country_code || "us");
    setAddrPhone(addr.phone || "");
    setAddressError(null);
    setAddressModalOpen(true);
  }

  function handleAddressSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAddressError(null);

    if (!addrAddress1 || !addrCity || !addrPostalCode) {
      setAddressError("Please complete all required address fields.");
      return;
    }

    startAddressTransition(async () => {
      const payload = {
        first_name: addrFirstName,
        last_name: addrLastName,
        company: addrCompany,
        address_1: addrAddress1,
        address_2: addrAddress2,
        city: addrCity,
        province: addrProvince,
        postal_code: addrPostalCode,
        country_code: addrCountryCode.toLowerCase(),
        phone: addrPhone,
      };

      let res;
      if (editingAddress?.id) {
        res = await updateCustomerAddress(editingAddress.id, payload);
      } else {
        res = await addCustomerAddress(payload);
      }

      if (res.ok) {
        setAddressModalOpen(false);
        router.refresh();
      } else {
        setAddressError(res.error || "Failed to save address.");
      }
    });
  }

  function handleDeleteAddress(id: string) {
    if (!confirm("Are you sure you want to remove this address?")) return;
    startAddressTransition(async () => {
      await deleteCustomerAddress(id);
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
        setProfileMessage({ text: "Account details updated successfully.", error: false });
        setTimeout(() => {
          setProfileModalOpen(false);
          setProfileMessage(null);
        }, 1200);
        router.refresh();
      } else {
        setProfileMessage({ text: res.error || "Failed to update profile.", error: true });
      }
    });
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword.length < 8) {
      setPasswordMessage({ text: "Password must be at least 8 characters.", error: true });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ text: "Passwords do not match.", error: true });
      return;
    }

    startPasswordTransition(async () => {
      const res = await changePassword(currentPassword, newPassword);
      if (res.ok) {
        setPasswordMessage({ text: "Password updated successfully.", error: false });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          setPasswordModalOpen(false);
          setPasswordMessage(null);
        }, 1200);
      } else {
        setPasswordMessage({ text: res.error || "Could not update password.", error: true });
      }
    });
  }

  const addresses = customer.addresses || [];

  return (
    <div className="w-full max-w-[1120px] mx-auto text-left">
      {/* 1. Header: "Your Account" centered */}
      <div className="text-center pb-8">
        <h1 className="font-cormorant text-4xl sm:text-5xl md:text-[54px] font-normal text-[#1a1a1a] tracking-tight">
          Your Account
        </h1>
      </div>

      {/* Horizontal divider line stretching across */}
      <hr className="w-full border-t border-[#e5e5e5] mb-12 md:mb-16" />

      {/* 2. Main Two-Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[220px_1fr] gap-12 md:gap-16 lg:gap-24 items-start">
        {/* Left Navigation Sidebar */}
        <aside className="md:sticky md:top-28">
          <nav aria-label="Account navigation">
            <ul className="flex flex-col space-y-4 text-[15px] font-sans text-[#333333]">
              <li>
                <button
                  type="button"
                  onClick={() => scrollToSection("account-details")}
                  className="text-left hover:text-black hover:opacity-75 transition-opacity cursor-pointer"
                >
                  Account Details
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollToSection("your-addresses")}
                  className="text-left hover:text-black hover:opacity-75 transition-opacity cursor-pointer"
                >
                  Your Addresses
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollToSection("your-orders")}
                  className="text-left hover:text-black hover:opacity-75 transition-opacity cursor-pointer"
                >
                  Your Orders
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollToSection("followed-artists")}
                  className="text-left hover:text-black hover:opacity-75 transition-opacity cursor-pointer"
                >
                  Followed Artists
                </button>
              </li>
              {commissions.length > 0 && (
                <li>
                  <button
                    type="button"
                    onClick={() => setCommissionsModalOpen(true)}
                    className="text-left hover:text-black hover:opacity-75 transition-opacity cursor-pointer flex items-center gap-2"
                  >
                    <span>Commissions</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 font-medium">
                      {commissions.length}
                    </span>
                  </button>
                </li>
              )}
              <li>
                <button
                  type="button"
                  onClick={() => setTradeModalOpen(true)}
                  className="text-left hover:text-black hover:opacity-75 transition-opacity cursor-pointer"
                >
                  {tradeApplication?.status === "approved"
                    ? "Trade Membership"
                    : tradeApplication?.status === "pending"
                    ? "Trade Status"
                    : "Trade Signup"}
                </button>
              </li>
              <li className="pt-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={logoutPending}
                  className="text-left text-[#555555] hover:text-black hover:opacity-75 transition-opacity cursor-pointer disabled:opacity-50"
                >
                  {logoutPending ? "Signing out…" : "Logout"}
                </button>
              </li>
            </ul>
          </nav>
        </aside>

        {/* Right Main Content Sections */}
        <main className="w-full max-w-[760px] space-y-16 md:space-y-20">
          {/* SECTION 1: Account Details */}
          <section id="account-details" className="scroll-mt-32">
            <h2 className="font-cormorant text-3xl md:text-[34px] font-normal text-[#1a1a1a] mb-4">
              Account Details
            </h2>

            <div className="space-y-1 text-[15px] text-[#333333]">
              <p className="font-normal text-[#1a1a1a]">{displayName}</p>
              <p className="text-[#555555]">{customer.email}</p>
            </div>

            {/* Quick action controls for editing profile & password */}
            <div className="flex items-center gap-6 mt-4 pt-2">
              <button
                type="button"
                onClick={() => setProfileModalOpen(true)}
                className="text-[13px] text-[#222222] underline underline-offset-4 hover:opacity-75 transition-opacity cursor-pointer"
              >
                Edit details
              </button>
              <button
                type="button"
                onClick={() => setPasswordModalOpen(true)}
                className="text-[13px] text-[#222222] underline underline-offset-4 hover:opacity-75 transition-opacity cursor-pointer"
              >
                Change password
              </button>
            </div>
          </section>

          {/* SECTION 2: Your Addresses */}
          <section id="your-addresses" className="scroll-mt-32">
            <h2 className="font-cormorant text-3xl md:text-[34px] font-normal text-[#1a1a1a] mb-4">
              Your Addresses
            </h2>

            {addresses.length === 0 ? (
              <div>
                <p className="text-[15px] text-[#555555] mb-6">
                  You have not added any addresses
                </p>
                <div className="flex justify-center pt-2 pb-4">
                  <button
                    type="button"
                    onClick={openNewAddressModal}
                    className="inline-flex items-center justify-center px-8 py-2.5 rounded-full border border-[#222222] bg-white text-[#222222] text-[14px] hover:bg-[#222222] hover:text-white transition-colors duration-200 cursor-pointer"
                  >
                    Add new address +
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className="border border-[#e5e5e5] p-5 rounded-none bg-white relative flex flex-col justify-between"
                    >
                      <div className="text-[14px] text-[#444444] space-y-1">
                        <p className="font-medium text-[#111111]">
                          {addr.first_name} {addr.last_name}
                        </p>
                        {addr.company && <p className="text-xs text-[#777777]">{addr.company}</p>}
                        <p>{addr.address_1}</p>
                        {addr.address_2 && <p>{addr.address_2}</p>}
                        <p>
                          {addr.city}
                          {addr.province ? `, ${addr.province}` : ""} {addr.postal_code}
                        </p>
                        <p className="uppercase text-xs tracking-wider text-[#777777]">
                          {addr.country_code}
                        </p>
                        {addr.phone && <p className="text-xs text-[#777777] pt-1">{addr.phone}</p>}
                      </div>

                      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[#f0f0f0] text-xs">
                        <button
                          type="button"
                          onClick={() => openEditAddressModal(addr)}
                          className="text-[#222222] underline underline-offset-2 hover:opacity-75 cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="text-[#888888] hover:text-red-700 underline underline-offset-2 transition-colors cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={openNewAddressModal}
                    className="inline-flex items-center justify-center px-8 py-2.5 rounded-full border border-[#222222] bg-white text-[#222222] text-[14px] hover:bg-[#222222] hover:text-white transition-colors duration-200 cursor-pointer"
                  >
                    Add new address +
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* SECTION 3: Your Orders */}
          <section id="your-orders" className="scroll-mt-32">
            <h2 className="font-cormorant text-3xl md:text-[34px] font-normal text-[#1a1a1a] mb-2">
              Your Orders
            </h2>
            <p className="text-[14px] text-[#555555] mb-4">Orders ({orders.length})</p>

            <hr className="w-full border-t border-[#e5e5e5] mb-6" />

            {orders.length > 0 && (
              <div className="divide-y divide-[#eeeeee]">
                {orders.map((o) => {
                  const totalItems = (o.items ?? []).reduce((n, i) => n + i.quantity, 0);
                  return (
                    <div
                      key={o.id}
                      className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="text-[15px] font-medium text-[#222222]">
                            Order #{o.display_id}
                          </span>
                          {o.status && (
                            <span className="text-[11px] uppercase tracking-wider px-2 py-0.5 bg-[#f4f4f4] text-[#6b6b6b]">
                              {o.status}
                            </span>
                          )}
                        </div>
                        <p className="text-[13px] text-[#777777] mt-1">
                          {new Date(o.created_at).toLocaleDateString("en-US", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}{" "}
                          · {totalItems} {totalItems === 1 ? "piece" : "pieces"}
                        </p>
                      </div>

                      <div className="flex items-center gap-6">
                        <span className="text-[15px] font-medium text-[#222222] tabular-nums">
                          {formatMoney(o.total, o.currency_code)}
                        </span>
                        <Link
                          href={`/order/${o.id}`}
                          className="text-[13px] text-[#222222] underline underline-offset-4 hover:opacity-75 transition-opacity"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* SECTION 4: Followed Artists */}
          <section id="followed-artists" className="scroll-mt-32">
            <h2 className="font-cormorant text-3xl md:text-[34px] font-normal text-[#1a1a1a] mb-2">
              Followed Artists
            </h2>
            <p className="text-[14px] text-[#555555] mb-4">
              Receive previews, exhibition invites, and updates for your saved artists.
            </p>

            <hr className="w-full border-t border-[#e5e5e5] mb-4" />

            <p className="text-[14px] text-[#444444] mb-4">
              Artists ({followedArtists.length})
            </p>

            {followedArtists.length > 0 ? (
              <div className="border-b border-[#e5e5e5]">
                {followedArtists.map((artistName) => (
                  <div
                    key={artistName}
                    className="py-4 border-t border-[#e5e5e5] flex items-center justify-between"
                  >
                    <span className="font-cormorant text-[22px] md:text-[24px] font-normal text-[#1a1a1a]">
                      {artistName}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleFollowArtist(artistName)}
                      className="inline-flex items-center justify-center px-6 py-1.5 rounded-full border border-[#777777] text-[#222222] text-[13px] hover:border-black hover:bg-neutral-50 transition-colors cursor-pointer"
                    >
                      Following ✓
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 border-y border-[#e5e5e5] text-center text-[14px] text-[#777777]">
                You are not following any artists yet.
              </div>
            )}

            <div className="flex justify-center mt-8">
              <Link
                href="/artworks"
                className="inline-flex items-center justify-center px-8 py-2.5 rounded-full border border-[#222222] bg-white text-[#222222] text-[14px] hover:bg-[#222222] hover:text-white transition-colors duration-200"
              >
                Browse Artists
              </Link>
            </div>
          </section>
        </main>
      </div>

      {/* 3. Address Modal (Add / Edit) */}
      {addressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-[#EAEAEA] max-w-[540px] w-full p-6 sm:p-8 text-left max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#EAEAEA] mb-6">
              <h3 className="font-cormorant text-2xl text-[#111111]">
                {editingAddress ? "Edit Address" : "Add New Address"}
              </h3>
              <button
                type="button"
                onClick={() => setAddressModalOpen(false)}
                className="text-neutral-400 hover:text-black text-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddressSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#555555] uppercase tracking-wider mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={addrFirstName}
                    onChange={(e) => setAddrFirstName(e.target.value)}
                    required
                    className="w-full h-11 px-3 border border-[#d8d8d8] text-[14px] focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#555555] uppercase tracking-wider mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={addrLastName}
                    onChange={(e) => setAddrLastName(e.target.value)}
                    required
                    className="w-full h-11 px-3 border border-[#d8d8d8] text-[14px] focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#555555] uppercase tracking-wider mb-1">
                  Company (optional)
                </label>
                <input
                  type="text"
                  value={addrCompany}
                  onChange={(e) => setAddrCompany(e.target.value)}
                  className="w-full h-11 px-3 border border-[#d8d8d8] text-[14px] focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#555555] uppercase tracking-wider mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  value={addrAddress1}
                  onChange={(e) => setAddrAddress1(e.target.value)}
                  placeholder="House number and street name"
                  required
                  className="w-full h-11 px-3 border border-[#d8d8d8] text-[14px] focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#555555] uppercase tracking-wider mb-1">
                  Apartment, suite, unit (optional)
                </label>
                <input
                  type="text"
                  value={addrAddress2}
                  onChange={(e) => setAddrAddress2(e.target.value)}
                  className="w-full h-11 px-3 border border-[#d8d8d8] text-[14px] focus:outline-none focus:border-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#555555] uppercase tracking-wider mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={addrCity}
                    onChange={(e) => setAddrCity(e.target.value)}
                    required
                    className="w-full h-11 px-3 border border-[#d8d8d8] text-[14px] focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#555555] uppercase tracking-wider mb-1">
                    State / Province
                  </label>
                  <input
                    type="text"
                    value={addrProvince}
                    onChange={(e) => setAddrProvince(e.target.value)}
                    className="w-full h-11 px-3 border border-[#d8d8d8] text-[14px] focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#555555] uppercase tracking-wider mb-1">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={addrPostalCode}
                    onChange={(e) => setAddrPostalCode(e.target.value)}
                    required
                    className="w-full h-11 px-3 border border-[#d8d8d8] text-[14px] focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#555555] uppercase tracking-wider mb-1">
                    Country
                  </label>
                  <select
                    value={addrCountryCode}
                    onChange={(e) => setAddrCountryCode(e.target.value)}
                    className="w-full h-11 px-3 border border-[#d8d8d8] bg-white text-[14px] focus:outline-none focus:border-black"
                  >
                    <option value="us">United States</option>
                    <option value="gb">United Kingdom</option>
                    <option value="ca">Canada</option>
                    <option value="au">Australia</option>
                    <option value="in">India</option>
                    <option value="fr">France</option>
                    <option value="de">Germany</option>
                    <option value="it">Italy</option>
                    <option value="es">Spain</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#555555] uppercase tracking-wider mb-1">
                  Phone (for delivery)
                </label>
                <input
                  type="tel"
                  value={addrPhone}
                  onChange={(e) => setAddrPhone(e.target.value)}
                  className="w-full h-11 px-3 border border-[#d8d8d8] text-[14px] focus:outline-none focus:border-black"
                />
              </div>

              {addressError && (
                <p className="text-xs text-red-600 pt-1">{addressError}</p>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EAEAEA]">
                <button
                  type="button"
                  onClick={() => setAddressModalOpen(false)}
                  className="px-5 py-2 text-[14px] text-neutral-600 hover:text-black cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addressPending}
                  className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-[#111111] text-white text-[14px] hover:bg-neutral-800 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {addressPending ? "Saving…" : "Save Address"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Edit Profile Details Modal */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-[#EAEAEA] max-w-[480px] w-full p-6 sm:p-8 text-left shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#EAEAEA] mb-6">
              <h3 className="font-cormorant text-2xl text-[#111111]">Edit Account Details</h3>
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                className="text-neutral-400 hover:text-black text-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#555555] uppercase tracking-wider mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full h-11 px-3 border border-[#d8d8d8] text-[14px] focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#555555] uppercase tracking-wider mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="w-full h-11 px-3 border border-[#d8d8d8] text-[14px] focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#555555] uppercase tracking-wider mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={customer.email}
                  disabled
                  className="w-full h-11 px-3 border border-[#e5e5e5] bg-[#f9f9f9] text-[#777777] text-[14px] cursor-not-allowed"
                />
              </div>

              <div className="flex items-start gap-2.5 pt-2">
                <input
                  id="marketing-opt"
                  type="checkbox"
                  checked={marketingOptIn}
                  onChange={(e) => setMarketingOptIn(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded-none accent-[#111111]"
                />
                <label htmlFor="marketing-opt" className="text-xs text-[#666666] leading-relaxed cursor-pointer">
                  Receive previews, exhibition invites, and updates for saved artists and releases.
                </label>
              </div>

              {profileMessage && (
                <p
                  className={`text-xs pt-1 ${
                    profileMessage.error ? "text-red-600" : "text-green-700"
                  }`}
                >
                  {profileMessage.text}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EAEAEA]">
                <button
                  type="button"
                  onClick={() => setProfileModalOpen(false)}
                  className="px-5 py-2 text-[14px] text-neutral-600 hover:text-black cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={profilePending}
                  className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-[#111111] text-white text-[14px] hover:bg-neutral-800 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {profilePending ? "Saving…" : "Save Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Change Password Modal */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-[#EAEAEA] max-w-[480px] w-full p-6 sm:p-8 text-left shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#EAEAEA] mb-6">
              <h3 className="font-cormorant text-2xl text-[#111111]">Change Password</h3>
              <button
                type="button"
                onClick={() => setPasswordModalOpen(false)}
                className="text-neutral-400 hover:text-black text-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#555555] uppercase tracking-wider mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  placeholder="Enter current password"
                  className="w-full h-11 px-3 border border-[#d8d8d8] text-[14px] focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#555555] uppercase tracking-wider mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Min. 8 characters"
                  className="w-full h-11 px-3 border border-[#d8d8d8] text-[14px] focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#555555] uppercase tracking-wider mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Re-enter new password"
                  className="w-full h-11 px-3 border border-[#d8d8d8] text-[14px] focus:outline-none focus:border-black"
                />
              </div>

              {passwordMessage && (
                <p
                  className={`text-xs pt-1 ${
                    passwordMessage.error ? "text-red-600" : "text-green-700"
                  }`}
                >
                  {passwordMessage.text}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EAEAEA]">
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  className="px-5 py-2 text-[14px] text-neutral-600 hover:text-black cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordPending}
                  className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-[#111111] text-white text-[14px] hover:bg-neutral-800 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {passwordPending ? "Updating…" : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Commissions Modal (if customer has active commissions) */}
      {commissionsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-[#EAEAEA] max-w-[640px] w-full p-6 sm:p-8 text-left max-h-[85vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#EAEAEA] mb-6">
              <h3 className="font-cormorant text-2xl text-[#111111]">
                Your Commissions ({commissions.length})
              </h3>
              <button
                type="button"
                onClick={() => setCommissionsModalOpen(false)}
                className="text-neutral-400 hover:text-black text-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="divide-y divide-[#eeeeee]">
              {commissions.map((c) => (
                <div key={c.id} className="py-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[14px] text-[#222222]">
                        Commission #{c.id.slice(0, 8)}
                      </span>
                      <span className="text-[11px] uppercase tracking-wider px-2 py-0.5 bg-neutral-100 text-neutral-700">
                        {c.status}
                      </span>
                    </div>
                    {c.artist_name && (
                      <p className="text-xs text-[#666666] mt-0.5">Artist: {c.artist_name}</p>
                    )}
                  </div>
                  {c.quote_amount ? (
                    <span className="text-[14px] font-medium text-[#222222]">
                      {formatMoney(c.quote_amount, c.currency_code || "USD")}
                    </span>
                  ) : (
                    <span className="text-xs text-[#888888]">In review</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7. Trade Application Modal */}
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

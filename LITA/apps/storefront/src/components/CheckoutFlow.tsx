"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { HttpTypes } from "@medusajs/types";
import { formatMoney } from "@/lib/format";
import {
  chooseShipping,
  placeOrder,
  saveAddress,
  startPayment,
  type AddressInput,
} from "@/lib/data/cart";

type Step = "address" | "shipping" | "payment";

const SUPPORTED_PROVIDER = "pp_system_default";

function providerLabel(id: string) {
  if (id === SUPPORTED_PROVIDER) return "Pay by manual payment";
  return id.replace(/^pp_/, "").replace(/_/g, " ");
}

function initialStep(cart: HttpTypes.StoreCart): Step {
  const a = cart.shipping_address;
  if (!cart.email || !a?.address_1 || !a.city || !a.postal_code || !a.country_code) return "address";
  if (!(cart.shipping_methods ?? []).length) return "shipping";
  return "payment";
}

export function CheckoutFlow({
  cart,
  countries,
  shippingOptions,
  providers,
  customerEmail,
}: {
  cart: HttpTypes.StoreCart;
  countries: { iso_2: string; name: string }[];
  shippingOptions: HttpTypes.StoreCartShippingOption[];
  providers: HttpTypes.StorePaymentProvider[];
  customerEmail?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(() => initialStep(cart));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const a = cart.shipping_address;
  const [form, setForm] = useState<AddressInput>({
    email: cart.email ?? customerEmail ?? "",
    first_name: a?.first_name ?? "",
    last_name: a?.last_name ?? "",
    phone: a?.phone ?? "",
    address_1: a?.address_1 ?? "",
    address_2: a?.address_2 ?? "",
    city: a?.city ?? "",
    province: a?.province ?? "",
    postal_code: a?.postal_code ?? "",
    country_code: a?.country_code ?? countries[0]?.iso_2 ?? "",
  });
  const set = (k: keyof AddressInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const currency = cart.currency_code;
  const selectedShipping = cart.shipping_methods?.[0]?.shipping_option_id;
  const usable = providers.filter((p) => p.id === SUPPORTED_PROVIDER);
  const [providerId, setProviderId] = useState(usable[0]?.id ?? "");

  function submitAddress(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await saveAddress(form);
      if (!res.ok) return setError(res.error);
      router.refresh();
      setStep("shipping");
    });
  }

  function pickShipping(optionId: string) {
    setError(null);
    startTransition(async () => {
      const res = await chooseShipping(optionId);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function toPayment() {
    if (!selectedShipping) return setError("Choose a delivery option to continue.");
    setError(null);
    setStep("payment");
  }

  function submitOrder() {
    setError(null);
    startTransition(async () => {
      const started = await startPayment(providerId);
      if (!started.ok) return setError(started.error);
      const res = await placeOrder();
      if (res && !res.ok) setError(res.error);
    });
  }

  const summaryLine = (label: string, body: React.ReactNode, target: Step) => (
    <div className="flex items-start justify-between gap-4 border-b border-mist py-4">
      <div>
        <p className="text-sm text-graphite">{label}</p>
        <div className="text-[15px]">{body}</div>
      </div>
      <button type="button" className="link text-sm" onClick={() => setStep(target)}>Change</button>
    </div>
  );

  return (
    <div>
      {step !== "address" && summaryLine("Deliver to", (
        <>
          <p>{a?.first_name} {a?.last_name}, {cart.email}</p>
          <p className="text-graphite">{[a?.address_1, a?.address_2, a?.city, a?.province, a?.postal_code].filter(Boolean).join(", ")}</p>
        </>
      ), "address")}
      {step === "payment" && summaryLine("Delivery", (
        <p>{cart.shipping_methods?.[0]?.name} <span className="text-graphite">({formatMoney(cart.shipping_total, currency)})</span></p>
      ), "shipping")}

      {step === "address" && (
        <form onSubmit={submitAddress} className="space-y-5">
          <h2 className="text-xl">Where should we send it?</h2>
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input id="email" type="email" required autoComplete="email" value={form.email} onChange={set("email")} className="field" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label htmlFor="fn" className="label">First name</label><input id="fn" required autoComplete="given-name" value={form.first_name} onChange={set("first_name")} className="field" /></div>
            <div><label htmlFor="ln" className="label">Last name</label><input id="ln" required autoComplete="family-name" value={form.last_name} onChange={set("last_name")} className="field" /></div>
          </div>
          <div><label htmlFor="a1" className="label">Address</label><input id="a1" required autoComplete="address-line1" value={form.address_1} onChange={set("address_1")} className="field" /></div>
          <div><label htmlFor="a2" className="label">Apartment, landmark (optional)</label><input id="a2" autoComplete="address-line2" value={form.address_2} onChange={set("address_2")} className="field" /></div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label htmlFor="city" className="label">City</label><input id="city" required autoComplete="address-level2" value={form.city} onChange={set("city")} className="field" /></div>
            <div><label htmlFor="prov" className="label">State</label><input id="prov" required autoComplete="address-level1" value={form.province} onChange={set("province")} className="field" /></div>
            <div><label htmlFor="pc" className="label">Postal code</label><input id="pc" required autoComplete="postal-code" value={form.postal_code} onChange={set("postal_code")} className="field" /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="country" className="label">Country</label>
              <select id="country" required value={form.country_code} onChange={set("country_code")} className="field">
                {countries.map((c) => <option key={c.iso_2} value={c.iso_2}>{c.name}</option>)}
              </select>
            </div>
            <div><label htmlFor="phone" className="label">Phone</label><input id="phone" type="tel" required autoComplete="tel" value={form.phone} onChange={set("phone")} className="field" /></div>
          </div>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={pending} className="btn-solid">{pending ? "Saving…" : "Continue to delivery"}</button>
        </form>
      )}

      {step === "shipping" && (
        <div className="space-y-5 pt-6">
          <h2 className="text-xl">How should it travel?</h2>
          {shippingOptions.length === 0 ? (
            <p role="alert" className="border border-dust bg-wall p-4">
              No delivery options are available for this address yet. Check the address, or <a className="link" href="/contact">contact the studio</a> to arrange delivery.
            </p>
          ) : (
            <fieldset className="space-y-2" disabled={pending}>
              <legend className="sr-only">Delivery options</legend>
              {shippingOptions.map((o) => (
                <label key={o.id} className={`flex cursor-pointer items-center justify-between gap-4 border p-4 ${selectedShipping === o.id ? "border-ink bg-wall" : "border-dust hover:border-graphite"}`}>
                  <span className="flex items-center gap-3">
                    <input type="radio" name="shipping" checked={selectedShipping === o.id} onChange={() => pickShipping(o.id)} className="accent-[#2A3590]" />
                    <span>{o.name}</span>
                  </span>
                  <span className="tabular-nums">{o.amount === 0 ? "Free" : o.amount != null ? formatMoney(o.amount, currency) : "Calculated"}</span>
                </label>
              ))}
            </fieldset>
          )}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button type="button" onClick={toPayment} disabled={pending || !selectedShipping} className="btn-solid">Continue to payment</button>
        </div>
      )}

      {step === "payment" && (
        <div className="space-y-5 pt-6">
          <h2 className="text-xl">Payment</h2>
          {usable.length === 0 ? (
            <p role="alert" className="border border-dust bg-wall p-4">
              Payment isn't switched on for this store yet. The store owner needs to enable a payment provider for this region in the Medusa admin.
            </p>
          ) : (
            <fieldset className="space-y-2">
              <legend className="sr-only">Payment method</legend>
              {usable.map((p) => (
                <label key={p.id} className={`flex cursor-pointer items-center gap-3 border p-4 ${providerId === p.id ? "border-ink bg-wall" : "border-dust"}`}>
                  <input type="radio" name="provider" checked={providerId === p.id} onChange={() => setProviderId(p.id)} className="accent-[#2A3590]" />
                  <span>{providerLabel(p.id)}</span>
                </label>
              ))}
            </fieldset>
          )}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button type="button" onClick={submitOrder} disabled={pending || !providerId} className="btn-solid w-full sm:w-auto">
            {pending ? "Placing order…" : `Place order · ${formatMoney(cart.total, currency)}`}
          </button>
          <p className="text-sm text-graphite">By placing the order you agree to the <a href="/shipping" className="link">shipping and returns policy</a>.</p>
        </div>
      )}
    </div>
  );
}

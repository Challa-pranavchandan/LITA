"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { HttpTypes } from "@medusajs/types";
import { formatMoney } from "@/lib/format";
import {
  chooseShipping,
  placeOrder,
  saveAddress,
  startPayment,
} from "@/lib/data/cart";
import {
  addCustomerAddress,
  deleteCustomerAddress as removeCustomerAddress,
  updateCustomerAddress as saveCustomerAddress,
} from "@/lib/data/customer";
import { isRazorpay } from "@/lib/constants";
import { isSupportedProvider } from "@/lib/payment-guard";
import RazorpayPaymentButton from "@/modules/checkout/components/payment-button/razorpay-payment-button";
import {
  AddressFormModal,
  AddressFormFields,
} from "@/components/address/AddressFormModal";
import {
  addressToFormValues,
  checkoutAddressSchema,
  getAddressFieldErrors,
  normalizeIndianPhone,
  type AddressFormValues,
} from "@/lib/validation/address";

type Step = "address" | "shipping" | "payment";

const IS_PRODUCTION = process.env.NODE_ENV === "production"
const ADDRESS_DRAFT_KEY = "lita-checkout-address-draft";

type CheckoutAddress = HttpTypes.StoreCustomerAddress;

function providerLabel(id: string) {
  if (isRazorpay(id)) return "UPI / Cards / Netbanking (Razorpay)"
  if (id === "pp_system_default" && !IS_PRODUCTION) {
    return "Manual Payment (Pay Offline / Test)"
  }
  return id.replace(/^pp_/, "").replace(/_/g, " ")
}


function initialStep(cart: HttpTypes.StoreCart): Step {
  const a = cart.shipping_address;
  if (!a || a.country_code?.toLowerCase() !== "in") return "address";
  const validation = checkoutAddressSchema.safeParse({
    ...addressToFormValues(a),
    email: cart.email ?? "",
  });
  if (!validation.success) return "address";
  if (!(cart.shipping_methods ?? []).length) return "shipping";
  return "payment";
}

function findMatchingAddress(
  cartAddress: HttpTypes.StoreCartAddress | undefined,
  addresses: CheckoutAddress[]
): CheckoutAddress | undefined {
  if (!cartAddress) return undefined;
  if (cartAddress.id) {
    const byId = addresses.find((address) => address.id === cartAddress.id);
    if (byId) return byId;
  }
  return addresses.find((address) =>
    [
      "first_name",
      "last_name",
      "phone",
      "address_1",
      "address_2",
      "city",
      "province",
      "postal_code",
      "company",
    ].every((key) => {
      const field = key as keyof HttpTypes.StoreCartAddress;
      if (field === "phone") {
        return normalizeIndianPhone(address.phone ?? "") ===
          normalizeIndianPhone(cartAddress.phone ?? "");
      }
      return (address[field as keyof CheckoutAddress] ?? "") === (cartAddress[field] ?? "");
    })
  );
}

function displayPhone(phone?: string | null) {
  if (!phone) return "";
  const normalized = normalizeIndianPhone(phone);
  return `+91 ${normalized}`;
}

export function CheckoutFlow({
  cart,
  shippingOptions,
  providers,
  customerEmail,
  customerFirstName,
  customerLastName,
  customerPhone,
  customerAddresses = [],
}: {
  cart: HttpTypes.StoreCart;
  shippingOptions: HttpTypes.StoreCartShippingOption[];
  providers: HttpTypes.StorePaymentProvider[];
  customerEmail?: string;
  customerFirstName?: string;
  customerLastName?: string;
  customerPhone?: string;
  customerAddresses?: CheckoutAddress[];
}) {
  const router = useRouter();
  const savedAddresses = customerAddresses.filter(
    (address) => address.country_code?.toLowerCase() === "in"
  );
  const [step, setStep] = useState<Step>(() => initialStep(cart));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [addressBookNotice, setAddressBookNotice] = useState<string | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const [modal, setModal] = useState<{
    address?: CheckoutAddress;
    instructionsOpen?: boolean;
  } | null>(null);
  const a = cart.shipping_address;
  const [form, setForm] = useState<AddressFormValues>(() => ({
    ...addressToFormValues(a, {
      deliveryInstructions:
        typeof cart.metadata?.delivery_instructions === "string"
          ? cart.metadata.delivery_instructions
          : undefined,
    }),
    full_name:
      [a?.first_name, a?.last_name].filter(Boolean).join(" ") ||
      [customerFirstName, customerLastName].filter(Boolean).join(" "),
    phone: normalizeIndianPhone(a?.phone ?? customerPhone ?? ""),
    country_code: "in",
  }));
  const [email, setEmail] = useState(cart.email ?? customerEmail ?? "");
  const [selectedAddressId, setSelectedAddressId] = useState(() => {
    const matching = findMatchingAddress(cart.shipping_address, savedAddresses);
    return matching?.id ??
      savedAddresses.find((address) => address.is_default_shipping)?.id ??
      savedAddresses[0]?.id ??
      "";
  });
  const [showAllAddresses, setShowAllAddresses] = useState(false);
  const [draftReady, setDraftReady] = useState(false);

  const hasSavedAddresses = Boolean(customerEmail && savedAddresses.length);

  useEffect(() => {
    if (customerEmail) {
      try {
        window.sessionStorage.removeItem(ADDRESS_DRAFT_KEY);
      } catch {
        // Session storage is optional and may be unavailable.
      }
      setDraftReady(true);
      return;
    }

    try {
      const saved = window.sessionStorage.getItem(ADDRESS_DRAFT_KEY);
      if (saved) {
        const draft = JSON.parse(saved) as Partial<AddressFormValues> & { email?: string };
        if (
          draft.country_code === "in" &&
          typeof draft.full_name === "string" &&
          typeof draft.phone === "string" &&
          typeof draft.postal_code === "string" &&
          typeof draft.address_1 === "string" &&
          typeof draft.address_2 === "string" &&
          typeof draft.city === "string" &&
          typeof draft.province === "string"
        ) {
          setForm((current) => ({ ...current, ...draft, country_code: "in" }));
          if (typeof draft.email === "string") setEmail(draft.email);
        }
      }
    } catch {
      // Discard malformed drafts and continue with the cart address.
    }
    setDraftReady(true);
  }, [customerEmail]);

  useEffect(() => {
    if (!draftReady || customerEmail) return;
    try {
      window.sessionStorage.setItem(
        ADDRESS_DRAFT_KEY,
        JSON.stringify({ ...form, email })
      );
    } catch {
      // Session storage is optional and may be unavailable.
    }
  }, [customerEmail, draftReady, email, form]);

  function clearDraft() {
    if (customerEmail) return;
    try {
      window.sessionStorage.removeItem(ADDRESS_DRAFT_KEY);
    } catch {
      // Session storage is optional and may be unavailable.
    }
  }

  function changeField(field: keyof AddressFormValues, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function openAddressModal(
    address: CheckoutAddress | undefined,
    trigger: HTMLElement,
    instructionsOpen = false
  ) {
    triggerRef.current = trigger;
    setError(null);
    setFieldErrors({});
    setModal({ address, instructionsOpen });
  }

  const currency = cart.currency_code;
  const selectedShipping = cart.shipping_methods?.[0]?.shipping_option_id;
  const usable = providers.filter((p) => isSupportedProvider(p.id));
  const [providerId, setProviderId] = useState(usable[0]?.id ?? "");

  function submitAddress(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const parsed = checkoutAddressSchema.safeParse({
      ...form,
      email: customerEmail ?? email,
    });
    if (!parsed.success) {
      const errors = getAddressFieldErrors(parsed.error);
      setFieldErrors(errors);
      const firstInvalid = document.querySelector<HTMLElement>(
        '[aria-invalid="true"]'
      );
      firstInvalid?.focus();
      return;
    }

    startTransition(async () => {
      let addressBookError: string | null = null;
      if (customerEmail) {
        const addressResult = await addCustomerAddress(parsed.data);
        if (!addressResult.ok) addressBookError = addressResult.error ?? "Could not save this address to your account.";
        else if (addressResult.addressId) setSelectedAddressId(addressResult.addressId);
      }
      const result = await saveAddress(parsed.data);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      clearDraft();
      if (addressBookError) {
        setAddressBookNotice(
          `Your delivery address was saved for this order, but not to your address book: ${addressBookError}`
        );
      } else {
        setAddressBookNotice(null);
      }
      router.refresh();
      setStep("shipping");
    });
  }

  function useSavedAddress() {
    const selected = savedAddresses.find((address) => address.id === selectedAddressId);
    if (!selected) {
      setError("Choose a delivery address to continue.");
      return;
    }
    const values = addressToFormValues(selected, {
      deliveryInstructions:
        typeof selected.metadata?.delivery_instructions === "string"
          ? selected.metadata.delivery_instructions
          : "",
      isDefaultShipping: selected.is_default_shipping,
    });
    const parsed = checkoutAddressSchema.safeParse({
      ...values,
      email: customerEmail ?? email,
    });
    if (!parsed.success) {
      setFieldErrors(getAddressFieldErrors(parsed.error));
      setError("This saved address needs updating before it can be used.");
      return;
    }

    setError(null);
    setFieldErrors({});
    setAddressBookNotice(null);
    startTransition(async () => {
      const result = await saveAddress(parsed.data);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      clearDraft();
      router.refresh();
      setStep("shipping");
    });
  }

  async function submitModalAddress(values: AddressFormValues) {
    const parsed = checkoutAddressSchema.safeParse({
      ...values,
      email: customerEmail ?? email,
    });
    if (!parsed.success) {
      setFieldErrors(getAddressFieldErrors(parsed.error));
      return;
    }

    const currentAddress = modal?.address;
    const isCurrentAddress = currentAddress
      ? currentAddress.id === selectedAddressId ||
        Boolean(findMatchingAddress(cart.shipping_address, [currentAddress]))
      : false;

    startTransition(async () => {
      let addressBookError: string | null = null;
      let addressId = currentAddress?.id;
      if (customerEmail) {
        const result = currentAddress
          ? await saveCustomerAddress(currentAddress.id, parsed.data)
          : await addCustomerAddress(parsed.data);
        if (!result.ok) addressBookError = result.error ?? "Could not save this address to your account.";
        else if ("addressId" in result && typeof result.addressId === "string") {
          addressId = result.addressId;
        }
      }

      const shouldUpdateCart = !currentAddress || isCurrentAddress;
      if (shouldUpdateCart) {
        const cartResult = await saveAddress(parsed.data);
        if (!cartResult.ok) {
          setError(cartResult.error);
          return;
        }
        clearDraft();
        if (addressId) setSelectedAddressId(addressId);
        setStep("shipping");
      } else if (addressBookError) {
        setError(addressBookError);
        return;
      }

      setAddressBookNotice(
        addressBookError
          ? `Your delivery address was saved for this order, but not to your address book: ${addressBookError}`
          : null
      );
      setModal(null);
      router.refresh();
    });
  }

  async function deleteModalAddress() {
    const address = modal?.address;
    if (!address) return;
    startTransition(async () => {
      const result = await removeCustomerAddress(address.id);
      if (!result.ok) {
        setError(result.error ?? "Could not delete this address.");
        return;
      }

      const wasCurrent =
        address.id === selectedAddressId ||
        Boolean(findMatchingAddress(cart.shipping_address, [address]));
      const remaining = savedAddresses.filter((item) => item.id !== address.id);
      const fallback =
        remaining.find((item) => item.is_default_shipping) ?? remaining[0];
      if (wasCurrent && fallback) {
        const fallbackValues = addressToFormValues(fallback, {
          deliveryInstructions:
            typeof fallback.metadata?.delivery_instructions === "string"
              ? fallback.metadata.delivery_instructions
              : "",
          isDefaultShipping: fallback.is_default_shipping,
        });
        const fallbackResult = await saveAddress({
          ...fallbackValues,
          email: customerEmail ?? email,
        });
        if (!fallbackResult.ok) {
          setError(fallbackResult.error);
          return;
        }
        setSelectedAddressId(fallback.id);
        setStep("shipping");
      } else if (wasCurrent) {
        setSelectedAddressId("");
      }
      setModal(null);
      router.refresh();
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
          <p className="text-graphite">{[a?.address_1, a?.company, a?.address_2, a?.metadata?.landmark, a?.city, a?.province, a?.postal_code].filter(Boolean).join(", ")}</p>
        </>
      ), "address")}
      {step === "payment" && summaryLine("Delivery", (
        <p>{cart.shipping_methods?.[0]?.name} <span className="text-graphite">({formatMoney(cart.shipping_total, currency)})</span></p>
      ), "shipping")}
      {addressBookNotice && (
        <p role="status" className="border border-dust bg-wall p-3 text-sm text-graphite">
          {addressBookNotice}
        </p>
      )}

      {step === "address" && (
        <div className="space-y-5">
          <h2 className="text-xl">{hasSavedAddresses ? "Select a delivery address" : "Where should we send it?"}</h2>
          {customerEmail ? (
            <p className="text-sm text-graphite">Email: {customerEmail}</p>
          ) : (
            <div>
              <label htmlFor="checkout-email" className="label">Email</label>
              <input
                id="checkout-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setFieldErrors((current) => {
                    const next = { ...current };
                    delete next.email;
                    return next;
                  });
                }}
                aria-invalid={fieldErrors.email ? true : undefined}
                aria-describedby={fieldErrors.email ? "checkout-email-error" : undefined}
                className="field"
              />
              {fieldErrors.email && <p id="checkout-email-error" className="mt-1 text-sm text-red-700">{fieldErrors.email}</p>}
            </div>
          )}

          {hasSavedAddresses ? (
            <>
              <div className="border-y border-mist py-4">
                <h3 className="mb-3 text-lg">Delivery addresses ({savedAddresses.length})</h3>
                <fieldset className="space-y-2" disabled={pending}>
                  <legend className="sr-only">Choose a delivery address</legend>
                  {(showAllAddresses ? savedAddresses : savedAddresses.slice(0, 3)).map((address) => {
                    const isSelected = selectedAddressId === address.id;
                    const landmark =
                      typeof address.metadata?.landmark === "string"
                        ? address.metadata.landmark
                        : "";
                    return (
                      <div
                        key={address.id}
                        className={`flex gap-3 border p-4 ${isSelected ? "border-ink bg-wall" : "border-dust"}`}
                      >
                        <input
                          type="radio"
                          name="delivery-address"
                          aria-label={`Deliver to ${address.first_name ?? ""} ${address.last_name ?? ""}`}
                          checked={isSelected}
                          onChange={() => {
                            setSelectedAddressId(address.id);
                            setError(null);
                          }}
                          className="mt-1 accent-[#2A3590]"
                        />
                        <div className="min-w-0 flex-1 text-sm">
                          <p className="font-medium">
                            {[address.first_name, address.last_name].filter(Boolean).join(" ")}
                          </p>
                          {address.company && <p>{address.company}</p>}
                          <p>{address.address_1}</p>
                          <p>{[address.address_2, landmark].filter(Boolean).join(", ")}</p>
                          <p>{[address.city, address.province, address.postal_code, "India"].filter(Boolean).join(", ")}</p>
                          <p className="text-graphite">Phone number: {displayPhone(address.phone)}</p>
                          {address.is_default_shipping && <p className="mt-1 text-xs text-graphite">Default address</p>}
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                            <button
                              type="button"
                              className="link text-sm"
                              onClick={(event) => openAddressModal(address, event.currentTarget)}
                            >
                              Edit address
                            </button>
                            <button
                              type="button"
                              className="link text-sm"
                              onClick={(event) => openAddressModal(address, event.currentTarget, true)}
                            >
                              Add delivery instructions
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </fieldset>
                {savedAddresses.length > 3 && (
                  <button
                    type="button"
                    className="link mt-3 text-sm"
                    onClick={() => setShowAllAddresses((current) => !current)}
                  >
                    {showAllAddresses ? "Show fewer addresses" : "Show more addresses"}
                  </button>
                )}
              </div>
              <button
                type="button"
                className="link"
                onClick={(event) => {
                  setForm((current) => ({
                    ...current,
                    full_name: [customerFirstName, customerLastName].filter(Boolean).join(" "),
                    phone: normalizeIndianPhone(customerPhone ?? current.phone),
                    country_code: "in",
                    is_default_shipping: false,
                  }));
                  openAddressModal(undefined, event.currentTarget);
                }}
              >
                Add a new delivery address
              </button>
              {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
              <button
                type="button"
                onClick={useSavedAddress}
                disabled={pending || !selectedAddressId}
                className="btn-solid"
              >
                {pending ? "Saving…" : "Deliver to this address"}
              </button>
            </>
          ) : (
            <form onSubmit={submitAddress} className="space-y-5">
              <AddressFormFields
                values={form}
                onChange={changeField}
                errors={fieldErrors}
                idPrefix="checkout-address"
                isLoggedIn={Boolean(customerEmail)}
              />
              {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
              <button type="submit" disabled={pending} className="btn-solid">
                {pending ? "Saving…" : "Continue to delivery"}
              </button>
            </form>
          )}
        </div>
      )}

      {modal && (
        <AddressFormModal
          open={Boolean(modal)}
          initialValues={modal.address
            ? addressToFormValues(modal.address, {
                deliveryInstructions:
                  typeof modal.address.metadata?.delivery_instructions === "string"
                    ? modal.address.metadata.delivery_instructions
                    : "",
                isDefaultShipping: modal.address.is_default_shipping,
              })
            : form}
          isLoggedIn={Boolean(customerEmail)}
          pending={pending}
          error={error}
          triggerRef={triggerRef}
          onClose={() => {
            setModal(null);
            setError(null);
          }}
          onSubmit={submitModalAddress}
          onDelete={modal.address ? deleteModalAddress : undefined}
          instructionsOpen={modal.instructionsOpen}
        />
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
              Payment isn&apos;t switched on for this store yet. The store owner needs to enable a payment provider for this region in the Medusa admin.
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
          {usable.length > 0 && (
            <>
              {isRazorpay(providerId) ? (
                <div className="pt-2">
                  <RazorpayPaymentButton cart={cart} notReady={pending || !providerId} />
                </div>
              ) : !IS_PRODUCTION ? (
                <button type="button" onClick={submitOrder} disabled={pending || !providerId} className="btn-solid w-full sm:w-auto">
                  {pending ? "Placing order…" : `Place order · ${formatMoney(cart.total, currency)}`}
                </button>
              ) : null}
              <p className="text-sm text-graphite">By placing the order you agree to the <a href="/shipping" className="link">shipping and returns policy</a>.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

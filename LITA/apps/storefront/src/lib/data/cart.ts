"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { HttpTypes } from "@medusajs/types";
import { sdk } from "@/lib/medusa";
import { getRegion } from "@/lib/data/catalog";
import { getAuthHeaders } from "@/lib/data/customer";

const CART_COOKIE = "_cart_id";
const CART_FIELDS =
  "*items,*items.variant,*items.product,*promotions,*shipping_methods,*payment_collection,*payment_collection.payment_sessions";

export type ActionResult = { ok: true } | { ok: false; error: string };

function message(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String((e as Error).message);
  return "Something went wrong. Try again.";
}

function isCartStaleOrNotFoundError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const msg = "message" in e ? String((e as any).message).toLowerCase() : "";
  const status = "status" in e ? (e as any).status : undefined;
  return (
    status === 404 ||
    status === 400 ||
    status === 422 ||
    msg.includes("not found") ||
    msg.includes("already completed") ||
    msg.includes("completed") ||
    msg.includes("does not exist") ||
    msg.includes("cannot be found") ||
    msg.includes("invalid cart")
  );
}

const isCartNotFoundError = isCartStaleOrNotFoundError;

async function cartId(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(CART_COOKIE)?.value ?? cookieStore.get("_medusa_cart_id")?.value;
}

async function setCartCookie(id: string) {
  const cookieStore = await cookies();
  const options = {
    maxAge: 60 * 60 * 24 * 14,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
  cookieStore.set(CART_COOKIE, id, options);
  cookieStore.set("_medusa_cart_id", id, options);
}

export async function clearStaleCart(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(CART_COOKIE);
    cookieStore.delete("_medusa_cart_id");
    cookieStore.set(CART_COOKIE, "", { maxAge: -1, path: "/" });
    cookieStore.set("_medusa_cart_id", "", { maxAge: -1, path: "/" });
  } catch {
    // Cannot mutate cookies in pure Server Component render contexts
  }
}

export async function getCart(): Promise<HttpTypes.StoreCart | null> {
  const id = await cartId();
  if (!id) return null;
  try {
    const { cart } = await sdk.store.cart.retrieve(id, { fields: CART_FIELDS });
    // If the cart was already completed (order placed), it cannot be used as an active cart!
    if (cart.completed_at) {
      await clearStaleCart();
      return null;
    }
    return cart;
  } catch (e) {
    if (isCartStaleOrNotFoundError(e)) {
      await clearStaleCart();
    }
    return null;
  }
}

async function getOrCreateCart(): Promise<HttpTypes.StoreCart> {
  const existing = await getCart();
  if (existing) return existing;
  const region = await getRegion();
  if (!region) throw new Error("The store is not set up for orders yet.");
  const { cart } = await sdk.store.cart.create({ region_id: region.id });
  await setCartCookie(cart.id);
  return cart;
}

function refresh() {
  revalidatePath("/", "layout");
}

export async function addToCart(
  variantId: string,
  quantity = 1
): Promise<ActionResult> {
  try {
    const cart = await getOrCreateCart();
    await sdk.store.cart.createLineItem(cart.id, {
      variant_id: variantId,
      quantity,
    });
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

export async function updateLineItem(
  lineId: string,
  quantity: number
): Promise<ActionResult> {
  const id = await cartId();
  if (!id) return { ok: false, error: "Your bag is empty." };
  try {
    if (quantity < 1) {
      await sdk.store.cart.deleteLineItem(id, lineId);
    } else {
      await sdk.store.cart.updateLineItem(id, lineId, { quantity });
    }
    refresh();
    return { ok: true };
  } catch (e) {
    if (isCartNotFoundError(e)) {
      await clearStaleCart();
      refresh();
      return { ok: false, error: "Your bag session expired. Please refresh the page." };
    }
    return { ok: false, error: message(e) };
  }
}

export async function deleteLineItem(lineId: string): Promise<ActionResult> {
  const id = await cartId();
  if (!id) return { ok: false, error: "Your bag is empty." };
  try {
    await sdk.store.cart.deleteLineItem(id, lineId);
    refresh();
    return { ok: true };
  } catch (e) {
    if (isCartNotFoundError(e)) {
      await clearStaleCart();
      refresh();
      return { ok: false, error: "Your bag session expired. Please refresh the page." };
    }
    return { ok: false, error: message(e) };
  }
}

export async function applyPromoCode(code: string): Promise<ActionResult> {
  const id = await cartId();
  if (!id) return { ok: false, error: "Your bag is empty." };
  try {
    await sdk.store.cart.update(id, { promo_codes: [code.trim()] });
    refresh();
    return { ok: true };
  } catch (e) {
    if (isCartNotFoundError(e)) {
      await clearStaleCart();
      refresh();
      return { ok: false, error: "Your bag session expired. Please refresh the page." };
    }
    return { ok: false, error: "That code isn't valid for this bag." };
  }
}

export async function removePromoCode(code: string): Promise<ActionResult> {
  const id = await cartId();
  if (!id) return { ok: false, error: "Your bag is empty." };
  try {
    const cart = await getCart();
    const remaining = (cart?.promotions ?? [])
      .map((p) => p.code)
      .filter((c): c is string => !!c && c !== code);
    await sdk.store.cart.update(id, { promo_codes: remaining });
    refresh();
    return { ok: true };
  } catch (e) {
    if (isCartNotFoundError(e)) {
      await clearStaleCart();
      refresh();
      return { ok: false, error: "Your bag session expired. Please refresh the page." };
    }
    return { ok: false, error: message(e) };
  }
}

export type AddressInput = {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  address_1: string;
  address_2: string;
  city: string;
  province: string;
  postal_code: string;
  country_code: string;
};

export async function saveAddress(input: AddressInput): Promise<ActionResult> {
  const id = await cartId();
  if (!id) return { ok: false, error: "Your bag is empty." };
  const { email, ...address } = input;
  try {
    await sdk.store.cart.update(id, {
      email,
      shipping_address: address,
      billing_address: address,
    });
    refresh();
    return { ok: true };
  } catch (e) {
    if (isCartNotFoundError(e)) {
      await clearStaleCart();
      refresh();
      return { ok: false, error: "Your bag session expired. Please refresh the page." };
    }
    return { ok: false, error: message(e) };
  }
}

export async function listShippingOptions(): Promise<
  HttpTypes.StoreCartShippingOption[]
> {
  const id = await cartId();
  if (!id) return [];
  try {
    const { shipping_options } = await sdk.store.fulfillment.listCartOptions({
      cart_id: id,
    });
    return shipping_options ?? [];
  } catch {
    return [];
  }
}

export async function chooseShipping(optionId: string): Promise<ActionResult> {
  const id = await cartId();
  if (!id) return { ok: false, error: "Your bag is empty." };
  try {
    await sdk.store.cart.addShippingMethod(id, { option_id: optionId });
    refresh();
    return { ok: true };
  } catch (e) {
    if (isCartNotFoundError(e)) {
      await clearStaleCart();
      refresh();
      return { ok: false, error: "Your bag session expired. Please refresh the page." };
    }
    return { ok: false, error: message(e) };
  }
}

export async function listPaymentProviders(): Promise<
  HttpTypes.StorePaymentProvider[]
> {
  const region = await getRegion();
  if (!region) return [];
  try {
    const { payment_providers } = await sdk.store.payment.listPaymentProviders({
      region_id: region.id,
    });
    return payment_providers ?? [];
  } catch {
    return [];
  }
}

export async function startPayment(providerId: string): Promise<ActionResult> {

  const cart = await getCart();
  if (!cart) return { ok: false, error: "Your bag is empty." };
  try {
    await sdk.store.payment.initiatePaymentSession(cart, {
      provider_id: providerId,
    });
    refresh();
    return { ok: true };
  } catch (e) {
    if (isCartNotFoundError(e)) {
      await clearStaleCart();
      refresh();
      return { ok: false, error: "Your bag session expired. Please refresh the page." };
    }
    return { ok: false, error: message(e) };
  }
}

/**
 * Completes the cart. With Medusa's built-in manual provider (pp_system_default) this
 * places the order straight away. For Stripe or Razorpay, confirm the payment on the
 * client first, then call this.
 */
export async function placeOrder(): Promise<ActionResult> {
  const id = await cartId();
  if (!id) return { ok: false, error: "Your bag is empty." };
  let orderId: string | undefined;
  try {
    const res = await sdk.store.cart.complete(id);
    if (res.type !== "order") {
      return {
        ok: false,
        error:
          (res as { error?: { message?: string } }).error?.message ??
          "We couldn't place the order. Check your details and try again.",
      };
    }
    orderId = res.order.id;
    await clearStaleCart();
  } catch (e) {
    if (isCartNotFoundError(e)) {
      await clearStaleCart();
      refresh();
      return { ok: false, error: "Your bag session expired. Please refresh the page." };
    }
    return { ok: false, error: message(e) };
  }
  refresh();
  redirect(`/order/${orderId}`);
}

export async function getOrder(
  id: string
): Promise<HttpTypes.StoreOrder | null> {
  try {
    const { order } = await sdk.store.order.retrieve(id, {
      fields: "*items,*items.variant,*items.product,*shipping_address,*shipping_methods",
    });
    return order;
  } catch {
    return null;
  }
}

/** Attach the signed-in customer to the cart so the order shows in their account. */
export async function attachCustomerToCart(): Promise<void> {
  const id = await cartId();
  const headers = await getAuthHeaders();
  if (!id || !headers.authorization) return;
  try {
    await sdk.store.cart.transferCart(id, {}, headers);
  } catch (e) {
    if (isCartNotFoundError(e)) {
      await clearStaleCart();
    }
    /* cart is already linked or the session expired; checkout still works as a guest */
  }
}

export async function updateRegion(
  countryCode: string,
  currentPath: string
): Promise<void> {
  const id = await cartId();
  if (id) {
    const region = await getRegion();
    if (region) {
      try {
        await sdk.store.cart.update(id, { region_id: region.id });
      } catch (e) {
        if (isCartNotFoundError(e)) {
          await clearStaleCart();
        }
      }
    }
  }
  refresh();
}

export const retrieveCart = getCart;

export async function listCartOptions(): Promise<{
  shipping_options: HttpTypes.StoreCartShippingOption[];
}> {
  const shipping_options = await listShippingOptions();
  return { shipping_options };
}

export async function setShippingMethod({
  cartId: providedCartId,
  shippingMethodId,
}: {
  cartId?: string;
  shippingMethodId: string;
}): Promise<ActionResult> {
  const id = providedCartId || (await cartId());
  if (!id) return { ok: false, error: "Your bag is empty." };
  try {
    await sdk.store.cart.addShippingMethod(id, { option_id: shippingMethodId });
    refresh();
    return { ok: true };
  } catch (e) {
    if (isCartStaleOrNotFoundError(e)) {
      await clearStaleCart();
      refresh();
      return { ok: false, error: "Your bag session expired. Please refresh the page." };
    }
    return { ok: false, error: message(e) };
  }
}

export async function initiatePaymentSession(
  cart: HttpTypes.StoreCart,
  data: {
    provider_id: string;
    context?: Record<string, unknown>;
    data?: Record<string, unknown>;
  }
): Promise<HttpTypes.StorePaymentCollection> {
  const sessionData = data.data ?? data.context;
  const { payment_collection } = await sdk.store.payment.initiatePaymentSession(
    cart,
    {
      provider_id: data.provider_id,
      ...(sessionData ? { data: sessionData } : {}),
    }
  );
  refresh();
  return payment_collection;
}

export async function applyPromotions(codes: string[]): Promise<ActionResult> {
  const id = await cartId();
  if (!id) return { ok: false, error: "Your bag is empty." };
  try {
    await sdk.store.cart.update(id, { promo_codes: codes });
    refresh();
    return { ok: true };
  } catch (e) {
    if (isCartStaleOrNotFoundError(e)) {
      await clearStaleCart();
      refresh();
      return { ok: false, error: "Your bag session expired. Please refresh the page." };
    }
    return { ok: false, error: message(e) };
  }
}

export async function setAddresses(
  _currentState: unknown,
  formData: FormData
): Promise<string | null> {
  const id = await cartId();
  if (!id) return "Your bag is empty.";

  const email = (formData.get("email") as string) || "";
  const sameAsBilling = formData.get("same_as_billing") === "on";

  const shipping_address: Record<string, string> = {
    first_name: (formData.get("shipping_address.first_name") as string) || "",
    last_name: (formData.get("shipping_address.last_name") as string) || "",
    company: (formData.get("shipping_address.company") as string) || "",
    address_1: (formData.get("shipping_address.address_1") as string) || "",
    address_2: (formData.get("shipping_address.address_2") as string) || "",
    city: (formData.get("shipping_address.city") as string) || "",
    country_code: (formData.get("shipping_address.country_code") as string) || "",
    province: (formData.get("shipping_address.province") as string) || "",
    postal_code: (formData.get("shipping_address.postal_code") as string) || "",
    phone: (formData.get("shipping_address.phone") as string) || "",
  };

  const billing_address: Record<string, string> = sameAsBilling
    ? shipping_address
    : {
        first_name: (formData.get("billing_address.first_name") as string) || "",
        last_name: (formData.get("billing_address.last_name") as string) || "",
        company: (formData.get("billing_address.company") as string) || "",
        address_1: (formData.get("billing_address.address_1") as string) || "",
        address_2: (formData.get("billing_address.address_2") as string) || "",
        city: (formData.get("billing_address.city") as string) || "",
        country_code: (formData.get("billing_address.country_code") as string) || "",
        province: (formData.get("billing_address.province") as string) || "",
        postal_code: (formData.get("billing_address.postal_code") as string) || "",
        phone: (formData.get("billing_address.phone") as string) || "",
      };

  try {
    await sdk.store.cart.update(id, {
      email,
      shipping_address,
      billing_address,
    });
    refresh();
    return null;
  } catch (e) {
    if (isCartStaleOrNotFoundError(e)) {
      await clearStaleCart();
      refresh();
      return "Your bag session expired. Please refresh the page.";
    }
    return message(e);
  }
}


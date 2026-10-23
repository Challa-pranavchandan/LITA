"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import type { HttpTypes } from "@medusajs/types";
import { sdk } from "@/lib/medusa";

const JWT_COOKIE = "_medusa_jwt";

export type AuthResult = { ok: true } | { ok: false; error: string };

export async function getAuthHeaders(): Promise<{ authorization?: string }> {
  const token = (await cookies()).get(JWT_COOKIE)?.value;
  return token ? { authorization: `Bearer ${token}` } : {};
}

async function storeToken(token: string) {
  (await cookies()).set(JWT_COOKIE, token, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function getCustomer(): Promise<HttpTypes.StoreCustomer | null> {
  const headers = await getAuthHeaders();
  if (!headers.authorization) return null;
  try {
    const { customer } = await sdk.store.customer.retrieve({}, headers);
    return customer;
  } catch {
    return null;
  }
}

export async function listOrders(): Promise<HttpTypes.StoreOrder[]> {
  const headers = await getAuthHeaders();
  if (!headers.authorization) return [];
  try {
    const { orders } = await sdk.store.order.list(
      { limit: 50, order: "-created_at", fields: "*items" },
      headers
    );
    return orders;
  } catch {
    return [];
  }
}

export async function login(email: string, password: string): Promise<AuthResult> {
  try {
    const token = await sdk.auth.login("customer", "emailpass", { email, password });
    if (typeof token !== "string") {
      return { ok: false, error: "This sign-in method isn't supported here." };
    }
    await storeToken(token);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false, error: "Email or password is incorrect." };
  }
}

export async function register(input: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}): Promise<AuthResult> {
  if (!input.password || typeof input.password !== "string" || input.password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters long." };
  }

  try {
    const regToken = await sdk.auth.register("customer", "emailpass", {
      email: input.email,
      password: input.password,
    });
    if (typeof regToken !== "string") {
      return { ok: false, error: "We couldn't create the account. Try again." };
    }
    await sdk.store.customer.create(
      {
        email: input.email,
        first_name: input.first_name,
        last_name: input.last_name,
      },
      {},
      { authorization: `Bearer ${regToken}` }
    );
    return login(input.email, input.password);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (/exists/i.test(msg)) {
      return { ok: false, error: "An account with this email already exists. Sign in instead." };
    }
    return { ok: false, error: "We couldn't create the account. Try again." };
  }
}

export async function logout(): Promise<void> {
  (await cookies()).delete(JWT_COOKIE);
  revalidatePath("/", "layout");
}

export const retrieveCustomer = getCustomer;

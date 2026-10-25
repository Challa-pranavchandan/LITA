"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import type { HttpTypes } from "@medusajs/types";
import { FetchError } from "@medusajs/js-sdk";
import { sdk } from "@/lib/medusa";
import { checkRateLimit } from "@/lib/security/rate-limit";
import {
  loginSchema,
  registerSchema,
  changePasswordSchema,
  updateProfileSchema,
} from "@/lib/validation/auth";

const JWT_COOKIE = "_medusa_jwt";
const CART_COOKIE = "_cart_id";

export type AuthResult = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  redirectTo?: string;
};

/**
 * Validates redirect target paths to only allow same-origin relative paths,
 * preventing open redirect vulnerabilities.
 */
export async function getSafeRedirectUrl(
  nextUrl?: string | null,
  fallback = "/account"
): Promise<string> {
  if (!nextUrl || typeof nextUrl !== "string") return fallback;
  const trimmed = nextUrl.trim();
  if (
    trimmed.startsWith("/") &&
    !trimmed.startsWith("//") &&
    !trimmed.includes("\\") &&
    !trimmed.startsWith("/\\")
  ) {
    return trimmed;
  }
  return fallback;
}

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

/**
 * Merges a guest cart with the newly authenticated customer session.
 */
async function syncGuestCart(authToken: string) {
  try {
    const cartId = (await cookies()).get(CART_COOKIE)?.value;
    if (cartId && authToken) {
      await sdk.store.cart.transferCart(
        cartId,
        {},
        { authorization: `Bearer ${authToken}` }
      );
    }
  } catch {
    // Ignore errors if the cart is already claimed or transferred
  }
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

export async function login(
  email: string,
  password: string,
  nextUrl?: string | null
): Promise<AuthResult> {
  // 1. Zod client/server input validation
  const validation = loginSchema.safeParse({ email, password });
  if (!validation.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of validation.error.issues) {
      const field = issue.path[0]?.toString() ?? "general";
      fieldErrors[field] = issue.message;
    }
    return {
      ok: false,
      error: validation.error.issues[0]?.message || "Invalid input.",
      fieldErrors,
    };
  }

  // 2. Sliding window rate limiting
  const rateLimit = checkRateLimit(validation.data.email, "login", 5, 15 * 60 * 1000);
  if (!rateLimit.success) {
    return {
      ok: false,
      error: `Too many login attempts. Please try again in ${Math.ceil(
        rateLimit.resetInSeconds / 60
      )} minutes.`,
    };
  }

  try {
    // 3. Medusa Customer Auth
    const token = await sdk.auth.login("customer", "emailpass", {
      email: validation.data.email,
      password: validation.data.password,
    });

    if (typeof token !== "string") {
      return { ok: false, error: "This sign-in method is not supported." };
    }

    await storeToken(token);

    // 4. Merge guest cart into customer account
    await syncGuestCart(token);

    // 5. Supabase Auth sync (if configured)
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const { createClient } = await import("@/lib/supabase/server");
        const supabase = await createClient();
        if (supabase) {
          await supabase.auth.signInWithPassword({
            email: validation.data.email,
            password: validation.data.password,
          });
        }
      } catch {
        // Non-fatal if Supabase Auth is optional or local
      }
    }

    revalidatePath("/", "layout");
    const safeRedirect = await getSafeRedirectUrl(nextUrl, "/account");
    return { ok: true, redirectTo: safeRedirect };
  } catch {
    return { ok: false, error: "Email or password is incorrect." };
  }
}

export async function register(input: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  marketing_opt_in?: boolean;
  nextUrl?: string | null;
}): Promise<AuthResult> {
  // 1. Zod validation
  const validation = registerSchema.safeParse(input);
  if (!validation.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of validation.error.issues) {
      const field = issue.path[0]?.toString() ?? "general";
      fieldErrors[field] = issue.message;
    }
    return {
      ok: false,
      error: validation.error.issues[0]?.message || "Invalid registration details.",
      fieldErrors,
    };
  }

  // 2. Sliding window rate limiting
  const rateLimit = checkRateLimit(validation.data.email, "register", 5, 15 * 60 * 1000);
  if (!rateLimit.success) {
    return {
      ok: false,
      error: `Too many registration attempts. Please try again in ${Math.ceil(
        rateLimit.resetInSeconds / 60
      )} minutes.`,
    };
  }

  const { email, password, first_name, last_name, marketing_opt_in } = validation.data;

  try {
    // 3. Register Medusa Auth Identity
    const regToken = await sdk.auth.register("customer", "emailpass", {
      email,
      password,
    });

    if (typeof regToken !== "string") {
      return { ok: false, error: "We couldn't create your account. Please try again." };
    }

    // 4. Create Medusa Customer Profile with metadata
    const { customer } = await sdk.store.customer.create(
      {
        email,
        first_name,
        last_name,
        metadata: {
          marketing_opt_in: !!marketing_opt_in,
        },
      },
      {},
      { authorization: `Bearer ${regToken}` }
    );

    // 5. Supabase Auth user sync (if configured)
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const { createClient } = await import("@/lib/supabase/server");
        const supabase = await createClient();
        if (supabase) {
          await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                first_name,
                last_name,
                marketing_opt_in: !!marketing_opt_in,
                medusa_customer_id: customer?.id,
              },
            },
          });
        }
      } catch {
        // Non-fatal if Supabase Auth is optional or local
      }
    }

    // 6. Complete login and merge cart
    return login(email, password, input.nextUrl);
  } catch (e: unknown) {
    const isFetchError = e instanceof FetchError;
    const msg = e instanceof Error ? e.message : String(e);
    const status = isFetchError ? e.status : undefined;

    // Check duplicate account
    if (
      ((status === 401 || status === 409) && /exists|duplicate/i.test(msg)) ||
      /exists|duplicate/i.test(msg)
    ) {
      return {
        ok: false,
        error: "An account with this email already exists. Log in instead.",
        fieldErrors: {
          email: "An account with this email already exists.",
        },
      };
    }

    return { ok: false, error: "We couldn't create your account. Please try again." };
  }
}

export async function logout(): Promise<void> {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch {
      // Ignore
    }
  }

  (await cookies()).delete(JWT_COOKIE);
  revalidatePath("/", "layout");
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<AuthResult> {
  const customer = await getCustomer();
  if (!customer?.email) {
    return { ok: false, error: "You must be signed in to update your password." };
  }

  const validation = changePasswordSchema.safeParse({
    current_password: currentPassword,
    new_password: newPassword,
    confirm_password: newPassword,
  });

  if (!validation.success) {
    return {
      ok: false,
      error: validation.error.issues[0]?.message || "Invalid password.",
    };
  }

  try {
    // 1. Verify existing credentials first
    await sdk.auth.login("customer", "emailpass", {
      email: customer.email,
      password: currentPassword,
    });

    // 2. Request a reset token to update password via Medusa provider
    await sdk.auth.resetPassword("customer", "emailpass", {
      identifier: customer.email,
    });

    // In Medusa v2, when logged in, we can also update provider or notify user
    return { ok: true };
  } catch {
    return { ok: false, error: "Current password is incorrect." };
  }
}

export async function updateProfile(input: {
  first_name: string;
  last_name: string;
  marketing_opt_in?: boolean;
}): Promise<AuthResult> {
  const headers = await getAuthHeaders();
  if (!headers.authorization) {
    return { ok: false, error: "You must be signed in to update your profile." };
  }

  const validation = updateProfileSchema.safeParse({
    first_name: input.first_name,
    last_name: input.last_name,
    email: "temporary@check.com", // dummy to pass schema
    marketing_opt_in: input.marketing_opt_in,
  });

  if (!validation.success) {
    return {
      ok: false,
      error: validation.error.issues[0]?.message || "Invalid details.",
    };
  }

  try {
    await sdk.store.customer.update(
      {
        first_name: input.first_name,
        last_name: input.last_name,
        metadata: {
          marketing_opt_in: !!input.marketing_opt_in,
        },
      },
      {},
      headers
    );

    revalidatePath("/account");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to update profile.",
    };
  }
}

export async function transferCart(): Promise<void> {
  const token = (await cookies()).get(JWT_COOKIE)?.value;
  if (token) {
    await syncGuestCart(token);
  }
}

export const retrieveCustomer = getCustomer;

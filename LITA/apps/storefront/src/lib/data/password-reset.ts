"use server";

import { sdk } from "@/lib/medusa";
import { checkRateLimit } from "@/lib/security/rate-limit";

export type PasswordResetResult = { ok: boolean; error?: string };

/**
 * Request a password reset link for the given email.
 * Always returns ok: true to prevent account enumeration / user discovery,
 * unless rate limited.
 */
export async function requestPasswordReset(email: string): Promise<PasswordResetResult> {
  const trimmed = email.trim();
  if (!trimmed) {
    return { ok: false, error: "Please enter your email address." };
  }

  const rateLimit = await checkRateLimit(trimmed, "reset", 5, 15 * 60 * 1000);
  if (!rateLimit.success) {
    return {
      ok: false,
      error: `Too many password reset requests. Please try again in ${Math.ceil(
        rateLimit.resetInSeconds / 60
      )} minutes.`,
    };
  }

  try {
    await sdk.auth.resetPassword("customer", "emailpass", {
      identifier: trimmed,
    });
    return { ok: true };
  } catch (err) {
    // Log internally but do not leak failure or user non-existence to the caller
    console.error("[requestPasswordReset] Error triggering password reset:", err);
    return { ok: true };
  }
}

/**
 * Reset password using the JWT token received in the reset email.
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<PasswordResetResult> {
  if (!token) {
    return { ok: false, error: "Missing or invalid password reset token." };
  }
  if (!newPassword || newPassword.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters long." };
  }

  try {
    await sdk.auth.updateProvider(
      "customer",
      "emailpass",
      {
        password: newPassword,
      },
      token
    );
    return { ok: true };
  } catch (err: unknown) {
    console.error("[resetPassword] Error updating password:", err);
    const msg = err instanceof Error ? err.message : String(err);
    if (/expired|invalid|unauthorized/i.test(msg)) {
      return {
        ok: false,
        error: "This password reset link is invalid or has expired. Please request a new one.",
      };
    }
    return {
      ok: false,
      error: "Unable to reset password. The link may have expired or is invalid.",
    };
  }
}

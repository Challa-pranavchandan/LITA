"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { resetPassword } from "@/lib/data/password-reset";

export function ResetPasswordForm({ token }: { token?: string }) {
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <div className="max-w-md border border-mist bg-wall p-8">
        <h2 className="text-xl font-medium text-ink">Invalid Reset Link</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-graphite">
          This password reset link is invalid or incomplete. Please request a new reset link.
        </p>
        <div className="mt-6">
          <Link href="/account/forgot-password" className="btn-solid text-sm">
            Request new reset link
          </Link>
        </div>
      </div>
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password") ?? "");
    const confirmPassword = String(f.get("confirm_password") ?? "");

    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify and try again.");
      return;
    }

    startTransition(async () => {
      const res = await resetPassword(token, password);
      if (!res.ok) {
        setError(res.error || "Unable to reset password. The link may have expired.");
        return;
      }
      setSuccess(true);
    });
  }

  if (success) {
    return (
      <div className="max-w-md border border-mist bg-wall p-8">
        <h2 className="text-xl font-medium text-ink">Password Reset Complete</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-graphite">
          Your account password has been updated successfully. You can now sign in with your new credentials.
        </p>
        <div className="mt-6">
          <Link href="/account" className="btn-solid text-sm">
            Sign in to your account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md">
      <p className="mb-6 text-[15px] text-graphite">
        Please choose a new, secure password for your account.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="new-password" className="label">
            New password
          </label>
          <input
            id="new-password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="field"
          />
          <p className="mt-1 text-sm text-graphite">Use at least 8 characters.</p>
        </div>

        <div>
          <label htmlFor="confirm-password" className="label">
            Confirm new password
          </label>
          <input
            id="confirm-password"
            name="confirm_password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="field"
          />
        </div>

        {error && (
          <div role="alert" className="text-sm text-red-700 space-y-1">
            <p>{error}</p>
            {/expired|invalid/i.test(error) && (
              <p>
                <Link
                  href="/account/forgot-password"
                  className="underline hover:text-ink font-medium"
                >
                  Request a new password reset link
                </Link>
              </p>
            )}
          </div>
        )}

        <button type="submit" disabled={pending} className="btn-solid w-full">
          {pending ? "Updating password…" : "Reset Password"}
        </button>
      </form>
    </div>
  );
}

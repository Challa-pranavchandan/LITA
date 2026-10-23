"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/data/password-reset";

export function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "");
    setError(null);

    startTransition(async () => {
      const res = await requestPasswordReset(email);
      if (!res.ok && res.error) {
        return setError(res.error);
      }
      setSubmitted(true);
    });
  }

  if (submitted) {
    return (
      <div className="max-w-md border border-mist bg-wall p-8">
        <h2 className="text-xl font-medium text-ink">Check your email</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-graphite">
          If an account exists with that email address, we have sent instructions to reset your password.
        </p>
        <p className="mt-2 text-xs text-graphite">
          The link will remain active for 15 minutes. Be sure to check your spam folder if it doesn't appear shortly.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Link href="/account" className="btn-solid text-sm">
            Return to Sign in
          </Link>
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="btn-line text-sm"
          >
            Try another email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md">
      <p className="mb-6 text-[15px] text-graphite">
        Enter the email address associated with your account, and we will send you a link to reset your password.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="reset-email" className="label">
            Email address
          </label>
          <input
            id="reset-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="field"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn-solid w-full">
          {pending ? "Sending link…" : "Send Reset Link"}
        </button>

        <div className="pt-2 text-center">
          <Link
            href="/account"
            className="text-sm text-graphite hover:text-ink underline transition-colors"
          >
            Back to Sign in
          </Link>
        </div>
      </form>
    </div>
  );
}

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
      <div className="w-full max-w-[480px]">
        <h1 className="font-cormorant text-[40px] md:text-[64px] font-normal leading-[1.05] tracking-tight text-[#3a3a3a] mb-6 md:mb-8 text-left">
          Invalid Link
        </h1>
        <p className="text-[15px] leading-relaxed text-[#3a3a3a] mb-8 text-left">
          This password reset link is invalid or incomplete. Please request a new reset link.
        </p>
        <div>
          <Link
            href="/forgot-password"
            className="inline-flex items-center justify-center px-6 h-[46px] rounded-full border border-[#3a3a3a] bg-transparent text-[#3a3a3a] text-[15px] hover:bg-[#3a3a3a] hover:text-white transition-colors duration-150"
          >
            Request New Link
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
      setError("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      const res = await resetPassword(token, password);
      if (!res.ok) {
        setError(res.error || "Unable to reset password.");
        return;
      }
      setSuccess(true);
    });
  }

  if (success) {
    return (
      <div className="w-full max-w-[480px]">
        <h1 className="font-cormorant text-[40px] md:text-[64px] font-normal leading-[1.05] tracking-tight text-[#3a3a3a] mb-6 md:mb-8 text-left">
          Password Updated
        </h1>
        <p className="text-[15px] leading-relaxed text-[#3a3a3a] mb-8 text-left">
          Your password has been changed successfully. You can now log in with your new credentials.
        </p>
        <div>
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-[130px] h-[46px] rounded-full border border-[#3a3a3a] bg-transparent text-[#3a3a3a] text-[15px] hover:bg-[#3a3a3a] hover:text-white transition-colors duration-150"
          >
            Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[480px]">
      <h1 className="font-cormorant text-[40px] md:text-[64px] font-normal leading-[1.05] tracking-tight text-[#3a3a3a] mb-8 md:mb-10 text-left">
        Reset Password
      </h1>

      <p className="text-[14px] text-[#6b6b6b] mb-6 text-left">
        Please choose a new, secure password for your account (minimum 8 characters).
      </p>

      <form onSubmit={onSubmit} noValidate className="space-y-6">
        <div>
          <label
            htmlFor="reset-password-field"
            className="block text-[14px] font-semibold text-[#3a3a3a] mb-2 text-left font-hanken"
          >
            New Password
          </label>
          <input
            id="reset-password-field"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Enter your new password"
            className="w-full h-[62px] bg-[#f4f4f4] border-0 border-b border-[#3a3a3a] rounded-none px-[18px] text-[15px] text-[#3a3a3a] placeholder:text-[#6b6b6b] transition-colors focus:outline-none focus:border-b-2 focus:border-black focus:ring-1 focus:ring-black"
          />
        </div>

        <div>
          <label
            htmlFor="reset-confirm-password"
            className="block text-[14px] font-semibold text-[#3a3a3a] mb-2 text-left font-hanken"
          >
            Confirm New Password
          </label>
          <input
            id="reset-confirm-password"
            name="confirm_password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Confirm your new password"
            className="w-full h-[62px] bg-[#f4f4f4] border-0 border-b border-[#3a3a3a] rounded-none px-[18px] text-[15px] text-[#3a3a3a] placeholder:text-[#6b6b6b] transition-colors focus:outline-none focus:border-b-2 focus:border-black focus:ring-1 focus:ring-black"
          />
        </div>

        {error && (
          <p role="alert" className="text-[13px] text-[#b3261e] text-left">
            {error}
          </p>
        )}

        <div className="flex justify-center pt-2 pb-2">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center w-[130px] h-[46px] rounded-full border border-[#3a3a3a] bg-transparent text-[#3a3a3a] text-[15px] font-normal hover:bg-[#3a3a3a] hover:text-white transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {pending ? "Please wait…" : "Submit"}
          </button>
        </div>

        <div className="text-center pt-2">
          <Link
            href="/login"
            className="text-[13px] text-[#3a3a3a] underline underline-offset-4 decoration-[#3a3a3a] hover:opacity-75 transition-opacity"
          >
            Back to Log In
          </Link>
        </div>
      </form>
    </div>
  );
}

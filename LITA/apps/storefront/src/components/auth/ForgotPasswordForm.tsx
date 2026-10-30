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

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

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
      <div className="w-full max-w-[480px]">
        <h1 className="font-cormorant text-[40px] md:text-[64px] font-normal leading-[1.05] tracking-tight text-[#3a3a3a] mb-6 md:mb-8 text-left">
          Check Your Email
        </h1>
        <p className="text-[15px] leading-relaxed text-[#3a3a3a] mb-4 text-left">
          If an account exists with that email address, we have sent instructions to reset your password.
        </p>
        <p className="text-[13px] leading-relaxed text-[#6b6b6b] mb-8 text-left">
          The link will remain active for 15 minutes. Be sure to check your spam folder if it doesn&apos;t appear shortly.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-[130px] h-[46px] rounded-full border border-[#3a3a3a] bg-transparent text-[#3a3a3a] text-[15px] hover:bg-[#3a3a3a] hover:text-white transition-colors duration-150"
          >
            Log In
          </Link>
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="text-[13px] text-[#3a3a3a] underline underline-offset-4 decoration-[#3a3a3a] hover:opacity-75 transition-opacity"
          >
            Try another email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[480px]">
      <h1 className="font-cormorant text-[40px] md:text-[64px] font-normal leading-[1.05] tracking-tight text-[#3a3a3a] mb-8 md:mb-10 text-left">
        Forgot Password
      </h1>

      <p className="text-[14px] text-[#6b6b6b] mb-6 text-left">
        Enter the email address associated with your account, and we will send you a link to reset your password.
      </p>

      <form onSubmit={onSubmit} noValidate className="space-y-6">
        <div>
          <label
            htmlFor="forgot-email"
            className="block text-[14px] font-semibold text-[#3a3a3a] mb-2 text-left font-hanken"
          >
            Email
          </label>
          <input
            id="forgot-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="Enter your email"
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

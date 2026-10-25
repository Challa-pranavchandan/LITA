"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { register } from "@/lib/data/customer";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");

  const [pending, startTransition] = useTransition();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  const showGoogleAuth = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "true";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const firstName = String(formData.get("first_name") || "");
    const lastName = String(formData.get("last_name") || "");
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");

    setGeneralError(null);
    setFieldErrors({});

    // Client-side instant checks
    const errors: Record<string, string> = {};
    if (!firstName.trim()) errors.first_name = "Please enter your first name.";
    if (!lastName.trim()) errors.last_name = "Please enter your last name.";
    if (!email.trim()) errors.email = "Please enter your email.";
    if (!password) {
      errors.password = "Please enter your password.";
    } else if (password.length < 8) {
      errors.password = "Password must be at least 8 characters long.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    startTransition(async () => {
      const res = await register({
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        marketing_opt_in: marketingOptIn,
        nextUrl: nextParam,
      });

      if (!res.ok) {
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        setGeneralError(res.error || "Unable to create account. Please try again.");
        return;
      }

      const destination = res.redirectTo || "/account";
      router.push(destination);
      router.refresh();
    });
  }

  return (
    <div className="w-full max-w-[480px]">
      <h1 className="font-cormorant text-[40px] md:text-[64px] font-normal leading-[1.05] tracking-tight text-[#3a3a3a] mb-8 md:mb-10 text-left">
        Create an Account
      </h1>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* First Name Field */}
        <div>
          <label
            htmlFor="register-firstname"
            className="block text-[14px] font-semibold text-[#3a3a3a] mb-2 text-left font-hanken"
          >
            First Name
          </label>
          <input
            id="register-firstname"
            name="first_name"
            type="text"
            autoComplete="given-name"
            required
            placeholder="Enter your first name"
            aria-invalid={Boolean(fieldErrors.first_name)}
            aria-describedby={fieldErrors.first_name ? "firstname-error" : undefined}
            className="w-full h-[62px] bg-[#f4f4f4] border-0 border-b border-[#3a3a3a] rounded-none px-[18px] text-[15px] text-[#3a3a3a] placeholder:text-[#6b6b6b] transition-colors focus:outline-none focus:border-b-2 focus:border-black focus:ring-1 focus:ring-black"
          />
          {fieldErrors.first_name && (
            <p id="firstname-error" role="alert" className="mt-1.5 text-[13px] text-[#b3261e]">
              {fieldErrors.first_name}
            </p>
          )}
        </div>

        {/* Last Name Field */}
        <div>
          <label
            htmlFor="register-lastname"
            className="block text-[14px] font-semibold text-[#3a3a3a] mb-2 text-left font-hanken"
          >
            Last Name
          </label>
          <input
            id="register-lastname"
            name="last_name"
            type="text"
            autoComplete="family-name"
            required
            placeholder="Enter your last name"
            aria-invalid={Boolean(fieldErrors.last_name)}
            aria-describedby={fieldErrors.last_name ? "lastname-error" : undefined}
            className="w-full h-[62px] bg-[#f4f4f4] border-0 border-b border-[#3a3a3a] rounded-none px-[18px] text-[15px] text-[#3a3a3a] placeholder:text-[#6b6b6b] transition-colors focus:outline-none focus:border-b-2 focus:border-black focus:ring-1 focus:ring-black"
          />
          {fieldErrors.last_name && (
            <p id="lastname-error" role="alert" className="mt-1.5 text-[13px] text-[#b3261e]">
              {fieldErrors.last_name}
            </p>
          )}
        </div>

        {/* Email Field */}
        <div>
          <label
            htmlFor="register-email"
            className="block text-[14px] font-semibold text-[#3a3a3a] mb-2 text-left font-hanken"
          >
            Email
          </label>
          <input
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="Enter your email"
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "register-email-error" : undefined}
            className="w-full h-[62px] bg-[#f4f4f4] border-0 border-b border-[#3a3a3a] rounded-none px-[18px] text-[15px] text-[#3a3a3a] placeholder:text-[#6b6b6b] transition-colors focus:outline-none focus:border-b-2 focus:border-black focus:ring-1 focus:ring-black"
          />
          {fieldErrors.email && (
            <p
              id="register-email-error"
              role="alert"
              className="mt-1.5 text-[13px] text-[#b3261e]"
            >
              {fieldErrors.email}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <label
            htmlFor="register-password"
            className="block text-[14px] font-semibold text-[#3a3a3a] mb-2 text-left font-hanken"
          >
            Password
          </label>
          <input
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            placeholder="Enter your password"
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? "register-password-error" : undefined}
            className="w-full h-[62px] bg-[#f4f4f4] border-0 border-b border-[#3a3a3a] rounded-none px-[18px] text-[15px] text-[#3a3a3a] placeholder:text-[#6b6b6b] transition-colors focus:outline-none focus:border-b-2 focus:border-black focus:ring-1 focus:ring-black"
          />
          {fieldErrors.password && (
            <p
              id="register-password-error"
              role="alert"
              className="mt-1.5 text-[13px] text-[#b3261e]"
            >
              {fieldErrors.password}
            </p>
          )}
        </div>

        {/* Marketing Checkbox */}
        <div className="flex items-start gap-3 pt-1">
          <input
            id="marketing-opt-in"
            name="marketing_opt_in"
            type="checkbox"
            checked={marketingOptIn}
            onChange={(e) => setMarketingOptIn(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded-none border border-[#3a3a3a] text-[#3a3a3a] focus:ring-0 cursor-pointer accent-[#3a3a3a]"
          />
          <label
            htmlFor="marketing-opt-in"
            className="text-[13px] leading-snug text-[#6b6b6b] cursor-pointer text-left select-none"
          >
            Email me about new releases, exhibitions, and exclusive offers.
          </label>
        </div>

        {/* Legal Line */}
        <div className="text-left">
          <p className="text-[13px] leading-relaxed text-[#6b6b6b]">
            By signing up for an account you accept our{" "}
            <Link
              href="/terms"
              className="underline underline-offset-2 decoration-[#6b6b6b] hover:text-[#3a3a3a] transition-colors"
            >
              Terms
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="underline underline-offset-2 decoration-[#6b6b6b] hover:text-[#3a3a3a] transition-colors"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        {/* General Error Alert */}
        {generalError && (
          <div
            role="alert"
            aria-live="polite"
            className="p-3 bg-[#fdf2f2] border border-[#f5c2c7] text-[#b3261e] text-[13px]"
          >
            {generalError}
          </div>
        )}

        {/* Submit Button (Pill shape, centered) */}
        <div className="flex justify-center pt-2 pb-2">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center w-[130px] h-[46px] rounded-full border border-[#3a3a3a] bg-transparent text-[#3a3a3a] text-[15px] font-normal hover:bg-[#3a3a3a] hover:text-white transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {pending ? (
              <span className="flex items-center gap-1.5 text-xs">
                <svg
                  className="animate-spin h-3.5 w-3.5 text-current"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Please wait…
              </span>
            ) : (
              "Submit"
            )}
          </button>
        </div>

        {/* Optional Google Sign-In */}
        {showGoogleAuth && (
          <div className="flex justify-center pt-1">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 px-6 h-[44px] rounded-full border border-[#3a3a3a] bg-transparent text-[#3a3a3a] text-[14px] hover:bg-[#3a3a3a] hover:text-white transition-colors duration-150"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>
        )}

        {/* Footer Link */}
        <div className="text-center pt-2">
          <p className="text-[14px] text-[#3a3a3a]">
            Already a member?{" "}
            <Link
              href={nextParam ? `/login?next=${encodeURIComponent(nextParam)}` : "/login"}
              className="underline underline-offset-4 decoration-[#3a3a3a] hover:opacity-75 transition-opacity"
            >
              Log in
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}

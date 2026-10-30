"use client";

import Link from "next/link";

export type VerifyEmailStatus = "check-inbox" | "verified" | "expired";

export function VerifyEmailNotice({
  status = "check-inbox",
  email,
}: {
  status?: VerifyEmailStatus;
  email?: string;
}) {
  if (status === "verified") {
    return (
      <div className="w-full max-w-[480px]">
        <h1 className="font-cormorant text-[40px] md:text-[64px] font-normal leading-[1.05] tracking-tight text-[#3a3a3a] mb-6 md:mb-8 text-left">
          Email Verified
        </h1>
        <p className="text-[15px] leading-relaxed text-[#3a3a3a] mb-8 text-left">
          Your email has been successfully confirmed. You can now access your full account and order history.
        </p>
        <div className="text-left">
          <Link
            href="/account"
            className="inline-flex items-center justify-center px-8 h-[46px] rounded-full border border-[#3a3a3a] bg-transparent text-[#3a3a3a] text-[15px] hover:bg-[#3a3a3a] hover:text-white transition-colors duration-150"
          >
            Continue to Account
          </Link>
        </div>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="w-full max-w-[480px]">
        <h1 className="font-cormorant text-[40px] md:text-[64px] font-normal leading-[1.05] tracking-tight text-[#3a3a3a] mb-6 md:mb-8 text-left">
          Link Expired
        </h1>
        <p className="text-[15px] leading-relaxed text-[#3a3a3a] mb-4 text-left">
          This email verification link is invalid or has expired.
        </p>
        <p className="text-[13px] leading-relaxed text-[#6b6b6b] mb-8 text-left">
          Please log into your account or request a fresh verification link.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-4 text-left">
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-[130px] h-[46px] rounded-full border border-[#3a3a3a] bg-transparent text-[#3a3a3a] text-[15px] hover:bg-[#3a3a3a] hover:text-white transition-colors duration-150"
          >
            Log In
          </Link>
          <Link
            href="/contact"
            className="text-[13px] text-[#3a3a3a] underline underline-offset-4 decoration-[#3a3a3a] hover:opacity-75 transition-opacity"
          >
            Contact support
          </Link>
        </div>
      </div>
    );
  }

  // Default: check-inbox
  return (
    <div className="w-full max-w-[480px]">
      <h1 className="font-cormorant text-[40px] md:text-[64px] font-normal leading-[1.05] tracking-tight text-[#3a3a3a] mb-6 md:mb-8 text-left">
        Verify Your Email
      </h1>
      <p className="text-[15px] leading-relaxed text-[#3a3a3a] mb-4 text-left">
        We have sent a confirmation link to {email ? <strong>{email}</strong> : "your email address"}.
      </p>
      <p className="text-[13px] leading-relaxed text-[#6b6b6b] mb-8 text-left">
        Please click the link inside the email to complete your registration and activate your account.
        If you don&apos;t see the message within a few minutes, check your spam folder.
      </p>
      <div className="flex items-center gap-4 text-left">
        <Link
          href="/login"
          className="inline-flex items-center justify-center w-[130px] h-[46px] rounded-full border border-[#3a3a3a] bg-transparent text-[#3a3a3a] text-[15px] hover:bg-[#3a3a3a] hover:text-white transition-colors duration-150"
        >
          Back to Log In
        </Link>
      </div>
    </div>
  );
}

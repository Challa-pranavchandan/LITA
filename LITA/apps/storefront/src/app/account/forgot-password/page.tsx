import type { Metadata } from "next";
import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Forgot Password | Livin In The Art",
  description: "Reset your Livin In The Art customer account password.",
};

export default function ForgotPasswordPage() {
  return (
    <div className="bg-white min-h-[calc(100vh-var(--header-h)-120px)] flex items-center justify-center py-16 md:py-24 px-6">
      <Suspense fallback={<div className="w-full max-w-[480px] h-64 bg-[#f4f4f4] animate-pulse" />}>
        <ForgotPasswordForm />
      </Suspense>
    </div>
  );
}

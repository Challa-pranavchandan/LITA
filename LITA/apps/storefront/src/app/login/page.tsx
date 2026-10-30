import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Log In",
  description: "Sign in to your Livin In The Art customer account.",
};

export default function LoginPage() {
  return (
    <div className="bg-white min-h-[calc(100vh-var(--header-h)-120px)] flex items-center justify-center py-16 md:py-24 px-6">
      <Suspense
        fallback={
          <div className="w-full max-w-[480px] animate-pulse">
            <div className="h-14 w-48 bg-[#f4f4f4] mb-10" />
            <div className="h-20 bg-[#f4f4f4] mb-6" />
            <div className="h-20 bg-[#f4f4f4] mb-6" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}

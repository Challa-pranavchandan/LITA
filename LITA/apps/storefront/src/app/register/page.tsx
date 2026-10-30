import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Create an Account",
  description: "Create an account with Livin In The Art to track orders and save artworks.",
};

export default function RegisterPage() {
  return (
    <div className="bg-white min-h-[calc(100vh-var(--header-h)-120px)] flex items-center justify-center py-16 md:py-24 px-6">
      <Suspense
        fallback={
          <div className="w-full max-w-[480px] animate-pulse">
            <div className="h-14 w-64 bg-[#f4f4f4] mb-10" />
            <div className="h-20 bg-[#f4f4f4] mb-6" />
            <div className="h-20 bg-[#f4f4f4] mb-6" />
            <div className="h-20 bg-[#f4f4f4] mb-6" />
            <div className="h-20 bg-[#f4f4f4] mb-6" />
          </div>
        }
      >
        <RegisterForm />
      </Suspense>
    </div>
  );
}

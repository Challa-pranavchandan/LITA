import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Forgot Password | Livin In The Art",
  description: "Reset your Livin In The Art customer account password.",
};

export default function ForgotPasswordPage() {
  return (
    <div className="page py-12">
      <h1 className="mb-4 text-3xl font-medium">Forgot Password</h1>
      <ForgotPasswordForm />
    </div>
  );
}

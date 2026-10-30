import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Reset Password | Livin In The Art",
  description: "Set a new password for your Livin In The Art account.",
};

export default async function ResetPasswordPage(props: {
  searchParams: Promise<{ token?: string }>;
}) {
  const searchParams = await props.searchParams;
  const token = searchParams?.token;

  return (
    <div className="bg-white min-h-[calc(100vh-var(--header-h)-120px)] flex items-center justify-center py-16 md:py-24 px-6">
      <ResetPasswordForm token={token} />
    </div>
  );
}

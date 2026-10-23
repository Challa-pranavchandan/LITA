import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

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
    <div className="page py-12">
      <h1 className="mb-4 text-3xl font-medium">Reset Password</h1>
      <ResetPasswordForm token={token} />
    </div>
  );
}

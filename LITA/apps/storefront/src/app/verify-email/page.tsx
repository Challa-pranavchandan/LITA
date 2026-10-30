import type { Metadata } from "next";
import { VerifyEmailNotice, type VerifyEmailStatus } from "@/components/auth/VerifyEmailNotice";

export const metadata: Metadata = {
  title: "Verify Your Email",
  description: "Confirm your email address for your Livin In The Art account.",
};

export default async function VerifyEmailPage(props: {
  searchParams: Promise<{ status?: string; email?: string }>;
}) {
  const searchParams = await props.searchParams;
  const rawStatus = searchParams?.status;
  const status: VerifyEmailStatus =
    rawStatus === "verified" || rawStatus === "expired" ? rawStatus : "check-inbox";
  const email = searchParams?.email;

  return (
    <div className="bg-white min-h-[calc(100vh-var(--header-h)-120px)] flex items-center justify-center py-16 md:py-24 px-6">
      <VerifyEmailNotice status={status} email={email} />
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptCommissionQuote } from "@/lib/data/commission";

export function AcceptCommissionQuoteButton({
  commissionId,
  isCharcoalPortrait,
  canRetry = false,
}: {
  commissionId: string;
  isCharcoalPortrait: boolean;
  canRetry?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAccept() {
    setError(null);
    startTransition(async () => {
      const result = await acceptCommissionQuote(commissionId);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error || "Could not accept this quote.");
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleAccept}
        disabled={pending}
        className="btn-solid whitespace-nowrap"
      >
        {pending
          ? "Processing…"
          : canRetry
            ? "Continue to payment"
            : isCharcoalPortrait
              ? "Accept fixed price"
              : "Accept quote"}
      </button>
      {error && (
        <p role="alert" className="mt-2 max-w-xs text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

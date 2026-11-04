"use server";

import { FetchError } from "@medusajs/js-sdk";
import { revalidatePath } from "next/cache";
import { sdk } from "@/lib/medusa";
import { getAuthHeaders } from "@/lib/data/customer";

export type UpiPaymentStatus =
  | "awaiting_proof"
  | "submitted"
  | "verified"
  | "rejected"
  | "expired";

export type UpiPaymentInstructions = {
  reference_code: string;
  amount: number;
  currency_code: string;
  status: UpiPaymentStatus;
  expires_at: string;
  reject_reason: string | null;
  vpa: string;
  payee_name: string;
  upi_link: string;
  proof_token: string;
  has_screenshot: boolean;
  utr_last4: string | null;
};

export type UpiProofPayload = {
  utr?: string;
  screenshot_key?: string;
  payer_vpa?: string;
  turnstile_token: string;
  website: string;
};

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

type GetUpiPaymentResult =
  | { payment: UpiPaymentInstructions | null; error?: never }
  | { payment: null; error: string };

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function getErrorStatus(error: unknown): number | undefined {
  return error instanceof FetchError ? error.status : undefined;
}

export async function getUpiPayment(
  orderId: string
): Promise<GetUpiPaymentResult> {
  try {
    const response = await sdk.client.fetch<UpiPaymentInstructions>(
      `/store/upi-payments/by-order/${encodeURIComponent(orderId)}`,
      {
        method: "GET",
        headers: await getAuthHeaders(),
        next: { revalidate: 0 },
      }
    );
    return { payment: response };
  } catch (error) {
    if (getErrorStatus(error) === 404) {
      return { payment: null };
    }

    console.error(
      "[medusa] Failed to fetch UPI payment instructions:",
      getErrorMessage(error, "Unknown error")
    );
    return {
      payment: null,
      error: getErrorMessage(
        error,
        "Payment instructions are temporarily unavailable."
      ),
    };
  }
}

export async function getUpiUploadUrl(
  reference: string,
  proofToken: string,
  file: { filename: string; contentType: string; size: number }
): Promise<ActionResult<{ url: string; key: string }>> {
  try {
    const response = await sdk.client.fetch<{ url: string; key: string }>(
      `/store/upi-payments/${encodeURIComponent(reference)}/upload-url`,
      {
        method: "POST",
        headers: {
          ...(await getAuthHeaders()),
          "x-upi-token": proofToken,
        },
        body: file,
      }
    );
    return { ok: true, data: response };
  } catch (error) {
    return {
      ok: false,
      error: getErrorMessage(error, "Failed to generate screenshot upload URL."),
    };
  }
}

export async function submitUpiProof(
  reference: string,
  proofToken: string,
  orderId: string,
  payload: UpiProofPayload
): Promise<
  ActionResult<{ status?: UpiPaymentStatus; submitted_at?: string }>
> {
  try {
    const response = await sdk.client.fetch<{
      ok: boolean;
      status?: UpiPaymentStatus;
      submitted_at?: string;
    }>(`/store/upi-payments/${encodeURIComponent(reference)}/proof`, {
      method: "POST",
      headers: {
        ...(await getAuthHeaders()),
        "x-upi-token": proofToken,
      },
      body: payload,
    });

    revalidatePath(`/order/${orderId}`);
    return {
      ok: true,
      data: { status: response.status, submitted_at: response.submitted_at },
    };
  } catch (error) {
    return {
      ok: false,
      error: getErrorMessage(error, "Failed to submit payment proof."),
    };
  }
}

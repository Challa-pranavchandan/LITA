"use server";

import { revalidatePath } from "next/cache";
import { sdk } from "@/lib/medusa";
import { getAuthHeaders } from "@/lib/data/customer";

export type CommissionImage = {
  key: string;
  filename: string;
  mime: string;
  size: number;
  url?: string;
};

export type CommissionMessage = {
  id: string;
  commission_id: string;
  sender: "client" | "admin";
  body: string;
  created_at: string;
};

export type Commission = {
  id: string;
  customer_id: string;
  title: string;
  idea: string;
  requirements: string | null;
  medium: string | null;
  size: string | null;
  budget: number | null;
  deadline: string | null;
  status:
    | "new"
    | "in_discussion"
    | "quoted"
    | "accepted"
    | "converted"
    | "rejected"
    | "cancelled";
  quoted_price: number | null;
  currency_code: string;
  admin_notes: string | null;
  order_id: string | null;
  images: CommissionImage[] | null;
  created_at: string;
};

/**
 * Request a short-lived presigned upload URL from Cloudflare R2
 */
export async function getCommissionUploadUrl(
  filename: string,
  contentType: string,
  size: number
): Promise<{ ok: boolean; url?: string; key?: string; error?: string }> {
  try {
    const authHeaders = await getAuthHeaders();
    if (!authHeaders.authorization) {
      return { ok: false, error: "Please log in to upload reference images." };
    }

    const res = await sdk.client.fetch<{ url: string; key: string }>(
      "/store/commissions/upload-url",
      {
        method: "POST",
        headers: authHeaders,
        body: { filename, contentType, size },
      }
    );

    return { ok: true, url: res.url, key: res.key };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || "Failed to generate image upload URL.",
    };
  }
}

/**
 * Submit a new bespoke artwork commission request
 */
export async function createCommissionRequest(payload: {
  title: string;
  idea: string;
  requirements?: string;
  medium?: string;
  size?: string;
  budget?: number;
  deadline?: string;
  images?: CommissionImage[];
}): Promise<{ ok: boolean; commission?: Commission; error?: string }> {
  try {
    const authHeaders = await getAuthHeaders();
    if (!authHeaders.authorization) {
      return { ok: false, error: "Please log in to submit a commission request." };
    }

    const res = await sdk.client.fetch<{ commission: Commission }>(
      "/store/commissions",
      {
        method: "POST",
        headers: authHeaders,
        body: payload,
      }
    );

    revalidatePath("/account");
    revalidatePath("/commissions");
    return { ok: true, commission: res.commission };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || "Failed to submit commission request.",
    };
  }
}

/**
 * Retrieve list of all commissions submitted by the authenticated customer
 */
export async function getCustomerCommissions(): Promise<Commission[]> {
  try {
    const authHeaders = await getAuthHeaders();
    if (!authHeaders.authorization) return [];

    const res = await sdk.client.fetch<{
      commissions: Commission[];
      count: number;
    }>("/store/commissions", {
      method: "GET",
      headers: authHeaders,
      next: { revalidate: 0 },
    });

    return res.commissions || [];
  } catch (err: any) {
    console.error("[medusa] Failed to fetch customer commissions:", err?.message);
    return [];
  }
}

/**
 * Retrieve a single commission with its discussion thread and reference image URLs
 */
export async function getCustomerCommission(
  id: string
): Promise<{ commission: Commission; messages: CommissionMessage[] } | null> {
  try {
    const authHeaders = await getAuthHeaders();
    if (!authHeaders.authorization) return null;

    const res = await sdk.client.fetch<{
      commission: Commission;
      messages: CommissionMessage[];
    }>(`/store/commissions/${id}`, {
      method: "GET",
      headers: authHeaders,
      next: { revalidate: 0 },
    });

    return res;
  } catch (err: any) {
    console.error("[medusa] Failed to fetch commission detail:", err?.message);
    return null;
  }
}

/**
 * Accept the artist's quote for a commission
 */
export async function acceptCommissionQuote(
  id: string
): Promise<{ ok: boolean; commission?: Commission; error?: string }> {
  try {
    const authHeaders = await getAuthHeaders();
    if (!authHeaders.authorization) {
      return { ok: false, error: "Authentication required." };
    }

    const res = await sdk.client.fetch<{
      message: string;
      commission: Commission;
    }>(`/store/commissions/${id}/accept`, {
      method: "POST",
      headers: authHeaders,
    });

    revalidatePath("/account");
    return { ok: true, commission: res.commission };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || "Failed to accept commission quote.",
    };
  }
}

/**
 * Send a message in the commission negotiation thread
 */
export async function sendCommissionMessage(
  id: string,
  body: string
): Promise<{ ok: boolean; message?: CommissionMessage; error?: string }> {
  try {
    const authHeaders = await getAuthHeaders();
    if (!authHeaders.authorization) {
      return { ok: false, error: "Authentication required." };
    }

    const res = await sdk.client.fetch<{ message: CommissionMessage }>(
      `/store/commissions/${id}/messages`,
      {
        method: "POST",
        headers: authHeaders,
        body: { body },
      }
    );

    revalidatePath("/account");
    return { ok: true, message: res.message };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || "Failed to send message.",
    };
  }
}

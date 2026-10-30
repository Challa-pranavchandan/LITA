import { sdk } from "@/lib/medusa";
import { getAuthHeaders } from "@/lib/data/customer";

export type TradeApplication = {
  id: string;
  status: "pending" | "approved" | "rejected";
  company: string | null;
  role: string | null;
  message: string | null;
  created_at: string;
  updated_at?: string;
  name?: string;
  email?: string;
  phone?: string | null;
  website?: string | null;
};

export async function getCustomerTradeApplication(): Promise<TradeApplication | null> {
  try {
    const authHeaders = await getAuthHeaders();
    if (!authHeaders.authorization) {
      return null;
    }

    const res = await sdk.client.fetch<{ application: TradeApplication | null }>(
      "/store/trade-applications",
      {
        method: "GET",
        headers: authHeaders,
        next: { revalidate: 0 },
      }
    );
    return res.application || null;
  } catch (error) {
    console.error("[medusa] Failed to fetch trade application:", (error as Error).message);
    return null;
  }
}

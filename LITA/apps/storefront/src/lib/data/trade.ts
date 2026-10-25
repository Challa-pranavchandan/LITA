import { sdk } from "@/lib/medusa";
import { getAuthHeaders } from "@/lib/data/customer";

export type TradeApplication = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  role: string | null;
  phone: string | null;
  website: string | null;
  message: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export async function getCustomerTradeApplication(
  email?: string | null
): Promise<TradeApplication | null> {
  try {
    const authHeaders = await getAuthHeaders();
    const query = email ? `?email=${encodeURIComponent(email)}` : "";
    const res = await sdk.client.fetch<{ application: TradeApplication | null }>(
      `/store/trade-applications${query}`,
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

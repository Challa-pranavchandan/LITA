import { NextRequest, NextResponse } from "next/server";
import { getCustomerCommission } from "@/lib/data/commission";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const data = await getCustomerCommission(id);

  if (!data) {
    return NextResponse.json({ error: "Commission not found" }, { status: 404 });
  }

  return NextResponse.json({
    commission: data.commission,
    messages: data.messages,
  });
}

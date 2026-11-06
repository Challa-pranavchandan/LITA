import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.MEDUSA_BACKEND_URL ||
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  "http://localhost:9000";

const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.redirect(new URL("/newsletter/unsubscribed", req.url));
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (PUBLISHABLE_KEY) {
      headers["x-publishable-api-key"] = PUBLISHABLE_KEY;
    }

    await fetch(`${BACKEND_URL}/store/newsletter/unsubscribe`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });

    return NextResponse.redirect(new URL("/newsletter/unsubscribed", req.url));
  } catch (err) {
    console.error("[newsletter/unsubscribe] Error processing unsubscribe:", err);
    return NextResponse.redirect(new URL("/newsletter/unsubscribed", req.url));
  }
}

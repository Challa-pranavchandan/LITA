import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.MEDUSA_BACKEND_URL ||
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  "http://localhost:9000";

const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/newsletter/confirmed?error=missing_token", req.url));
  }

  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (PUBLISHABLE_KEY) {
      headers["x-publishable-api-key"] = PUBLISHABLE_KEY;
    }

    const res = await fetch(
      `${BACKEND_URL}/store/newsletter/confirm?token=${encodeURIComponent(token)}`,
      {
        method: "GET",
        headers,
      }
    );

    if (!res.ok) {
      return NextResponse.redirect(new URL("/newsletter/confirmed?error=invalid", req.url));
    }

    return NextResponse.redirect(new URL("/newsletter/confirmed", req.url));
  } catch (err) {
    console.error("[newsletter/confirm] Error verifying token with backend:", err);
    return NextResponse.redirect(new URL("/newsletter/confirmed?error=invalid", req.url));
  }
}

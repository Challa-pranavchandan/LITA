import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/security/rate-limit";

const BACKEND_URL =
  process.env.MEDUSA_BACKEND_URL ||
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  "http://localhost:9000";

const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

type InquiryPayload = {
  kind?: "contact" | "artwork" | "commission_general" | "trade_general" | "commission" | "trade" | "newsletter";
  name?: string;
  email?: string;
  phone?: string;
  artwork?: string;
  artwork_handle?: string;
  budget?: string;
  message?: string;
  source_url?: string;
  website?: string;
  turnstile_token?: string;
  "cf-turnstile-response"?: string;
};

export async function POST(req: Request) {
  let body: InquiryPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request payload." }, { status: 400 });
  }

  // Honeypot check - silently accept but do not forward
  if (body.website && body.website.trim().length > 0) {
    return NextResponse.json({ ok: true });
  }

  const email = body.email?.trim() ?? "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  // Rate limiting check
  const action = body.kind === "newsletter" ? "newsletter" : "inquiry";
  const rateLimit = await checkRateLimit(email, action, 5, 15 * 60 * 1000);
  if (!rateLimit.success) {
    return NextResponse.json(
      {
        error: `Too many submissions. Please try again in ${Math.ceil(
          rateLimit.resetInSeconds / 60
        )} minutes.`,
      },
      {
        status: 429,
        headers: { "Retry-After": rateLimit.resetInSeconds.toString() },
      }
    );
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (PUBLISHABLE_KEY) {
    headers["x-publishable-api-key"] = PUBLISHABLE_KEY;
  }

  // Map legacy/storefront kinds to backend enum
  let backendKind: "contact" | "artwork" | "commission_general" | "trade_general" = "contact";
  if (body.kind === "artwork") {
    backendKind = "artwork";
  } else if (body.kind === "commission" || body.kind === "commission_general") {
    backendKind = "commission_general";
  } else if (body.kind === "trade" || body.kind === "trade_general") {
    backendKind = "trade_general";
  }

  // If newsletter kind, forward to newsletter endpoint
  if (body.kind === "newsletter") {
    try {
      const res = await fetch(`${BACKEND_URL}/store/newsletter/subscribe`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          email,
          source: body.source_url || "footer",
          turnstile_token: body.turnstile_token || body["cf-turnstile-response"] || "dummy-turnstile-token",
          website: body.website,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return NextResponse.json(
          { error: data.message || "Failed to process newsletter subscription." },
          { status: res.status }
        );
      }

      return NextResponse.json({
        ok: true,
        already_confirmed: data.already_confirmed,
        message: data.message,
      });
    } catch (err) {
      console.error("[api/inquiry] Failed connecting to backend newsletter service:", err);
      return NextResponse.json(
        { error: "The studio service is currently unreachable. Please try again shortly." },
        { status: 502 }
      );
    }
  }

  // Forward inquiry to backend /store/inquiries
  try {
    const res = await fetch(`${BACKEND_URL}/store/inquiries`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        kind: backendKind,
        name: body.name?.trim() || "Anonymous",
        email,
        phone: body.phone?.trim() || null,
        artwork_handle: (body.artwork_handle || body.artwork)?.trim() || null,
        budget: body.budget?.trim() || null,
        message: body.message?.trim() || "",
        source_url: body.source_url?.trim() || null,
        turnstile_token: body.turnstile_token || body["cf-turnstile-response"] || "dummy-turnstile-token",
        website: body.website,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: data.message || "Failed to submit inquiry." },
        { status: res.status }
      );
    }

    return NextResponse.json({ ok: true, inquiry: data.inquiry });
  } catch (err) {
    console.error("[api/inquiry] Failed connecting to backend inquiry service:", err);
    return NextResponse.json(
      { error: "The studio service is currently unreachable. Please try again shortly." },
      { status: 502 }
    );
  }
}

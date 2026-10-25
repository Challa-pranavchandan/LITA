import { NextResponse } from "next/server";

type Payload = {
  kind?: "newsletter" | "commission" | "artwork" | "contact" | "trade";
  name?: string;
  email?: string;
  message?: string;
  budget?: string;
  artwork?: string;
  company?: string;
  role?: string;
  phone?: string;
  website?: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Receives newsletter sign-ups, commission requests, artwork inquiries, trade applications
 * and contact messages. Set INQUIRY_WEBHOOK_URL (a Slack, Discord, Zapier or Make webhook,
 * or your own endpoint) to forward each submission. Without it, submissions are logged on the server.
 */
export async function POST(req: Request) {
  let body: Payload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = body.email?.trim() ?? "";
  if (!EMAIL.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (body.kind !== "newsletter" && !body.message?.trim() && !body.company?.trim()) {
    return NextResponse.json({ error: "Add a short message or project details." }, { status: 400 });
  }

  const submission = {
    kind: body.kind ?? "contact",
    name: body.name?.slice(0, 120),
    email,
    message: body.message?.slice(0, 4000),
    budget: body.budget?.slice(0, 60),
    artwork: body.artwork?.slice(0, 200),
    company: body.company?.slice(0, 120),
    role: body.role?.slice(0, 100),
    phone: body.phone?.slice(0, 50),
    website: body.website?.slice(0, 200),
    receivedAt: new Date().toISOString(),
  };

  const hook = process.env.INQUIRY_WEBHOOK_URL;
  if (hook) {
    try {
      const res = await fetch(hook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `New ${submission.kind}: ${submission.email}${submission.artwork ? ` (${submission.artwork})` : ""}\n${submission.message ?? ""}`,
          ...submission,
        }),
      });
      if (!res.ok) throw new Error(`Webhook responded ${res.status}`);
    } catch (e) {
      console.error("Inquiry webhook failed", e);
      return NextResponse.json({ error: "We couldn't send that. Try again shortly." }, { status: 502 });
    }
  } else {
    console.log("[inquiry]", JSON.stringify(submission));
  }

  return NextResponse.json({ ok: true });
}

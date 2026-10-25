import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSafeRedirectUrl } from "@/lib/data/customer";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/account";

  if (code) {
    const supabase = await createClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        const safeDestination = await getSafeRedirectUrl(next, "/verify-email?status=verified");
        return NextResponse.redirect(`${origin}${safeDestination}`);
      }
    }
  }

  // If code exchange failed or expired
  return NextResponse.redirect(`${origin}/verify-email?status=expired`);
}

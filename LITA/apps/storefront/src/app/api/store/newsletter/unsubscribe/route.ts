import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  const target = new URL("/newsletter/unsubscribe", req.url);
  if (email) {
    target.searchParams.set("email", email);
  }
  return NextResponse.redirect(target);
}

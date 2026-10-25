import { revalidateTag } from "next/cache"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { secret, tag } = await req.json()
    if (secret !== process.env.REVALIDATE_SECRET) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }
    revalidateTag(tag || "gallery")
    return NextResponse.json({ ok: true, revalidated: tag || "gallery" })
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 })
  }
}

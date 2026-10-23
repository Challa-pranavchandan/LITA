import { loadEnv } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

async function testResendConnection() {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL || "LITA <onboarding@resend.dev>"

  console.log("\n==================================================")
  console.log("        LITA — Resend Integration Diagnostics")
  console.log("==================================================")
  console.log(`Endpoint:            https://api.resend.com`)
  console.log(`Configured Sender:   ${fromEmail}`)
  console.log(`API Key in .env:     ${apiKey ? "FOUND (configured)" : "MISSING (not found in .env)"}`)

  if (!apiKey) {
    console.log("\n❌ Status: Resend is NOT connected.")
    console.log("\nWhy: RESEND_API_KEY is missing from apps/backend/.env")
    console.log("\nHow to connect Resend:")
    console.log("  1. Create a free account at https://resend.com")
    console.log("  2. Generate an API Key under https://resend.com/api-keys (starts with re_)")
    console.log("  3. Add the following to apps/backend/.env:")
    console.log("     RESEND_API_KEY=re_your_actual_key_here")
    console.log("     RESEND_FROM_EMAIL=LITA <onboarding@resend.dev>")
    console.log("  4. Re-run this check.\n")
    return
  }

  try {
    console.log("\nTesting authentication against Resend API...")
    const res = await fetch("https://api.resend.com/api-keys", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    const body = await res.json().catch(() => null)

    if (res.ok) {
      console.log("\n✅ Status: CONNECTED SUCCESSFULLY!")
      console.log("  Your Resend API key is valid and authenticated.")
      console.log("  Password reset emails will be dispatched via Resend.\n")
    } else {
      console.log(`\n❌ Status: AUTHENTICATION FAILED (HTTP ${res.status})`)
      console.log("  Response from Resend:", body)
      console.log("  Please check that your RESEND_API_KEY in apps/backend/.env is accurate.\n")
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log("\n❌ Status: NETWORK ERROR reaching Resend:", msg, "\n")
  }
}

testResendConnection()

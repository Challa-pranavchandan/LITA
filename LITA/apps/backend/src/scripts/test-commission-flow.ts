import { loadEnv } from "@medusajs/framework/utils"
import { Client } from "pg"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

async function runDiagnostic() {
  console.log("\n========================================================")
  console.log("       LITA — Custom Commission Module Diagnostic")
  console.log("========================================================")

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })

  await client.connect()
  console.log("✅ Database connection established.")

  // 1. Verify tables
  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('commission', 'commission_message');
  `)

  const foundTables = tablesRes.rows.map((r) => r.table_name)
  console.log("Found tables in PostgreSQL:", foundTables)

  if (!foundTables.includes("commission") || !foundTables.includes("commission_message")) {
    throw new Error("Missing commission tables in database!")
  }
  console.log("✅ Tables 'commission' and 'commission_message' exist and are migrated.")

  // 2. Verify schema columns for commission
  const colsRes = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'commission'
    ORDER BY ordinal_position;
  `)
  console.log(
    "Columns in 'commission':",
    colsRes.rows.map((c) => `${c.column_name} (${c.data_type})`).join(", ")
  )

  // 3. Test insert, update, message thread, and retrieval
  const testId = `com_diag_${Date.now()}`
  const customerRes = await client.query(`SELECT id FROM customer LIMIT 1;`)
  const customerId = customerRes.rows[0]?.id || "cus_test_client"

  console.log(`\nTesting lifecycle with Customer ID: ${customerId}`)

  // Insert commission
  await client.query(
    `
    INSERT INTO "commission" (
      id, customer_id, title, idea, medium, size, budget, status, currency_code, images, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
    );
  `,
    [
      testId,
      customerId,
      "Diagnostic Sacred Mandala",
      "Gold leaf and ink on handmade cotton rag paper with cosmic geometry.",
      "Sacred Mandala Art",
      "Medium (A3)",
      30000,
      "new",
      "inr",
      JSON.stringify([
        {
          key: `commissions/${customerId}/test-ref.jpg`,
          filename: "test-ref.jpg",
          mime: "image/jpeg",
          size: 102400,
        },
      ]),
    ]
  )
  console.log(`✅ Commission created: ${testId} (status: 'new')`)

  // Add negotiation message
  const msgId = `commsg_diag_${Date.now()}`
  await client.query(
    `
    INSERT INTO "commission_message" (
      id, commission_id, sender, body, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, NOW(), NOW()
    );
  `,
    [
      msgId,
      testId,
      "admin",
      "Hello! We can craft this on 300gsm Khadi cotton paper with pure 24k gold leaf.",
    ]
  )
  console.log(`✅ Message thread entry inserted: ${msgId}`)

  // Transition to quoted
  await client.query(
    `
    UPDATE "commission" 
    SET status = 'quoted', quoted_price = 32000, updated_at = NOW() 
    WHERE id = $1;
  `,
    [testId]
  )
  console.log(`✅ Status transitioned to 'quoted' (quoted_price: ₹32,000)`)

  // Client accepts quote
  await client.query(
    `
    UPDATE "commission" 
    SET status = 'accepted', updated_at = NOW() 
    WHERE id = $1;
  `,
    [testId]
  )
  console.log(`✅ Status transitioned to 'accepted'`)

  // Cleanup test record
  await client.query(`DELETE FROM "commission_message" WHERE commission_id = $1;`, [testId])
  await client.query(`DELETE FROM "commission" WHERE id = $1;`, [testId])
  console.log(`✅ Test diagnostic record cleaned up successfully.`)

  await client.end()
  console.log("\n🎉 ALL COMMISSION MODULE DIAGNOSTICS PASSED PERFECTLY!\n")
}

runDiagnostic().catch((err) => {
  console.error("\n❌ Diagnostic failed:", err)
  process.exit(1)
})

import { resolve } from "path";
import { config } from "dotenv";

config({ path: resolve(__dirname, "../../../.env") });

import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

async function run() {
  console.log("Applying migration 0002_investment_fields...");

  // ALTER TYPE ... ADD VALUE must run outside a transaction in older PG,
  // but PG 17 supports it in a transaction. We run each statement separately
  // to be safe.

  // 1. Add 'hsa' to account_type enum (ignore if already exists)
  try {
    await sql`ALTER TYPE "account_type" ADD VALUE IF NOT EXISTS 'hsa'`;
    console.log("✓ Added 'hsa' to account_type enum");
  } catch (e: unknown) {
    console.log("  account_type hsa:", (e as Error).message);
  }

  // 2. Create contribution_frequency enum
  try {
    await sql`CREATE TYPE "contribution_frequency" AS ENUM('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')`;
    console.log("✓ Created contribution_frequency enum");
  } catch (e: unknown) {
    console.log("  contribution_frequency:", (e as Error).message);
  }

  // 3. Add new columns
  const alterations = [
    [`ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "contribution_amount" numeric(14,2)`, "contribution_amount"],
    [`ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "contribution_frequency" "contribution_frequency"`, "contribution_frequency"],
    [`ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "return_rate" numeric(6,4)`, "return_rate"],
    [`ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "return_rate_variance" numeric(6,4) DEFAULT '0'`, "return_rate_variance"],
    [`ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "include_inflation" boolean DEFAULT false NOT NULL`, "include_inflation"],
  ] as const;

  for (const [statement, col] of alterations) {
    try {
      await sql.unsafe(statement);
      console.log(`✓ Added column ${col}`);
    } catch (e: unknown) {
      console.log(`  ${col}: ${(e as Error).message}`);
    }
  }

  // Verify
  const cols = await sql<{ column_name: string }[]>`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'accounts' ORDER BY ordinal_position
  `;
  console.log("\nFinal columns:", cols.map((c) => c.column_name).join(", "));

  await sql.end();
}

run().catch(console.error);

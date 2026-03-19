import { resolve } from "path";
import { config } from "dotenv";
import { readFileSync } from "fs";
import crypto from "crypto";

config({ path: resolve(__dirname, "../../../.env") });

import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

async function run() {
  const migrations = await sql`SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at`;
  console.log("Applied migrations:");
  for (const m of migrations) {
    console.log(`  - hash: ${m.hash?.slice(0,8)}..., created: ${m.created_at}`);
  }

  // Register migration 0002 (already applied manually) if not tracked
  const m0002Path = resolve(__dirname, "../migrations/0002_investment_fields.sql");
  const m0002Sql = readFileSync(m0002Path, "utf-8");
  const m0002Hash = crypto.createHash("sha256").update(m0002Sql).digest("hex");

  const existing0002 = migrations.find((m: { hash: string }) => m.hash === m0002Hash);
  if (!existing0002) {
    console.log("\nRegistering migration 0002 (already applied manually)...");
    await sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (${m0002Hash}, ${1773879700000})`;
    console.log("✓ Registered 0002");
  } else {
    console.log("\n0002 already tracked.");
  }

  // Apply migration 0003
  const m0003Path = resolve(__dirname, "../migrations/0003_liabilities_scenarios.sql");
  const m0003Sql = readFileSync(m0003Path, "utf-8");
  const m0003Hash = crypto.createHash("sha256").update(m0003Sql).digest("hex");

  const existing0003 = migrations.find((m: { hash: string }) => m.hash === m0003Hash);
  if (!existing0003) {
    console.log("\nApplying migration 0003...");
    // Split by statement-breakpoint and execute each statement
    const statements = m0003Sql.split("--> statement-breakpoint").map(s => s.trim()).filter(Boolean);
    for (const stmt of statements) {
      console.log(`  executing: ${stmt.slice(0, 60)}...`);
      await sql.unsafe(stmt);
    }
    // Register in tracker
    await sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (${m0003Hash}, ${1773879800000})`;
    console.log("✓ Applied and registered 0003");
  } else {
    console.log("\n0003 already applied.");
  }

  // Verify
  const scenarios = await sql`SELECT table_name FROM information_schema.tables WHERE table_name = 'scenarios'`;
  console.log("\nscenarios table:", scenarios.length > 0 ? "EXISTS" : "NOT FOUND");

  const debtCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'debts' AND column_name IN ('escrow_amount', 'remaining_months')`;
  console.log("debt new columns:", debtCols.map((c: { column_name: string }) => c.column_name).join(", ") || "NOT FOUND");

  await sql.end();
}

run().catch((e) => { console.error(e); process.exit(1); });

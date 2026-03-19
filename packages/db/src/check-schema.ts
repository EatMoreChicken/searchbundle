import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../../../.env") });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

async function run() {
  const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'accounts'
    ORDER BY ordinal_position
  `;
  console.log("columns:", cols.map((c: { column_name: string }) => c.column_name).join(", "));

  const enums = await sql`
    SELECT e.enumlabel FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'account_type'
  `;
  console.log("account_type:", enums.map((e: { enumlabel: string }) => e.enumlabel).join(", "));

  const freqEnum = await sql`
    SELECT EXISTS(
      SELECT 1 FROM pg_type WHERE typname = 'contribution_frequency'
    ) AS exists
  `;
  console.log("contribution_frequency enum exists:", freqEnum[0].exists);

  await sql.end();
}

run().catch(console.error);

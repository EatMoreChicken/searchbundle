import { resolve } from "path";
import { config } from "dotenv";

config({ path: resolve(__dirname, "../../../.env") });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { users } from "./schema.js";

const FIXTURE_USER_ID = "00000000-0000-0000-0000-000000000001";

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const client = postgres(connectionString);
  const db = drizzle(client);

  await db
    .insert(users)
    .values({
      id: FIXTURE_USER_ID,
      email: "dev@searchbundle.io",
      name: "Dev User",
    })
    .onConflictDoNothing();

  console.log(`Fixture user seeded: ${FIXTURE_USER_ID}`);
  await client.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

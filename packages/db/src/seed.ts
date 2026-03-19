import { resolve } from "path";
import { config } from "dotenv";

config({ path: resolve(__dirname, "../../../.env") });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import bcrypt from "bcryptjs";
import { users } from "./schema";

const FIXTURE_USER_ID = "00000000-0000-0000-0000-000000000001";

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const client = postgres(connectionString);
  const db = drizzle(client);

  const passwordHash = await bcrypt.hash("password123", 12);

  await db
    .insert(users)
    .values({
      id: FIXTURE_USER_ID,
      email: "dev@searchbundle.io",
      name: "Dev User",
      passwordHash,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: { passwordHash },
    });

  console.log(`Fixture user seeded: ${FIXTURE_USER_ID} (password: password123)`);
  await client.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

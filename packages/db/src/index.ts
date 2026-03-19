import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

type DbType = ReturnType<typeof drizzle<typeof schema>>;

let _db: DbType | null = null;

export function getDb(): DbType {
  if (!_db) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set.");
    }
    const client = postgres(connectionString);
    _db = drizzle(client, { schema });
  }
  return _db;
}

export * from "./schema";

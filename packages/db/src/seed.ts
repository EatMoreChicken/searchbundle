import { resolve } from "path";
import { config } from "dotenv";

config({ path: resolve(__dirname, "../../../.env") });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { users, households, householdMembers, accounts, debts, netWorthCategories, netWorthEntries } from "./schema";

const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";
const PARTNER_USER_ID = "00000000-0000-0000-0000-000000000002";
const FRIEND_USER_ID = "00000000-0000-0000-0000-000000000003";
const HOUSEHOLD_ID = "00000000-0000-0000-0001-000000000001";
const SECOND_HOUSEHOLD_ID = "00000000-0000-0000-0001-000000000002";

const ACCT_SAVINGS_ID = "00000000-0000-0001-0000-000000000001";

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const client = postgres(connectionString);
  const db = drizzle(client);

  // Clean up existing seeded data so re-runs don't leave duplicates.
  // net_worth_entries cascade-delete with categories; accounts/debts cascade with household.
  await db.delete(accounts).where(inArray(accounts.householdId, [HOUSEHOLD_ID, SECOND_HOUSEHOLD_ID]));
  await db.delete(debts).where(inArray(debts.householdId, [HOUSEHOLD_ID, SECOND_HOUSEHOLD_ID]));
  await db.delete(netWorthCategories).where(inArray(netWorthCategories.householdId, [HOUSEHOLD_ID, SECOND_HOUSEHOLD_ID]));

  const passwordHash = await bcrypt.hash("password123", 12);

  // Dev user
  await db
    .insert(users)
    .values({
      id: DEV_USER_ID,
      email: "dev@searchbundle.io",
      name: "Dev User",
      passwordHash,
      activeHouseholdId: HOUSEHOLD_ID,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: { passwordHash, activeHouseholdId: HOUSEHOLD_ID },
    });

  // Partner user
  await db
    .insert(users)
    .values({
      id: PARTNER_USER_ID,
      email: "partner@searchbundle.io",
      name: "Partner User",
      passwordHash,
      activeHouseholdId: HOUSEHOLD_ID,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: { passwordHash, activeHouseholdId: HOUSEHOLD_ID },
    });

  // Friend user (owns the second household)
  await db
    .insert(users)
    .values({
      id: FRIEND_USER_ID,
      email: "friend@searchbundle.io",
      name: "Friend User",
      passwordHash,
      activeHouseholdId: SECOND_HOUSEHOLD_ID,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: { passwordHash, activeHouseholdId: SECOND_HOUSEHOLD_ID },
    });

  // Household
  await db
    .insert(households)
    .values({
      id: HOUSEHOLD_ID,
      name: "Dev Household",
      financialGoalNote: "Retire by 55 with $2M invested",
      createdBy: DEV_USER_ID,
    })
    .onConflictDoUpdate({
      target: households.id,
      set: { name: "Dev Household", financialGoalNote: "Retire by 55 with $2M invested" },
    });

  // Second household (owned by friend)
  await db
    .insert(households)
    .values({
      id: SECOND_HOUSEHOLD_ID,
      name: "Friend's Household",
      financialGoalNote: "Save for a vacation home by 2030",
      createdBy: FRIEND_USER_ID,
    })
    .onConflictDoUpdate({
      target: households.id,
      set: { name: "Friend's Household", financialGoalNote: "Save for a vacation home by 2030" },
    });

  // Memberships
  await db
    .insert(householdMembers)
    .values([
      { householdId: HOUSEHOLD_ID, userId: DEV_USER_ID, role: "owner" as const },
      { householdId: HOUSEHOLD_ID, userId: PARTNER_USER_ID, role: "member" as const },
      { householdId: SECOND_HOUSEHOLD_ID, userId: FRIEND_USER_ID, role: "owner" as const },
      { householdId: SECOND_HOUSEHOLD_ID, userId: DEV_USER_ID, role: "member" as const },
    ])
    .onConflictDoNothing();

  // Single example asset — Joint Savings
  await db
    .insert(accounts)
    .values({
      id: ACCT_SAVINGS_ID,
      householdId: HOUSEHOLD_ID,
      ownerId: null,
      name: "Joint Savings",
      type: "savings" as const,
      balance: "25000.00",
      currency: "USD",
    })
    .onConflictDoNothing();

  console.log("Seed complete:");
  console.log(`  Dev user:     ${DEV_USER_ID} (dev@searchbundle.io / password123) — owner of Dev Household, member of Friend's Household`);
  console.log(`  Partner user: ${PARTNER_USER_ID} (partner@searchbundle.io / password123) — member of Dev Household`);
  console.log(`  Friend user:  ${FRIEND_USER_ID} (friend@searchbundle.io / password123) — owner of Friend's Household`);
  console.log(`  Household 1: ${HOUSEHOLD_ID} (Dev Household)`);
  console.log(`  Household 2: ${SECOND_HOUSEHOLD_ID} (Friend's Household)`);
  console.log(`  Joint Savings account: ${ACCT_SAVINGS_ID}`);

  await client.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

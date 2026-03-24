/**
 * Development seed script: populates the database with realistic test data.
 * Uses fixed UUIDs throughout so it's safe to run multiple times (idempotent).
 *
 * Usage:
 *   npm run db:seed:dev
 */

import { resolve } from "path";
import { config } from "dotenv";

config({ path: resolve(__dirname, "../../../.env") });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import {
  users,
  households,
  householdMembers,
  accounts,
  balanceUpdates,
  accountNotes,
  accountContributions,
  netWorthCategories,
  netWorthEntries,
} from "./schema";

// ─── Fixed IDs ─────────────────────────────────────────────────────────────

const USER_ID       = "00000000-0000-0000-0000-000000000001";
const PARTNER_ID    = "00000000-0000-0000-0000-000000000002";
const HOUSEHOLD_ID  = "00000000-0000-0000-0001-000000000001";

const ACCOUNT_CHECKING = "00000000-0000-0000-0002-000000000001";
const ACCOUNT_EMERGENCY = "00000000-0000-0000-0002-000000000002";
const ACCOUNT_CASH     = "00000000-0000-0000-0002-000000000003";
const ACCOUNT_401K     = "00000000-0000-0000-0002-000000000004";

const CAT_CHECKING    = "00000000-0000-0000-0004-000000000001";
const CAT_EMERGENCY   = "00000000-0000-0000-0004-000000000002";
const CAT_CASH        = "00000000-0000-0000-0004-000000000003";
const CAT_401K        = "00000000-0000-0000-0004-000000000004";

// ─── Monthly Values for Net Worth Tracker ────────────────────────────────
// Keyed as [categoryId][year][month] = value. Months are 1-indexed.

const MONTHLY: Record<string, Record<number, Record<number, number>>> = {
  [CAT_CHECKING]: {
    2025: { 1: 7200, 2: 6800, 3: 8100, 4: 7500, 5: 9200, 6: 6900, 7: 8400, 8: 7100, 9: 8800, 10: 7400, 11: 9100, 12: 10500 },
    2026: { 1: 8500, 2: 7200, 3: 8500 },
  },
  [CAT_EMERGENCY]: {
    2025: { 1: 18000, 2: 18500, 3: 19000, 4: 19500, 5: 20000, 6: 20500, 7: 21000, 8: 21500, 9: 22000, 10: 22500, 11: 23000, 12: 23500 },
    2026: { 1: 24000, 2: 24500, 3: 24000 },
  },
  [CAT_CASH]: {
    2025: { 1: 3500, 2: 3200, 3: 3000, 4: 3100, 5: 2800, 6: 3400, 7: 3600, 8: 3300, 9: 3100, 10: 3000, 11: 3200, 12: 3500 },
    2026: { 1: 3200, 2: 3100, 3: 3200 },
  },
  [CAT_401K]: {
    2025: { 1: 45000, 2: 46800, 3: 48200, 4: 47500, 5: 50100, 6: 51800, 7: 53500, 8: 52900, 9: 55200, 10: 57000, 11: 59100, 12: 61500 },
    2026: { 1: 63200, 2: 65800, 3: 67500 },
  },
};

// Balance update history for demo accounts (simulates periodic balance checks)
// notesMap keys are "YYYY-M" mapping to a note string for that month's update
function generateBalanceHistory(
  accountId: string,
  monthlyValues: Record<number, Record<number, number>>,
  notesMap: Record<string, string> = {},
) {
  const updates: {
    accountId: string;
    previousBalance: string;
    newBalance: string;
    changeAmount: string;
    note: string | null;
    createdAt: Date;
  }[] = [];

  let prev: number | null = null;

  for (const [yearStr, months] of Object.entries(monthlyValues)) {
    const year = Number(yearStr);
    const sortedMonths = Object.entries(months)
      .map(([m, v]) => [Number(m), v] as [number, number])
      .sort((a, b) => a[0] - b[0]);

    for (const [month, value] of sortedMonths) {
      if (prev !== null) {
        updates.push({
          accountId,
          previousBalance: String(prev),
          newBalance: String(value),
          changeAmount: String(value - prev),
          note: notesMap[`${year}-${month}`] ?? null,
          createdAt: new Date(year, month - 1, 15, 10, 0, 0),
        });
      }
      prev = value;
    }
  }

  return updates;
}

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const client = postgres(connectionString);
  const db = drizzle(client);

  // ── 1. Upsert fixture users ─────────────────────────────────────────────

  const passwordHash = await bcrypt.hash("password123", 12);
  await db.insert(users).values({
    id: USER_ID,
    email: "dev@searchbundle.io",
    name: "Dev User",
    passwordHash,
  }).onConflictDoUpdate({
    target: users.id,
    set: { passwordHash },
  });
  await db.insert(users).values({
    id: PARTNER_ID,
    email: "partner@searchbundle.io",
    name: "Partner User",
    passwordHash,
  }).onConflictDoUpdate({
    target: users.id,
    set: { passwordHash },
  });
  console.log("✓ Users upserted");

  // ── 2. Upsert household ──────────────────────────────────────────────────

  await db.insert(households).values({
    id: HOUSEHOLD_ID,
    name: "Dev Household",
    createdBy: USER_ID,
  }).onConflictDoUpdate({
    target: households.id,
    set: { name: "Dev Household" },
  });

  await db.insert(householdMembers).values({
    householdId: HOUSEHOLD_ID,
    userId: USER_ID,
    role: "owner",
  }).onConflictDoNothing();

  await db.insert(householdMembers).values({
    householdId: HOUSEHOLD_ID,
    userId: PARTNER_ID,
    role: "member",
  }).onConflictDoNothing();

  // Set active household on both users
  await db.update(users).set({ activeHouseholdId: HOUSEHOLD_ID }).where(eq(users.id, USER_ID));
  await db.update(users).set({ activeHouseholdId: HOUSEHOLD_ID }).where(eq(users.id, PARTNER_ID));

  console.log("✓ Household upserted");

  // ── 3. Upsert assets (simple accounts only) ────────────────────────────

  const assetRows = [
    {
      id: ACCOUNT_CHECKING,
      householdId: HOUSEHOLD_ID,
      ownerId: USER_ID,
      name: "Chase Checking",
      type: "simple" as const,
      balance: "8500",
      currency: "USD",
      notes: "Primary checking account for day-to-day expenses.",
    },
    {
      id: ACCOUNT_EMERGENCY,
      householdId: HOUSEHOLD_ID,
      ownerId: USER_ID,
      name: "Emergency Fund",
      type: "simple" as const,
      balance: "24000",
      currency: "USD",
      notes: "6 months of expenses set aside for emergencies. Kept in a high-yield savings account.",
    },
    {
      id: ACCOUNT_CASH,
      householdId: HOUSEHOLD_ID,
      ownerId: USER_ID,
      name: "Cash Reserve",
      type: "simple" as const,
      balance: "3200",
      currency: "USD",
      notes: "Miscellaneous cash, gift cards, and petty cash.",
    },
    {
      id: ACCOUNT_401K,
      householdId: HOUSEHOLD_ID,
      ownerId: USER_ID,
      name: "Vanguard 401(k)",
      type: "investment" as const,
      balance: "67500",
      currency: "USD",
      notes: "Company 401(k) through Vanguard. Target date fund 2055.",
      returnRate: "7",
      returnRateVariance: "2",
      includeInflation: true,
    },
  ];

  for (const row of assetRows) {
    await db.insert(accounts).values(row).onConflictDoUpdate({
      target: accounts.id,
      set: {
        name: row.name,
        type: row.type,
        balance: row.balance,
        notes: row.notes ?? null,
        returnRate: "returnRate" in row ? (row as Record<string, unknown>).returnRate as string : null,
        returnRateVariance: "returnRateVariance" in row ? (row as Record<string, unknown>).returnRateVariance as string : null,
        includeInflation: "includeInflation" in row ? (row as Record<string, unknown>).includeInflation as boolean : false,
      },
    });
  }
  console.log("✓ Assets upserted");

  // ── 4. Seed balance update history ─────────────────────────────────────

  // Delete existing balance updates for seeded accounts to keep idempotent
  for (const acct of assetRows) {
    await db.delete(balanceUpdates).where(eq(balanceUpdates.accountId, acct.id));
  }

  const allUpdates = [
    ...generateBalanceHistory(ACCOUNT_CHECKING, MONTHLY[CAT_CHECKING], {
      "2025-5":  "Tax refund arrived, deposited straight in.",
      "2025-6":  "Annual HOA payment + vacation week spending.",
      "2025-11": "Q4 performance bonus deposited.",
      "2026-1":  "Paid off credit card balance in full.",
    }),
    ...generateBalanceHistory(ACCOUNT_EMERGENCY, MONTHLY[CAT_EMERGENCY], {
      "2025-5":  "Hit $20K milestone - halfway to 6-month goal!",
      "2026-1":  "Officially reached the 6-month emergency fund goal.",
      "2026-3":  "Pulled $500 to cover unexpected car repair.",
    }),
    ...generateBalanceHistory(ACCOUNT_CASH, MONTHLY[CAT_CASH], {
      "2025-6":  "Sold old electronics + received birthday cash.",
    }),
    ...generateBalanceHistory(ACCOUNT_401K, MONTHLY[CAT_401K], {
      "2025-4":  "Market dip after tariff announcement, balance dropped.",
      "2025-7":  "Increased contribution rate from 6% to 8%.",
      "2025-12": "Year-end rebalance. Shifted 10% from bonds to equities.",
      "2026-2":  "Strong Q1 earnings. Portfolio up ~4% in February alone.",
    }),
  ];

  if (allUpdates.length > 0) {
    await db.insert(balanceUpdates).values(allUpdates);
  }
  console.log(`✓ Balance updates inserted (${allUpdates.length} rows)`);

  // ── 4b. Seed account notes ─────────────────────────────────────────────

  for (const acct of assetRows) {
    await db.delete(accountNotes).where(eq(accountNotes.accountId, acct.id));
  }

  const noteRows = [
    {
      accountId: ACCOUNT_CHECKING,
      householdId: HOUSEHOLD_ID,
      content: "Received $500 insurance rebate - deposited 8/20.",
      createdAt: new Date(2025, 7, 20, 14, 30, 0),
    },
    {
      accountId: ACCOUNT_CHECKING,
      householdId: HOUSEHOLD_ID,
      content: "Reminder: move excess above $8K to high-yield savings.",
      createdAt: new Date(2025, 10, 20, 9, 0, 0),
    },
    {
      accountId: ACCOUNT_CHECKING,
      householdId: HOUSEHOLD_ID,
      content: "Switched direct deposit to this account starting February.",
      createdAt: new Date(2026, 1, 1, 8, 0, 0),
    },
    {
      accountId: ACCOUNT_EMERGENCY,
      householdId: HOUSEHOLD_ID,
      content: "Target range: keep between $22K and $26K. Replenish after any draw.",
      createdAt: new Date(2025, 8, 10, 12, 0, 0),
    },
    {
      accountId: ACCOUNT_CASH,
      householdId: HOUSEHOLD_ID,
      content: "Includes ~$200 in gift cards. Cash in wallet: $120.",
      createdAt: new Date(2025, 11, 28, 18, 0, 0),
    },
    {
      accountId: ACCOUNT_401K,
      householdId: HOUSEHOLD_ID,
      content: "Check beneficiary designations annually.",
      createdAt: new Date(2025, 6, 1, 9, 0, 0),
    },
  ];

  await db.insert(accountNotes).values(noteRows);
  console.log(`✓ Account notes inserted (${noteRows.length} rows)`);

  // ── 4c. Seed planned contributions ─────────────────────────────────────

  for (const acct of assetRows) {
    await db.delete(accountContributions).where(eq(accountContributions.accountId, acct.id));
  }

  const contributionRows = [
    {
      accountId: ACCOUNT_EMERGENCY,
      label: "Monthly savings transfer",
      amount: "500",
      frequency: "monthly" as const,
    },
    {
      accountId: ACCOUNT_401K,
      label: "Paycheck contribution (8%)",
      amount: "600",
      frequency: "biweekly" as const,
    },
    {
      accountId: ACCOUNT_401K,
      label: "Employer match (4%)",
      amount: "300",
      frequency: "biweekly" as const,
    },
  ];

  await db.insert(accountContributions).values(contributionRows);
  console.log(`✓ Planned contributions inserted (${contributionRows.length} rows)`);

  // ── 5. Upsert net worth categories ────────────────────────────────────

  const categoryRows = [
    { id: CAT_CHECKING, householdId: HOUSEHOLD_ID, name: "Checking Account", type: "asset" as const, sortOrder: 0 },
    { id: CAT_EMERGENCY, householdId: HOUSEHOLD_ID, name: "Emergency Fund", type: "asset" as const, sortOrder: 1 },
    { id: CAT_CASH, householdId: HOUSEHOLD_ID, name: "Cash Reserve", type: "asset" as const, sortOrder: 2 },
    { id: CAT_401K, householdId: HOUSEHOLD_ID, name: "Vanguard 401(k)", type: "asset" as const, sortOrder: 3 },
  ];

  for (const row of categoryRows) {
    await db.insert(netWorthCategories).values(row).onConflictDoUpdate({
      target: netWorthCategories.id,
      set: { name: row.name, sortOrder: row.sortOrder },
    });
  }
  console.log("✓ Net worth categories upserted");

  // ── 6. Upsert net worth entries ───────────────────────────────────────

  const categoryIds = categoryRows.map((c) => c.id);
  for (const catId of categoryIds) {
    await db.delete(netWorthEntries).where(eq(netWorthEntries.categoryId, catId));
  }

  const entryRows: { categoryId: string; year: number; month: number; value: string }[] = [];

  for (const [catId, yearData] of Object.entries(MONTHLY)) {
    for (const [yearStr, monthData] of Object.entries(yearData)) {
      const year = Number(yearStr);
      for (const [monthStr, value] of Object.entries(monthData)) {
        const month = Number(monthStr);
        entryRows.push({ categoryId: catId, year, month, value: String(value) });
      }
    }
  }

  await db.insert(netWorthEntries).values(entryRows);
  console.log(`✓ Net worth entries inserted (${entryRows.length} rows)`);

  await client.end();
  console.log("\nDev seed complete. Sign in with dev@searchbundle.io / password123 (or partner@searchbundle.io / password123)");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

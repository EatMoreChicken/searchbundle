/**
 * Quick development seed: populates the database with minimal data including
 * completed onboarding so the developer doesn't have to go through the wizard.
 *
 * Includes: users, household, retirement target, 1 simple account, 1 investment account.
 *
 * Usage:
 *   npm run db:seed:quick
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
  accountContributions,
  retirementTargets,
} from "./schema";

const USER_ID      = "00000000-0000-0000-0000-000000000001";
const PARTNER_ID   = "00000000-0000-0000-0000-000000000002";
const HOUSEHOLD_ID = "00000000-0000-0000-0001-000000000001";

const ACCOUNT_CHECKING = "00000000-0000-0000-0002-000000000001";
const ACCOUNT_401K     = "00000000-0000-0000-0002-000000000004";
const TARGET_ID        = "00000000-0000-0000-0005-000000000001";

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const client = postgres(connectionString);
  const db = drizzle(client);

  const passwordHash = await bcrypt.hash("password123", 12);

  // ── 1. Users ──────────────────────────────────────────────────────────

  await db.insert(users).values({
    id: USER_ID,
    email: "dev@searchbundle.io",
    name: "Dev User",
    passwordHash,
    dateOfBirth: "1993-06-15",
    retirementAge: 55,
    projectionEndAge: 100,
    activeHouseholdId: HOUSEHOLD_ID,
  }).onConflictDoUpdate({
    target: users.id,
    set: {
      passwordHash,
      dateOfBirth: "1993-06-15",
      retirementAge: 55,
      projectionEndAge: 100,
      activeHouseholdId: HOUSEHOLD_ID,
    },
  });

  await db.insert(users).values({
    id: PARTNER_ID,
    email: "partner@searchbundle.io",
    name: "Partner User",
    passwordHash,
    activeHouseholdId: HOUSEHOLD_ID,
  }).onConflictDoUpdate({
    target: users.id,
    set: { passwordHash, activeHouseholdId: HOUSEHOLD_ID },
  });

  console.log("✓ Users upserted (with onboarding profile)");

  // ── 2. Household ──────────────────────────────────────────────────────

  await db.insert(households).values({
    id: HOUSEHOLD_ID,
    name: "Dev Household",
    financialGoalNote: "Retire by 55 with $2M invested",
    createdBy: USER_ID,
  }).onConflictDoUpdate({
    target: households.id,
    set: { name: "Dev Household", financialGoalNote: "Retire by 55 with $2M invested" },
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

  console.log("✓ Household upserted");

  // ── 3. Retirement target (bypasses onboarding) ────────────────────────

  await db.insert(retirementTargets).values({
    id: TARGET_ID,
    householdId: HOUSEHOLD_ID,
    mode: "income_replacement",
    targetAmount: "2000000",
    targetAge: 55,
    annualIncome: "80000",
    withdrawalRate: "0.04",
    expectedReturn: "0.07",
    inflationRate: "0.03",
    includeInflation: false,
    savingsStrategy: "traditional",
  }).onConflictDoUpdate({
    target: retirementTargets.id,
    set: {
      mode: "income_replacement",
      targetAmount: "2000000",
      targetAge: 55,
      annualIncome: "80000",
      savingsStrategy: "traditional",
    },
  });

  console.log("✓ Retirement target upserted (onboarding complete)");

  // ── 4. Accounts ───────────────────────────────────────────────────────

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
  console.log("✓ Assets upserted (1 simple + 1 investment)");

  // ── 5. Balance history (light) ────────────────────────────────────────

  for (const acct of assetRows) {
    await db.delete(balanceUpdates).where(eq(balanceUpdates.accountId, acct.id));
  }

  const now = new Date();
  const updates = [
    {
      accountId: ACCOUNT_CHECKING,
      previousBalance: "7200",
      newBalance: "8100",
      changeAmount: "900",
      note: "Tax refund deposited.",
      createdAt: new Date(now.getFullYear(), now.getMonth() - 2, 15),
    },
    {
      accountId: ACCOUNT_CHECKING,
      previousBalance: "8100",
      newBalance: "8500",
      changeAmount: "400",
      note: null,
      createdAt: new Date(now.getFullYear(), now.getMonth() - 1, 15),
    },
    {
      accountId: ACCOUNT_401K,
      previousBalance: "61500",
      newBalance: "65800",
      changeAmount: "4300",
      note: "Strong Q1 earnings.",
      createdAt: new Date(now.getFullYear(), now.getMonth() - 2, 15),
    },
    {
      accountId: ACCOUNT_401K,
      previousBalance: "65800",
      newBalance: "67500",
      changeAmount: "1700",
      note: null,
      createdAt: new Date(now.getFullYear(), now.getMonth() - 1, 15),
    },
  ];

  await db.insert(balanceUpdates).values(updates);
  console.log(`✓ Balance updates inserted (${updates.length} rows)`);

  // ── 6. Planned contributions ──────────────────────────────────────────

  for (const acct of assetRows) {
    await db.delete(accountContributions).where(eq(accountContributions.accountId, acct.id));
  }

  await db.insert(accountContributions).values([
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
  ]);
  console.log("✓ Planned contributions inserted");

  await client.end();
  console.log("\nQuick seed complete. Onboarding is pre-filled.");
  console.log("Sign in: dev@searchbundle.io / password123");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

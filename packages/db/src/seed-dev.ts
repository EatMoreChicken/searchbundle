/**
 * Development seed script — populates the database with realistic test data.
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
  accounts,
  debts,
  netWorthCategories,
  netWorthEntries,
} from "./schema";

// ─── Fixed IDs ─────────────────────────────────────────────────────────────

const USER_ID = "00000000-0000-0000-0000-000000000001";

const ACCOUNT_401K    = "00000000-0000-0000-0002-000000000001";
const ACCOUNT_IRA     = "00000000-0000-0000-0002-000000000002";
const ACCOUNT_CHECKING = "00000000-0000-0000-0002-000000000003";
const ACCOUNT_SAVINGS = "00000000-0000-0000-0002-000000000004";
const ACCOUNT_HSA     = "00000000-0000-0000-0002-000000000005";
const ACCOUNT_HOME    = "00000000-0000-0000-0002-000000000006";

const DEBT_MORTGAGE   = "00000000-0000-0000-0003-000000000001";
const DEBT_CAR        = "00000000-0000-0000-0003-000000000002";
const DEBT_STUDENT    = "00000000-0000-0000-0003-000000000003";

const CAT_401K        = "00000000-0000-0000-0004-000000000001";
const CAT_IRA         = "00000000-0000-0000-0004-000000000002";
const CAT_CHECKING    = "00000000-0000-0000-0004-000000000003";
const CAT_SAVINGS     = "00000000-0000-0000-0004-000000000004";
const CAT_HSA         = "00000000-0000-0000-0004-000000000005";
const CAT_HOME        = "00000000-0000-0000-0004-000000000006";
const CAT_MORTGAGE    = "00000000-0000-0000-0004-000000000007";
const CAT_CAR         = "00000000-0000-0000-0004-000000000008";
const CAT_STUDENT     = "00000000-0000-0000-0004-000000000009";

// ─── Monthly Values ─────────────────────────────────────────────────────────
// Keyed as [year][month] = value. Months are 1-indexed.

const MONTHLY: Record<string, Record<number, Record<number, number>>> = {
  [CAT_401K]: {
    2025: { 1: 72000, 2: 72900, 3: 73800, 4: 74900, 5: 75600, 6: 76400, 7: 77200, 8: 77900, 9: 78700, 10: 79500, 11: 80800, 12: 82100 },
    2026: { 1: 83100, 2: 84100, 3: 85000 },
  },
  [CAT_IRA]: {
    2025: { 1: 24000, 2: 24300, 3: 24600, 4: 25000, 5: 25400, 6: 25900, 7: 26300, 8: 26800, 9: 27200, 10: 27700, 11: 28300, 12: 29100 },
    2026: { 1: 29800, 2: 31000, 3: 32000 },
  },
  [CAT_CHECKING]: {
    2025: { 1: 7200, 2: 6800, 3: 8100, 4: 7500, 5: 9200, 6: 6900, 7: 8400, 8: 7100, 9: 8800, 10: 7400, 11: 9100, 12: 10500 },
    2026: { 1: 8500, 2: 7200, 3: 8500 },
  },
  [CAT_SAVINGS]: {
    2025: { 1: 18000, 2: 18500, 3: 19000, 4: 19500, 5: 20000, 6: 20500, 7: 21000, 8: 21500, 9: 22000, 10: 22500, 11: 23000, 12: 23500 },
    2026: { 1: 24000, 2: 24500, 3: 24000 },
  },
  [CAT_HSA]: {
    2025: { 1: 4200, 2: 4400, 3: 4600, 4: 4800, 5: 5000, 6: 5200, 7: 5400, 8: 5600, 9: 5800, 10: 6000, 11: 6200, 12: 6400 },
    2026: { 1: 6500, 2: 6800, 3: 6200 },
  },
  [CAT_HOME]: {
    2025: { 1: 365000, 2: 366000, 3: 367500, 4: 369000, 5: 370000, 6: 371500, 7: 373000, 8: 375000, 9: 377000, 10: 379000, 11: 381000, 12: 383000 },
    2026: { 1: 383000, 2: 384000, 3: 385000 },
  },
  [CAT_MORTGAGE]: {
    2025: { 1: 330500, 2: 329700, 3: 328900, 4: 328100, 5: 327300, 6: 326400, 7: 325500, 8: 324600, 9: 323600, 10: 322600, 11: 321600, 12: 320500 },
    2026: { 1: 319400, 2: 318300, 3: 317200 },
  },
  [CAT_CAR]: {
    2025: { 1: 19000, 2: 18675, 3: 18348, 4: 18019, 5: 17688, 6: 17355, 7: 17020, 8: 16683, 9: 16343, 10: 16001, 11: 15657, 12: 15311 },
    2026: { 1: 14963, 2: 14638, 3: 14500 },
  },
  [CAT_STUDENT]: {
    2025: { 1: 35000, 2: 34720, 3: 34439, 4: 34157, 5: 33874, 6: 33590, 7: 33303, 8: 33015, 9: 32726, 10: 32435, 11: 32143, 12: 31849 },
    2026: { 1: 31554, 2: 31257, 3: 28000 },
  },
};

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const client = postgres(connectionString);
  const db = drizzle(client);

  // ── 1. Upsert fixture user ──────────────────────────────────────────────

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
  console.log("✓ User upserted");

  // ── 2. Upsert assets ───────────────────────────────────────────────────

  const assetRows = [
    {
      id: ACCOUNT_401K,
      userId: USER_ID,
      name: "Fidelity 401(k)",
      type: "investment" as const,
      balance: "85000",
      currency: "USD",
      notes: "Employer match up to 4%. Invested in FXAIX (S&P 500 index).",
      contributionAmount: "500",
      contributionFrequency: "monthly" as const,
      returnRate: "0.0700",
      returnRateVariance: "0.0200",
      includeInflation: true,
    },
    {
      id: ACCOUNT_IRA,
      userId: USER_ID,
      name: "Vanguard Roth IRA",
      type: "investment" as const,
      balance: "32000",
      currency: "USD",
      notes: "Max contribution goal: $7,000/year. Invested in VTSAX.",
      contributionAmount: "583.33",
      contributionFrequency: "monthly" as const,
      returnRate: "0.0700",
      returnRateVariance: "0.0200",
      includeInflation: true,
    },
    {
      id: ACCOUNT_CHECKING,
      userId: USER_ID,
      name: "Chase Checking",
      type: "savings" as const,
      balance: "8500",
      currency: "USD",
      notes: "Primary checking account for day-to-day expenses.",
    },
    {
      id: ACCOUNT_SAVINGS,
      userId: USER_ID,
      name: "Ally High-Yield Savings",
      type: "savings" as const,
      balance: "24000",
      currency: "USD",
      notes: "Emergency fund (6 months of expenses). APY: ~4.5%.",
      contributionAmount: "500",
      contributionFrequency: "monthly" as const,
      returnRate: "0.0450",
    },
    {
      id: ACCOUNT_HSA,
      userId: USER_ID,
      name: "HealthEquity HSA",
      type: "hsa" as const,
      balance: "6200",
      currency: "USD",
      notes: "Invested in low-cost index funds after $2k cash minimum. Triple tax advantage.",
      contributionAmount: "250",
      contributionFrequency: "monthly" as const,
      returnRate: "0.0500",
    },
    {
      id: ACCOUNT_HOME,
      userId: USER_ID,
      name: "Primary Residence",
      type: "property" as const,
      balance: "385000",
      currency: "USD",
      notes: "Zillow estimate ~$385k. Purchased in 2019 for $310,000.",
    },
  ];

  for (const row of assetRows) {
    await db.insert(accounts).values(row).onConflictDoUpdate({
      target: accounts.id,
      set: {
        name: row.name,
        balance: row.balance,
        notes: row.notes ?? null,
        contributionAmount: row.contributionAmount ?? null,
        contributionFrequency: row.contributionFrequency ?? null,
        returnRate: row.returnRate ?? null,
        returnRateVariance: row.returnRateVariance ?? null,
        includeInflation: row.includeInflation ?? false,
      },
    });
  }
  console.log("✓ Assets upserted");

  // ── 3. Upsert liabilities ─────────────────────────────────────────────

  const debtRows = [
    {
      id: DEBT_MORTGAGE,
      userId: USER_ID,
      name: "Home Mortgage",
      type: "mortgage" as const,
      balance: "317200",
      originalBalance: "400000",
      interestRate: "0.0650",
      minimumPayment: "2100",
      escrowAmount: "450",
      remainingMonths: "300",
      notes: "30-year fixed at 6.5%. Refinanced in 2023.",
    },
    {
      id: DEBT_CAR,
      userId: USER_ID,
      name: "Toyota Camry Loan",
      type: "auto" as const,
      balance: "14500",
      originalBalance: "22000",
      interestRate: "0.0520",
      minimumPayment: "325",
      remainingMonths: "44",
      notes: "2022 Toyota Camry SE. Auto-pay set up.",
    },
    {
      id: DEBT_STUDENT,
      userId: USER_ID,
      name: "Federal Student Loans",
      type: "student_loan" as const,
      balance: "28000",
      originalBalance: "52000",
      interestRate: "0.0450",
      minimumPayment: "280",
      remainingMonths: "120",
      notes: "Consolidated federal loans on standard repayment plan.",
    },
  ];

  for (const row of debtRows) {
    await db.insert(debts).values(row).onConflictDoUpdate({
      target: debts.id,
      set: {
        name: row.name,
        balance: row.balance,
        interestRate: row.interestRate,
        minimumPayment: row.minimumPayment,
        remainingMonths: row.remainingMonths ?? null,
        escrowAmount: (row as { escrowAmount?: string }).escrowAmount ?? null,
        notes: row.notes ?? null,
      },
    });
  }
  console.log("✓ Liabilities upserted");

  // ── 4. Upsert net worth categories ────────────────────────────────────

  const categoryRows = [
    { id: CAT_401K,    userId: USER_ID, name: "401(k) — Fidelity",      type: "asset" as const,     sortOrder: 0 },
    { id: CAT_IRA,     userId: USER_ID, name: "Roth IRA — Vanguard",    type: "asset" as const,     sortOrder: 1 },
    { id: CAT_CHECKING,userId: USER_ID, name: "Checking Account",       type: "asset" as const,     sortOrder: 2 },
    { id: CAT_SAVINGS, userId: USER_ID, name: "High-Yield Savings",     type: "asset" as const,     sortOrder: 3 },
    { id: CAT_HSA,     userId: USER_ID, name: "HSA",                    type: "asset" as const,     sortOrder: 4 },
    { id: CAT_HOME,    userId: USER_ID, name: "Home Value",             type: "asset" as const,     sortOrder: 5 },
    { id: CAT_MORTGAGE,userId: USER_ID, name: "Mortgage",               type: "liability" as const, sortOrder: 0 },
    { id: CAT_CAR,     userId: USER_ID, name: "Car Loan",               type: "liability" as const, sortOrder: 1 },
    { id: CAT_STUDENT, userId: USER_ID, name: "Student Loans",          type: "liability" as const, sortOrder: 2 },
  ];

  for (const row of categoryRows) {
    await db.insert(netWorthCategories).values(row).onConflictDoUpdate({
      target: netWorthCategories.id,
      set: { name: row.name, sortOrder: row.sortOrder },
    });
  }
  console.log("✓ Net worth categories upserted");

  // ── 5. Upsert net worth entries ───────────────────────────────────────
  // Delete + re-insert for seeded categories to keep the script simple.

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
  console.log("\nDev seed complete. Sign in with dev@searchbundle.io / password123");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

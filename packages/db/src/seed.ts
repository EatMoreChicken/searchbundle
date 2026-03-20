import { resolve } from "path";
import { config } from "dotenv";

config({ path: resolve(__dirname, "../../../.env") });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import bcrypt from "bcryptjs";
import { users, households, householdMembers, accounts, debts, netWorthCategories, netWorthEntries } from "./schema";

const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";
const PARTNER_USER_ID = "00000000-0000-0000-0000-000000000002";
const HOUSEHOLD_ID = "00000000-0000-0000-0000-000000000010";

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const client = postgres(connectionString);
  const db = drizzle(client);

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

  // Memberships
  await db
    .insert(householdMembers)
    .values([
      { householdId: HOUSEHOLD_ID, userId: DEV_USER_ID, role: "owner" as const },
      { householdId: HOUSEHOLD_ID, userId: PARTNER_USER_ID, role: "member" as const },
    ])
    .onConflictDoNothing();

  // Sample assets (household-scoped)
  const sampleAccounts = [
    { householdId: HOUSEHOLD_ID, ownerId: null, name: "Joint Savings", type: "savings" as const, balance: "25000.00", currency: "USD" },
    { householdId: HOUSEHOLD_ID, ownerId: DEV_USER_ID, name: "401(k)", type: "investment" as const, balance: "185000.00", currency: "USD", contributionAmount: "1500.00", contributionFrequency: "monthly" as const, returnRate: "0.0700", includeInflation: true },
    { householdId: HOUSEHOLD_ID, ownerId: PARTNER_USER_ID, name: "Roth IRA", type: "investment" as const, balance: "42000.00", currency: "USD", contributionAmount: "500.00", contributionFrequency: "monthly" as const, returnRate: "0.0800" },
    { householdId: HOUSEHOLD_ID, ownerId: null, name: "HSA", type: "hsa" as const, balance: "8500.00", currency: "USD" },
    { householdId: HOUSEHOLD_ID, ownerId: null, name: "Primary Residence", type: "property" as const, balance: "420000.00", currency: "USD" },
  ];

  for (const acct of sampleAccounts) {
    await db.insert(accounts).values(acct).onConflictDoNothing();
  }

  // Sample debts (household-scoped)
  const sampleDebts = [
    { householdId: HOUSEHOLD_ID, ownerId: null, name: "Mortgage", type: "mortgage" as const, balance: "310000.00", originalBalance: "350000.00", interestRate: "0.0625", minimumPayment: "2150.00", escrowAmount: "450.00", remainingMonths: "312" },
    { householdId: HOUSEHOLD_ID, ownerId: DEV_USER_ID, name: "Student Loans", type: "student_loan" as const, balance: "18000.00", originalBalance: "45000.00", interestRate: "0.0450", minimumPayment: "350.00", remainingMonths: "60" },
    { householdId: HOUSEHOLD_ID, ownerId: PARTNER_USER_ID, name: "Auto Loan", type: "auto" as const, balance: "12500.00", originalBalance: "28000.00", interestRate: "0.0390", minimumPayment: "425.00", remainingMonths: "32" },
  ];

  for (const debt of sampleDebts) {
    await db.insert(debts).values(debt).onConflictDoNothing();
  }

  // Sample net worth categories
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const categoryData = [
    { householdId: HOUSEHOLD_ID, name: "Savings", type: "asset" as const, sortOrder: 0 },
    { householdId: HOUSEHOLD_ID, name: "Investments", type: "asset" as const, sortOrder: 1 },
    { householdId: HOUSEHOLD_ID, name: "Property", type: "asset" as const, sortOrder: 2 },
    { householdId: HOUSEHOLD_ID, name: "Mortgage", type: "liability" as const, sortOrder: 0 },
    { householdId: HOUSEHOLD_ID, name: "Student Loans", type: "liability" as const, sortOrder: 1 },
  ];

  for (const cat of categoryData) {
    const [inserted] = await db
      .insert(netWorthCategories)
      .values(cat)
      .returning({ id: netWorthCategories.id });

    if (inserted && currentMonth >= 1) {
      const entries = [];
      for (let m = 1; m <= Math.min(currentMonth, 12); m++) {
        const baseValues: Record<string, number> = {
          "Savings": 23000, "Investments": 210000, "Property": 420000,
          "Mortgage": 315000, "Student Loans": 20000,
        };
        const base = baseValues[cat.name] ?? 10000;
        const monthlyChange = cat.type === "liability" ? -500 : 1500;
        entries.push({
          categoryId: inserted.id,
          year: currentYear,
          month: m,
          value: String(base + monthlyChange * (m - 1)),
        });
      }
      await db.insert(netWorthEntries).values(entries).onConflictDoNothing();
    }
  }

  console.log("Seed complete:");
  console.log(`  Dev user: ${DEV_USER_ID} (dev@searchbundle.io / password123)`);
  console.log(`  Partner user: ${PARTNER_USER_ID} (partner@searchbundle.io / password123)`);
  console.log(`  Household: ${HOUSEHOLD_ID} (Dev Household)`);
  console.log("  Sample assets, debts, and net worth data seeded.");

  await client.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

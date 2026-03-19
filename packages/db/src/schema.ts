import { pgTable, uuid, text, numeric, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";

// --- Enums ---

export const accountTypeEnum = pgEnum("account_type", [
  "investment",
  "savings",
  "hsa",
  "property",
  "other",
]);

export const contributionFrequencyEnum = pgEnum("contribution_frequency", [
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "yearly",
]);

export const debtTypeEnum = pgEnum("debt_type", [
  "mortgage",
  "student_loan",
  "auto",
  "credit_card",
  "other",
]);

// --- Tables ---

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: accountTypeEnum("type").notNull(),
  balance: numeric("balance", { precision: 14, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("USD"),
  notes: text("notes"),
  // Investment-specific fields
  contributionAmount: numeric("contribution_amount", { precision: 14, scale: 2 }),
  contributionFrequency: contributionFrequencyEnum("contribution_frequency"),
  returnRate: numeric("return_rate", { precision: 6, scale: 4 }),
  returnRateVariance: numeric("return_rate_variance", { precision: 6, scale: 4 }).default("0"),
  includeInflation: boolean("include_inflation").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const debts = pgTable("debts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: debtTypeEnum("type").notNull(),
  balance: numeric("balance", { precision: 14, scale: 2 }).notNull().default("0"),
  originalBalance: numeric("original_balance", { precision: 14, scale: 2 }).notNull(),
  interestRate: numeric("interest_rate", { precision: 6, scale: 4 }).notNull(),
  minimumPayment: numeric("minimum_payment", { precision: 10, scale: 2 }).notNull(),
  escrowAmount: numeric("escrow_amount", { precision: 10, scale: 2 }),
  remainingMonths: numeric("remaining_months", { precision: 5, scale: 0 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const scenarios = pgTable("scenarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  debtId: uuid("debt_id").references(() => debts.id, { onDelete: "cascade" }),
  accountId: uuid("account_id").references(() => accounts.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  extraMonthlyPayment: numeric("extra_monthly_payment", { precision: 10, scale: 2 }).default("0"),
  extraYearlyPayment: numeric("extra_yearly_payment", { precision: 10, scale: 2 }).default("0"),
  lumpSumPayment: numeric("lump_sum_payment", { precision: 14, scale: 2 }).default("0"),
  lumpSumMonth: numeric("lump_sum_month", { precision: 5, scale: 0 }).default("1"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const checkIns = pgTable("check_ins", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
  netWorthSnapshot: numeric("net_worth_snapshot", { precision: 14, scale: 2 }),
  notes: text("notes"),
});

export const balanceHistory = pgTable("balance_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id").references(() => accounts.id, { onDelete: "cascade" }),
  debtId: uuid("debt_id").references(() => debts.id, { onDelete: "cascade" }),
  checkInId: uuid("check_in_id").notNull().references(() => checkIns.id, { onDelete: "cascade" }),
  balance: numeric("balance", { precision: 14, scale: 2 }).notNull(),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
});

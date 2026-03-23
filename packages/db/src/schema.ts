import { pgTable, uuid, text, numeric, timestamp, boolean, integer, pgEnum, unique, date } from "drizzle-orm/pg-core";

// --- Enums ---

export const accountTypeEnum = pgEnum("account_type", [
  "investment",
  "savings",
  "hsa",
  "property",
  "other",
  "simple",
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

export const householdRoleEnum = pgEnum("household_role", ["owner", "admin", "member"]);

// --- Tables ---

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  dateOfBirth: date("date_of_birth"),
  timezone: text("timezone").notNull().default("America/Chicago"),
  preferredCurrency: text("preferred_currency").notNull().default("USD"),
  retirementAge: integer("retirement_age"),
  projectionEndAge: integer("projection_end_age").notNull().default(100),
  activeHouseholdId: uuid("active_household_id"),
  mustResetPassword: boolean("must_reset_password").notNull().default(false),
});

export const households = pgTable("households", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().default("My Household"),
  financialGoalNote: text("financial_goal_note"),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const householdMembers = pgTable("household_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: householdRoleEnum("role").notNull().default("member"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (table) => [
  unique("household_members_household_user").on(table.householdId, table.userId),
]);

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  type: accountTypeEnum("type").notNull(),
  balance: numeric("balance", { precision: 14, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("USD"),
  notes: text("notes"),
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
  householdId: uuid("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
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
  householdId: uuid("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
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
  householdId: uuid("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
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

// --- Balance Updates (manual value change log) ---

export const balanceUpdates = pgTable("balance_updates", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  previousBalance: numeric("previous_balance", { precision: 14, scale: 2 }).notNull(),
  newBalance: numeric("new_balance", { precision: 14, scale: 2 }).notNull(),
  changeAmount: numeric("change_amount", { precision: 14, scale: 2 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Net Worth Tracker ---

export const categoryTypeEnum = pgEnum("category_type", ["asset", "liability"]);

export const netWorthCategories = pgTable("net_worth_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: categoryTypeEnum("type").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const netWorthEntries = pgTable("net_worth_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id").notNull().references(() => netWorthCategories.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  value: numeric("value", { precision: 15, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("net_worth_entries_category_year_month").on(table.categoryId, table.year, table.month),
]);

// --- Financial Independence Target ---

export const targetModeEnum = pgEnum("target_mode", ["fixed", "income_replacement"]);

export const savingsStrategyEnum = pgEnum("savings_strategy", [
  "traditional",
  "front_loaded",
  "coast_fire",
  "barista_fire",
  "back_loaded",
]);

export const retirementTargets = pgTable("retirement_targets", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
  mode: targetModeEnum("mode").notNull().default("fixed"),
  targetAmount: numeric("target_amount", { precision: 15, scale: 2 }).notNull(),
  targetAge: integer("target_age").notNull(),
  annualIncome: numeric("annual_income", { precision: 15, scale: 2 }),
  withdrawalRate: numeric("withdrawal_rate", { precision: 5, scale: 4 }).default("0.04"),
  expectedReturn: numeric("expected_return", { precision: 5, scale: 4 }).default("0.07"),
  inflationRate: numeric("inflation_rate", { precision: 5, scale: 4 }).default("0.03"),
  includeInflation: boolean("include_inflation").default(false).notNull(),
  savingsStrategy: savingsStrategyEnum("savings_strategy").notNull().default("traditional"),
  strategyPhase1Monthly: numeric("strategy_phase1_monthly", { precision: 14, scale: 2 }),
  strategyPhase1Years: integer("strategy_phase1_years"),
  strategyPhase2Monthly: numeric("strategy_phase2_monthly", { precision: 14, scale: 2 }),
  strategyAnnualChangeRate: numeric("strategy_annual_change_rate", { precision: 5, scale: 4 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("retirement_targets_household").on(table.householdId),
]);

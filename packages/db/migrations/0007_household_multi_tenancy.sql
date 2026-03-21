-- Household multi-tenancy migration
-- This is a DESTRUCTIVE migration: drops all data tables and recreates them.
-- Run db:seed after to repopulate.

-- Drop tables in dependency order
DROP TABLE IF EXISTS "net_worth_entries" CASCADE;
DROP TABLE IF EXISTS "net_worth_categories" CASCADE;
DROP TABLE IF EXISTS "balance_history" CASCADE;
DROP TABLE IF EXISTS "check_ins" CASCADE;
DROP TABLE IF EXISTS "scenarios" CASCADE;
DROP TABLE IF EXISTS "debts" CASCADE;
DROP TABLE IF EXISTS "accounts" CASCADE;
DROP TABLE IF EXISTS "household_members" CASCADE;
DROP TABLE IF EXISTS "households" CASCADE;

-- Drop old enums if recreating
DROP TYPE IF EXISTS "household_role";
CREATE TYPE "household_role" AS ENUM ('owner', 'admin', 'member');

-- Modify users table: drop financialGoalNote, add activeHouseholdId + mustResetPassword
ALTER TABLE "users" DROP COLUMN IF EXISTS "financial_goal_note";
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "active_household_id" uuid;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "must_reset_password" boolean NOT NULL DEFAULT false;

-- Create households
CREATE TABLE "households" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL DEFAULT 'My Household',
  "financial_goal_note" text,
  "created_by" uuid NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp NOT NULL DEFAULT now()
);

-- Add FK for activeHouseholdId (after households table exists)
-- We don't add a hard FK here to avoid circular dependency issues during user creation

-- Create household_members
CREATE TABLE "household_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "household_id" uuid NOT NULL REFERENCES "households"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" "household_role" NOT NULL DEFAULT 'member',
  "joined_at" timestamp NOT NULL DEFAULT now(),
  UNIQUE("household_id", "user_id")
);

-- Recreate accounts with householdId instead of userId
CREATE TABLE "accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "household_id" uuid NOT NULL REFERENCES "households"("id") ON DELETE CASCADE,
  "owner_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "name" text NOT NULL,
  "type" "account_type" NOT NULL,
  "balance" numeric(14,2) NOT NULL DEFAULT '0',
  "currency" text NOT NULL DEFAULT 'USD',
  "notes" text,
  "contribution_amount" numeric(14,2),
  "contribution_frequency" "contribution_frequency",
  "return_rate" numeric(6,4),
  "return_rate_variance" numeric(6,4) DEFAULT '0',
  "include_inflation" boolean NOT NULL DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Recreate debts with householdId
CREATE TABLE "debts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "household_id" uuid NOT NULL REFERENCES "households"("id") ON DELETE CASCADE,
  "owner_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "name" text NOT NULL,
  "type" "debt_type" NOT NULL,
  "balance" numeric(14,2) NOT NULL DEFAULT '0',
  "original_balance" numeric(14,2) NOT NULL,
  "interest_rate" numeric(6,4) NOT NULL,
  "minimum_payment" numeric(10,2) NOT NULL,
  "escrow_amount" numeric(10,2),
  "remaining_months" numeric(5,0),
  "notes" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Recreate scenarios with householdId
CREATE TABLE "scenarios" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "household_id" uuid NOT NULL REFERENCES "households"("id") ON DELETE CASCADE,
  "debt_id" uuid REFERENCES "debts"("id") ON DELETE CASCADE,
  "account_id" uuid REFERENCES "accounts"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "extra_monthly_payment" numeric(10,2) DEFAULT '0',
  "extra_yearly_payment" numeric(10,2) DEFAULT '0',
  "lump_sum_payment" numeric(14,2) DEFAULT '0',
  "lump_sum_month" numeric(5,0) DEFAULT '1',
  "created_at" timestamp NOT NULL DEFAULT now()
);

-- Recreate check_ins with householdId (keep userId for who performed it)
CREATE TABLE "check_ins" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "household_id" uuid NOT NULL REFERENCES "households"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "completed_at" timestamp NOT NULL DEFAULT now(),
  "net_worth_snapshot" numeric(14,2),
  "notes" text
);

-- Recreate balance_history
CREATE TABLE "balance_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "account_id" uuid REFERENCES "accounts"("id") ON DELETE CASCADE,
  "debt_id" uuid REFERENCES "debts"("id") ON DELETE CASCADE,
  "check_in_id" uuid NOT NULL REFERENCES "check_ins"("id") ON DELETE CASCADE,
  "balance" numeric(14,2) NOT NULL,
  "recorded_at" timestamp NOT NULL DEFAULT now()
);

-- Recreate net_worth_categories with householdId
CREATE TABLE "net_worth_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "household_id" uuid NOT NULL REFERENCES "households"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "type" "category_type" NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Recreate net_worth_entries
CREATE TABLE "net_worth_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "category_id" uuid NOT NULL REFERENCES "net_worth_categories"("id") ON DELETE CASCADE,
  "year" integer NOT NULL,
  "month" integer NOT NULL,
  "value" numeric(15,2) NOT NULL DEFAULT '0',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  UNIQUE("category_id", "year", "month")
);

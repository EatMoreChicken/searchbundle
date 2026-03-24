-- Add new values to debt_type enum
ALTER TYPE "debt_type" ADD VALUE IF NOT EXISTS 'simple';--> statement-breakpoint
ALTER TYPE "debt_type" ADD VALUE IF NOT EXISTS 'loan';--> statement-breakpoint

-- Create interest_accrual_method enum
DO $$ BEGIN
  CREATE TYPE "interest_accrual_method" AS ENUM('monthly', 'daily', 'precomputed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- Add new columns to debts table
ALTER TABLE "debts" ALTER COLUMN "original_balance" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "debts" ALTER COLUMN "interest_rate" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "debts" ALTER COLUMN "minimum_payment" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "debts" ADD COLUMN IF NOT EXISTS "interest_accrual_method" "interest_accrual_method";--> statement-breakpoint
ALTER TABLE "debts" ADD COLUMN IF NOT EXISTS "home_value" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "debts" ADD COLUMN IF NOT EXISTS "pmi_monthly" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "debts" ADD COLUMN IF NOT EXISTS "property_tax_yearly" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "debts" ADD COLUMN IF NOT EXISTS "home_insurance_yearly" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "debts" ADD COLUMN IF NOT EXISTS "loan_start_date" date;--> statement-breakpoint
ALTER TABLE "debts" ADD COLUMN IF NOT EXISTS "loan_term_months" integer;--> statement-breakpoint
ALTER TABLE "debts" ADD COLUMN IF NOT EXISTS "vehicle_value" numeric(14, 2);--> statement-breakpoint

-- Create debt_balance_updates table
CREATE TABLE IF NOT EXISTS "debt_balance_updates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "debt_id" uuid NOT NULL,
  "previous_balance" numeric(14, 2) NOT NULL,
  "new_balance" numeric(14, 2) NOT NULL,
  "change_amount" numeric(14, 2) NOT NULL,
  "note" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "debt_balance_updates_debt_id_debts_id_fk" FOREIGN KEY ("debt_id") REFERENCES "debts"("id") ON DELETE CASCADE
);--> statement-breakpoint

-- Create debt_notes table
CREATE TABLE IF NOT EXISTS "debt_notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "debt_id" uuid NOT NULL,
  "household_id" uuid NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "debt_notes_debt_id_debts_id_fk" FOREIGN KEY ("debt_id") REFERENCES "debts"("id") ON DELETE CASCADE,
  CONSTRAINT "debt_notes_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE
);

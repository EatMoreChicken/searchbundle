-- Add hsa value to account_type enum
ALTER TYPE "account_type" ADD VALUE 'hsa';

-- Create contribution_frequency enum
CREATE TYPE "contribution_frequency" AS ENUM('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly');

-- Add investment-specific columns to accounts table
ALTER TABLE "accounts" ADD COLUMN "contribution_amount" numeric(14,2);
ALTER TABLE "accounts" ADD COLUMN "contribution_frequency" "contribution_frequency";
ALTER TABLE "accounts" ADD COLUMN "return_rate" numeric(6,4);
ALTER TABLE "accounts" ADD COLUMN "return_rate_variance" numeric(6,4) DEFAULT '0';
ALTER TABLE "accounts" ADD COLUMN "include_inflation" boolean DEFAULT false NOT NULL;

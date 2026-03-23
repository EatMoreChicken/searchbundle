-- Add 'simple' value to account_type enum
ALTER TYPE "account_type" ADD VALUE IF NOT EXISTS 'simple';

-- Balance updates table for tracking manual balance changes
CREATE TABLE IF NOT EXISTS "balance_updates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE CASCADE,
  "previous_balance" numeric(14, 2) NOT NULL,
  "new_balance" numeric(14, 2) NOT NULL,
  "change_amount" numeric(14, 2) NOT NULL,
  "note" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

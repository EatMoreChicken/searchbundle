CREATE TABLE IF NOT EXISTS "account_contributions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE CASCADE,
  "label" text NOT NULL,
  "amount" numeric(14, 2) NOT NULL,
  "frequency" contribution_frequency NOT NULL DEFAULT 'monthly',
  "created_at" timestamp DEFAULT now() NOT NULL
);

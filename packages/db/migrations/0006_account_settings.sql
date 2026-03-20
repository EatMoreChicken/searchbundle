ALTER TABLE "users" ADD COLUMN "date_of_birth" date;
ALTER TABLE "users" ADD COLUMN "timezone" text NOT NULL DEFAULT 'America/Chicago';
ALTER TABLE "users" ADD COLUMN "preferred_currency" text NOT NULL DEFAULT 'USD';
ALTER TABLE "users" ADD COLUMN "retirement_age" integer;
ALTER TABLE "users" ADD COLUMN "financial_goal_note" text;

CREATE TYPE "public"."contribution_frequency" AS ENUM('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly');--> statement-breakpoint
ALTER TYPE "public"."account_type" ADD VALUE 'hsa' BEFORE 'property';--> statement-breakpoint
CREATE TABLE "scenarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"debt_id" uuid,
	"account_id" uuid,
	"name" text NOT NULL,
	"extra_monthly_payment" numeric(10, 2) DEFAULT '0',
	"extra_yearly_payment" numeric(10, 2) DEFAULT '0',
	"lump_sum_payment" numeric(14, 2) DEFAULT '0',
	"lump_sum_month" numeric(5, 0) DEFAULT '1',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "contribution_amount" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "contribution_frequency" "contribution_frequency";--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "return_rate" numeric(6, 4);--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "return_rate_variance" numeric(6, 4) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "include_inflation" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "debts" ADD COLUMN "escrow_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "debts" ADD COLUMN "remaining_months" numeric(5, 0);--> statement-breakpoint
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_debt_id_debts_id_fk" FOREIGN KEY ("debt_id") REFERENCES "public"."debts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;